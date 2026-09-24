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

type Game = 'roulette' | 'crash';
type CrashPhase = 'idle' | 'running' | 'cashed' | 'busted';

/** Tours de roue parcourus avant l'arrêt : la case gagnante est dans le dernier. */
const STRIP_LAPS = 6;
const LANDING_LAP = 4;
/** Largeur d'une case du bandeau, en rem — à garder en phase avec le SCSS. */
const POCKET_REM = 3.5;
const SPIN_MS = 4200;

/** Cadre du graphique du crash, en unités SVG. */
const CHART = { width: 400, height: 220, pad: 14 };

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
  imports: [TranslatePipe],
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
  private readonly zone = inject(NgZone);

  readonly game = signal<Game>('roulette');
  readonly bet = signal(1);
  readonly betValid = computed(() => this.casino.canBet(this.bet()));

  readonly payouts = ROULETTE_PAYOUT;
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
  readonly spinMs = SPIN_MS;

  readonly colorOf = pocketColor;
  private spinTimer?: ReturnType<typeof setTimeout>;

  // --- Crash --------------------------------------------------------------

  readonly crashPhase = signal<CrashPhase>('idle');
  /** Multiplicateur final affiché une fois la partie close. */
  readonly crashResult = signal(1);
  readonly crashPayout = signal(0);
  /** Encaissement automatique, 0 pour le désactiver. */
  readonly autoCashOut = signal(0);

  private readonly curve = viewChild<ElementRef<SVGPolylineElement>>('curve');
  private readonly arrow = viewChild<ElementRef<SVGPolygonElement>>('arrow');
  private readonly readout = viewChild<ElementRef<HTMLElement>>('readout');

  private frameId?: number;
  private crashStart = 0;
  /** Multiplicateur à l'image courante, lu par l'encaissement. */
  private liveMultiplier = 1;

  ngOnInit(): void {
    // Comme les autres écrans : arriver directement ici charge la partie.
    this.gameLoop.start();
  }

  ngOnDestroy(): void {
    // Quitter pendant un tirage ne doit rien coûter : la roulette est réglée,
    // le crash encaissé à la valeur atteinte.
    clearTimeout(this.spinTimer);
    this.casino.settleRoulette();
    if (this.crashPhase() === 'running') this.casino.cashOut(this.liveMultiplier);
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
  }

  select(game: Game): void {
    if (this.busy()) return;
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

  spin(): void {
    if (this.busy()) return;
    const result = this.casino.spinRoulette(this.bet(), this.choice());
    if (!result) return;
    this.soundManager.playFX(Sound.Plop);

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
      if (result.won) this.soundManager.playFX(Sound.Buy);
    }, SPIN_MS + 150);
  }

  // --- Crash --------------------------------------------------------------

  onAutoCashOutInput(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.autoCashOut.set(Number.isFinite(value) && value >= 1.01 ? value : 0);
  }

  startCrash(): void {
    if (this.busy() || !this.casino.startCrash(this.bet())) return;
    this.soundManager.playFX(Sound.Plop);
    this.crashPhase.set('running');
    this.crashPayout.set(0);
    this.liveMultiplier = 1;
    this.crashStart = performance.now();
    this.zone.runOutsideAngular(() => this.crashFrame());
  }

  cashOut(): void {
    if (this.crashPhase() !== 'running') return;
    this.endCrash(this.casino.cashOut(this.liveMultiplier) ?? 0, this.liveMultiplier);
  }

  private endCrash(payout: number, multiplier: number): void {
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
    this.frameId = undefined;
    this.crashResult.set(multiplier);
    this.crashPayout.set(payout);
    this.crashPhase.set(payout > 0 ? 'cashed' : 'busted');
    if (payout > 0) this.soundManager.playFX(Sound.Buy);
    this.draw(CasinoManager.timeFor(multiplier), multiplier);
  }

  private crashFrame = (): void => {
    const crashAt = this.casino.crashPoint();
    if (crashAt === null) return;

    const elapsed = (performance.now() - this.crashStart) / 1000;
    const multiplier = Math.floor(CasinoManager.multiplierAt(elapsed) * 100) / 100;
    const auto = this.autoCashOut();

    if (auto && auto <= crashAt && multiplier >= auto) {
      this.liveMultiplier = auto;
      this.zone.run(() => this.cashOut());
      return;
    }
    if (multiplier >= crashAt) {
      this.liveMultiplier = crashAt;
      this.zone.run(() => {
        this.casino.bust();
        this.endCrash(0, crashAt);
      });
      return;
    }

    this.liveMultiplier = multiplier;
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

    if (readout) readout.textContent = `×${multiplier.toFixed(2)}`;
  }

  back(): void {
    this.soundManager.playFX(Sound.Plop);
    this.router.navigate(['/game']);
  }
}
