import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NgTemplateOutlet } from '@angular/common';
import { CollectionManager } from '../../services/collection-manager';
import {
  CasinoManager,
  ROULETTE_PAYOUT,
  RouletteColor,
  RouletteSpin,
  WHEEL_ORDER,
  pocketColor
} from '../../services/casino-manager';
import { Sound, SoundManager } from '../../services/sound-manager';
import { GameLoop } from '../../services/game-loop';
import { StoreManager } from '../../services/store-manager';
import { SettingsManager } from '../../services/settings-manager';

type Game = 'roulette' | 'crash';
/**
 * `reveal` : le joueur a encaissé, la courbe continue jusqu'au point de
 * rupture pour lui montrer ce qu'il a laissé. Sans ce temps-là, encaisser tôt
 * ou tard se ressemble et rien ne s'apprend d'une partie à l'autre.
 */
type CrashPhase = 'idle' | 'running' | 'reveal' | 'cashed' | 'busted';

/** Tours de roue parcourus avant l'arrêt : la case gagnante est dans le dernier. */
const STRIP_LAPS = 6;
const LANDING_LAP = 4;
/** Largeur d'une case du bandeau, en rem — à garder en phase avec le SCSS. */
const POCKET_REM = 3.5;
const SPIN_MS = 4200;

/** Cadre du graphique du crash, en unités SVG. */
const CHART = { width: 400, height: 220, pad: 14 };

/**
 * Accélération de la révélation, et sa durée maximale. Une partie peut sauter
 * à ×1000, soit trois quarts de minute de courbe : la vitesse s'ajuste pour
 * que le dévoilement tienne toujours dans ces quelques secondes.
 */
const REVEAL_SPEED = 4;
const REVEAL_MAX_SECONDS = 2.5;

/**
 * Crans entendus pendant que la roue tourne, et durée de la fête qui suit un
 * gain. Les crans se resserrent au début et s'espacent à la fin, comme le
 * bandeau qui ralentit : une cadence régulière sonnait comme un métronome et
 * ne disait rien du freinage.
 */
const TICKS = 24;
const CELEBRATION_MS = 1800;

/**
 * Casino : la roulette et le crash, où l'on mise ses gemmes.
 *
 * La roulette est un bandeau de cases qui défile puis ralentit sous un
 * repère ; le crash, une flèche qui grimpe tant qu'on n'a pas encaissé.
 *
 * L'animation du crash tourne **hors zone** et écrit directement dans le SVG :
 * passer par des signaux relancerait la détection de changements soixante
 * fois par seconde. Seuls les changements d'état (départ, encaissement,
 * rupture) rentrent dans Angular.
 */
@Component({
  selector: 'app-casino-page',
  standalone: true,
  imports: [TranslatePipe, NgTemplateOutlet],
  templateUrl: './casino-page.html',
  styleUrl: './casino-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CasinoPage implements OnInit, OnDestroy {

  readonly collection = inject(CollectionManager);
  readonly casino = inject(CasinoManager);
  private readonly soundManager = inject(SoundManager);
  private readonly router = inject(Router);
  private readonly gameLoop = inject(GameLoop);
  private readonly store = inject(StoreManager);
  private readonly settings = inject(SettingsManager);
  private readonly zone = inject(NgZone);

  readonly game = signal<Game>('roulette');
  readonly bet = signal(1);
  readonly betValid = computed(() => this.casino.canBet(this.bet()));

  readonly payouts = ROULETTE_PAYOUT;
  /** Rang des ampoules du panneau, qui sert de retard à leur animation. */
  readonly bulbs = Array.from({ length: 14 }, (_, index) => index);
  readonly chart = CHART;

  // --- Roulette -----------------------------------------------------------

  readonly colors: readonly RouletteColor[] = ['red', 'black', 'green'];
  readonly choice = signal<RouletteColor>('red');
  readonly spinning = signal(false);
  readonly lastSpin = signal<RouletteSpin | null>(null);

  /** Cases du bandeau : la roue répétée plusieurs fois, pour défiler longtemps. */
  readonly strip = Array.from({ length: STRIP_LAPS }, () => WHEEL_ORDER).flat();
  /** Case centrée sous le repère. */
  readonly stripIndex = signal(0);
  /** Animation de défilement active ; coupée pour replacer le bandeau. */
  readonly animated = signal(false);
  readonly stripShift = computed(() => `translateX(calc(-${(this.stripIndex() + 0.5) * POCKET_REM}rem))`);
  /**
   * Durée du tirage. En mode calme la transition du bandeau est coupée par la
   * feuille de style : le laisser à quatre secondes ferait patienter devant un
   * résultat déjà affiché. On abrège donc au lieu de faire semblant.
   */
  readonly spinMs = computed(() => (this.settings.calm() ? 350 : SPIN_MS));

  readonly colorOf = pocketColor;
  private spinTimer?: ReturnType<typeof setTimeout>;

  // --- Crash --------------------------------------------------------------

  /**
   * Gain qui vient de tomber, affiché en grand par-dessus le jeu et repris par
   * les ampoules du panneau. Sans cet instant-là, gagner et perdre se
   * ressemblaient : seule une ligne de texte changeait.
   */
  readonly celebration = signal<number | null>(null);
  private celebrationTimer?: ReturnType<typeof setTimeout>;

  readonly crashPhase = signal<CrashPhase>('idle');
  /** Multiplicateur final affiché une fois la partie close. */
  readonly crashResult = signal(1);
  readonly crashPayout = signal(0);
  /** Point de rupture, dévoilé à la fin même quand on a encaissé avant. */
  readonly crashPeak = signal(0);
  /** Encaissement automatique, 0 pour le désactiver. */
  readonly autoCashOut = signal(0);

  private readonly curve = viewChild<ElementRef<SVGPolylineElement>>('curve');
  private readonly arrow = viewChild<ElementRef<SVGPolygonElement>>('arrow');
  private readonly readout = viewChild<ElementRef<HTMLElement>>('readout');
  private readonly mark = viewChild<ElementRef<SVGCircleElement>>('mark');

  private frameId?: number;
  private crashStart = 0;
  /** Point de rupture de la partie en cours, retenu pour la révélation. */
  private roundCrashAt = 0;
  /** Vitesse d'écoulement du temps : 1 en partie, plus vite en révélation. */
  private timeScale = 1;
  /** Multiplicateur encaissé, repéré sur la courbe pendant la révélation. */
  private cashedMark = 0;
  /** Multiplicateur à l'image courante, lu par l'encaissement. */
  private liveMultiplier = 1;

  ngOnInit(): void {
    // Comme les autres écrans : arriver directement ici charge la partie.
    this.gameLoop.start();
    // Le casino s'ouvre dans l'arbre : l'adresse ne doit pas court-circuiter
    // l'achat, et la partie est chargée avant d'en juger.
    if (!this.store.casino()) this.router.navigate(['/game']);
  }

  ngOnDestroy(): void {
    // Quitter pendant un tirage ne doit rien coûter : la roulette est réglée,
    // le crash encaissé à la valeur atteinte.
    clearTimeout(this.spinTimer);
    clearTimeout(this.celebrationTimer);
    this.tickTimers.forEach(clearTimeout);
    this.casino.settleRoulette();
    if (this.crashPhase() === 'running') this.casino.cashOut(this.liveMultiplier);
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
  }

  select(game: Game): void {
    if (this.busy()) return;
    // Changer de jeu pendant la révélation la conclut : la laisser courir
    // ferait tourner une boucle d'animation sur un graphique démonté.
    if (this.crashPhase() === 'reveal') this.endCrash(this.roundCrashAt);
    this.soundManager.playFX(Sound.Plop);
    this.game.set(game);
  }

  /** Une partie en cours verrouille la mise et le choix du jeu. */
  readonly busy = computed(() => this.spinning() || this.crashPhase() === 'running');

  onBetInput(event: Event): void {
    const value = Math.floor((event.target as HTMLInputElement).valueAsNumber);
    this.bet.set(Number.isFinite(value) ? Math.max(0, value) : 0);
  }

  adjustBet(kind: 'half' | 'double' | 'max'): void {
    const gems = this.collection.gems();
    const current = this.bet();
    const next = kind === 'half' ? Math.floor(current / 2) : kind === 'double' ? current * 2 : gems;
    this.bet.set(Math.max(1, Math.min(gems, next)));
  }

  // --- Roulette -----------------------------------------------------------

  /** Fête un gain : le montant s'affiche en grand et le panneau s'allume. */
  private cheer(amount: number): void {
    this.celebration.set(amount);
    clearTimeout(this.celebrationTimer);
    this.celebrationTimer = setTimeout(() => this.celebration.set(null), CELEBRATION_MS);
  }

  private tickTimers: ReturnType<typeof setTimeout>[] = [];

  /**
   * Les crans de la roue. Ils suivent l'inverse de la courbe d'accélération du
   * bandeau : espacés en fin de course, serrés au début, donc on *entend* la
   * roue freiner avant de voir où elle s'arrête.
   */
  private scheduleTicks(): void {
    this.tickTimers.forEach(clearTimeout);
    this.tickTimers = [];
    this.zone.runOutsideAngular(() => {
      for (let i = 1; i <= TICKS; i++) {
        const progress = i / TICKS;
        const at = (1 - Math.pow(1 - progress, 1 / 3)) * this.spinMs();
        this.tickTimers.push(
          setTimeout(() => this.soundManager.playPitched(Sound.Plop, 1.9 - progress * 0.5), at)
        );
      }
    });
  }

  spin(): void {
    if (this.busy()) return;
    const result = this.casino.spinRoulette(this.bet(), this.choice());
    if (!result) return;
    this.soundManager.playFX(Sound.Plop);
    if (!this.settings.calm()) this.scheduleTicks();
    this.celebration.set(null);

    // Le bandeau est d'abord ramené, sans animation, à la même case dans le
    // premier tour : il peut ainsi repartir pour plusieurs tours complets.
    this.animated.set(false);
    this.stripIndex.set(this.stripIndex() % WHEEL_ORDER.length);
    this.spinning.set(true);
    this.lastSpin.set(null);

    const target = LANDING_LAP * WHEEL_ORDER.length + WHEEL_ORDER.indexOf(result.pocket);
    // Deux images : la première pose la position sans transition, la seconde
    // déclenche le défilement.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.animated.set(true);
        this.stripIndex.set(target);
      })
    );

    this.spinTimer = setTimeout(() => {
      this.casino.settleRoulette();
      this.spinning.set(false);
      this.lastSpin.set(result);
      if (result.won) {
        this.soundManager.playFX(Sound.Buy);
        this.cheer(result.payout);
      }
    }, this.spinMs() + 150);
  }

  // --- Crash --------------------------------------------------------------

  onAutoCashOutInput(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.autoCashOut.set(Number.isFinite(value) && value >= 1.01 ? value : 0);
  }

  startCrash(): void {
    // Relancer pendant la révélation la coupe : le joueur a vu ce qu'il
    // voulait voir, rien ne justifie de lui faire attendre la fin.
    if (this.busy() || !this.casino.startCrash(this.bet())) return;
    this.stopFrame();
    this.soundManager.playFX(Sound.Plop);
    this.crashPhase.set('running');
    this.crashPayout.set(0);
    this.crashPeak.set(0);
    this.celebration.set(null);
    this.liveMultiplier = 1;
    this.timeScale = 1;
    this.cashedMark = 0;
    this.roundCrashAt = this.casino.crashPoint() ?? 1;
    this.crashStart = performance.now();
    this.zone.runOutsideAngular(() => this.crashFrame());
  }

  cashOut(): void {
    if (this.crashPhase() !== 'running') return;
    const result = this.casino.cashOut(this.liveMultiplier);
    if (!result) return;
    // L'image en attente est annulée d'abord : sans cela, elle repartirait
    // pour son propre compte et deux boucles peindraient la même courbe.
    this.stopFrame();

    const cashedAt = this.liveMultiplier;
    this.crashResult.set(cashedAt);
    this.crashPayout.set(result.payout);

    // Encaissement refusé : la courbe avait déjà sauté, il n'y a rien à
    // dévoiler. L'écran annonce le point de rupture, pas le geste manqué.
    if (result.payout === 0) {
      this.crashResult.set(result.crashAt);
      this.endCrash(result.crashAt);
      return;
    }

    this.soundManager.playFX(Sound.Buy);
    this.cheer(result.payout);
    this.cashedMark = cashedAt;

    // La courbe repart d'où elle en était, mais le temps s'écoule plus vite :
    // on remonte l'origine pour que l'instant courant reste le même.
    const remaining = CasinoManager.timeFor(result.crashAt) - CasinoManager.timeFor(cashedAt);
    this.timeScale = Math.max(REVEAL_SPEED, remaining / REVEAL_MAX_SECONDS);
    this.crashStart = performance.now() - (CasinoManager.timeFor(cashedAt) / this.timeScale) * 1000;
    this.crashPhase.set('reveal');
    this.zone.runOutsideAngular(() => this.crashFrame());
  }

  private endCrash(multiplier: number): void {
    this.stopFrame();
    this.crashPeak.set(multiplier);
    this.crashPhase.set(this.crashPayout() > 0 ? 'cashed' : 'busted');
    this.draw(CasinoManager.timeFor(multiplier), multiplier);
  }

  private stopFrame(): void {
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
    this.frameId = undefined;
  }

  private crashFrame = (): void => {
    const elapsed = ((performance.now() - this.crashStart) / 1000) * this.timeScale;
    const multiplier = Math.floor(CasinoManager.multiplierAt(elapsed) * 100) / 100;
    const crashAt = this.roundCrashAt;
    const revealing = this.crashPhase() === 'reveal';

    if (multiplier >= crashAt) {
      if (!revealing) {
        this.liveMultiplier = crashAt;
        this.crashResult.set(crashAt);
        this.crashPayout.set(0);
        this.zone.run(() => {
          this.casino.bust();
          this.endCrash(crashAt);
        });
      } else {
        this.zone.run(() => this.endCrash(crashAt));
      }
      return;
    }

    if (!revealing) {
      const auto = this.autoCashOut();
      if (auto && auto <= crashAt && multiplier >= auto) {
        this.liveMultiplier = auto;
        this.zone.run(() => this.cashOut());
        return;
      }
      this.liveMultiplier = multiplier;
    }

    this.draw(elapsed, multiplier);
    this.frameId = requestAnimationFrame(this.crashFrame);
  };

  /**
   * Trace la courbe jusqu'à l'instant `seconds`. Les axes s'élargissent avec
   * la partie : la flèche reste toujours dans le cadre.
   */
  private draw(seconds: number, multiplier: number): void {
    const curve = this.curve()?.nativeElement;
    const arrow = this.arrow()?.nativeElement;
    const readout = this.readout()?.nativeElement;
    if (!curve || !arrow) return;

    const { width, height, pad } = CHART;
    const maxT = Math.max(8, seconds * 1.15);
    const maxM = Math.max(2, multiplier * 1.2);
    const x = (t: number) => pad + (t / maxT) * (width - 2 * pad);
    const y = (m: number) => height - pad - ((m - 1) / (maxM - 1)) * (height - 2 * pad);

    const steps = 48;
    const points: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (seconds * i) / steps;
      points.push(`${x(t).toFixed(1)},${y(CasinoManager.multiplierAt(t)).toFixed(1)}`);
    }
    curve.setAttribute('points', points.join(' '));

    // Pointe de flèche orientée selon la pente au bout de la courbe.
    const tipX = x(seconds);
    const tipY = y(multiplier);
    const back = Math.max(0, seconds - maxT / 60);
    const angle = Math.atan2(tipY - y(CasinoManager.multiplierAt(back)), tipX - x(back));
    const size = 12;
    const corner = (offset: number) =>
      `${(tipX - size * Math.cos(angle + offset)).toFixed(1)},${(tipY - size * Math.sin(angle + offset)).toFixed(1)}`;
    arrow.setAttribute('points', `${tipX.toFixed(1)},${tipY.toFixed(1)} ${corner(0.45)} ${corner(-0.45)}`);

    const mark = this.mark()?.nativeElement;
    if (mark) {
      const shown = this.cashedMark > 0 && this.cashedMark <= multiplier;
      mark.setAttribute('r', shown ? '5' : '0');
      if (shown) {
        mark.setAttribute('cx', x(CasinoManager.timeFor(this.cashedMark)).toFixed(1));
        mark.setAttribute('cy', y(this.cashedMark).toFixed(1));
      }
    }

    if (readout) readout.textContent = `×${multiplier.toFixed(2)}`;
  }

  back(): void {
    this.soundManager.playFX(Sound.Plop);
    this.router.navigate(['/game']);
  }
}
