import { Component, computed, Pipe, PipeTransform, signal, forwardRef, ViewChild, ElementRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { AuraManager } from '../../services/aura-manager';
import { ShopManager } from '../../services/shop-manager';
import { MoyaiViewer } from '../../components/moyai-viewer/moyai-viewer';
import { IconBtn } from '../../components/icon-btn/icon-btn';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Sound, SoundManager } from '../../services/sound-manager';
import { ModalManager } from '../../services/modal-manager';
import { Settings } from '../../components/settings/settings';
import { SettingsManager } from '../../services/settings-manager';
import { AchievementsManager } from '../../services/achievements-manager';
import { createAchievements } from '../../../assets/static/achievements';
import { GameLoop } from '../../services/game-loop';
import { AchievementsList } from '../../components/achievements-list/achievements-list';
import { ModelIcons } from '../../services/model-icons';
import { SpinCombo } from '../../services/spin-combo';
import { ComboMeter } from '../../components/combo-meter/combo-meter';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-game-page',
  templateUrl: './game-page.html',
  styleUrls: ['./game-page.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MoyaiViewer, IconBtn, ComboMeter, TranslatePipe, forwardRef(() => FormatAuraPipe)]
})
export class GamePage {

  @ViewChild('btn', { read: ElementRef, static: true })
  private btnRef!: ElementRef<HTMLElement>;

  @ViewChild('btn', { static: true })
  private viewer!: MoyaiViewer;

  /** Identifiant de l'article Mewing, qui débloque le geste du « chut ». */
  private readonly mewingItemId = 4;

  public readonly soundManager = inject(SoundManager);
  public readonly translate = inject(TranslateService);
  public readonly auraManager = inject(AuraManager);
  public readonly shopManager = inject(ShopManager);
  public readonly modalManager = inject(ModalManager);
  public readonly settingsManager = inject(SettingsManager);
  public readonly achievementsManager = inject(AchievementsManager);
  private readonly modelIcons = inject(ModelIcons);
  private readonly router = inject(Router);
  private readonly gameLoop = inject(GameLoop);
  private readonly spinCombo = inject(SpinCombo);

  /**
   * Passé tel quel à la statue, qui l'appelle à chaque image hors de la zone
   * Angular. Lié une fois pour toutes, sinon le gabarit en recréerait un à
   * chaque détection de changements.
   */
  readonly reportSpin = (yaw: number, pitch: number, dt: number) =>
    this.spinCombo.report(yaw, pitch, dt);

  readonly shopIcon = this.modelIcons.shop();
  readonly trophyIcon = this.modelIcons.trophy(true);
  readonly gearIcon = this.modelIcons.gear();

  openShop() {
    this.soundManager.playFX(Sound.Plop);
    this.router.navigate(['/shop']);
  }

  openAchievements() {
    this.soundManager.playFX(Sound.Plop);
    this.modalManager.open(AchievementsList, undefined, 'xl');
  }

  openSettings() {
    this.soundManager.playFX(Sound.Plop);
    this.modalManager.open(Settings);
  }


  ngOnInit() {
    this.settingsManager.getSettingsConfig();

    // Une seule fois par session. Recréer la liste à chaque montage la
    // remettait à l'état verrouillé, et le contrôle périodique les
    // redébloquait tous en annonçant chacun d'eux à nouveau.
    if (this.achievementsManager.achievements().length === 0) {
      this.achievementsManager.setAchievements(
        createAchievements(
          () => this.shopManager.getAllItems(),
          () => this.achievementsManager.totalClicks(),
          () => this.auraManager.allTimeAura()
        )
      );
    }

    // La boucle vit dans un service, pas dans la page : la production d'aura
    // doit continuer pendant qu'on parcourt la carte de la boutique.
    this.gameLoop.start();

    this.soundManager.changeMusic(Sound.Game);
  }

  protected increment(e?: MouseEvent) {
    const before = this.auraManager.auraCount();
    // Le combo de rotation dope le clic : cliquer une statue lancée rapporte
    // davantage que cliquer une statue immobile.
    const multiplier = this.spinCombo.current();
    this.auraManager.increment(multiplier);
    const after = this.auraManager.auraCount();

    // Incrémenter le compteur de clics
    this.achievementsManager.incrementClicks();

    const delta = +(after - before).toFixed(2);
    if (e && delta !== 0) {
      this.jellyButton(e);
      this.spawnFloatingDelta(e.clientX, e.clientY, delta, multiplier);
    }

    if (this.hasMewing()) {
      this.viewer?.playShush();
    }

    this.soundManager.playFX(Sound.Plop);
  }

  /** Le geste n'apparaît qu'une fois le Mewing possédé. */
  private hasMewing(): boolean {
    const mewing = this.shopManager.getAllItems().find(item => item.id === this.mewingItemId);
    return (mewing?.level() ?? 0) > 0;
  }

  // Animation pour les clicks
  private jellyButton(e: MouseEvent) {
    const el = this.btnRef?.nativeElement ?? null;
    if (!el) return;

    // Respecte prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.getAnimations().forEach(a => a.cancel());
      el.animate([{ transform: 'scale(0.98)' }, { transform: 'scale(1)' }], {
        duration: 120, easing: 'linear'
      });
      return;
    }

    // Tilt léger selon le côté cliqué
    const r = el.getBoundingClientRect();
    const relX = (e.clientX - r.left) / r.width;  // 0..1
    const tilt = (relX - 0.5) * 8;               // -4..4 deg

    el.getAnimations().forEach(a => a.cancel());
    el.animate(
      [
        { transform: 'scale(1,1) rotate(0deg)' },
        { transform: `scale(1.12,0.88) rotate(${tilt}deg)`, offset: 0.25 },
        { transform: `scale(0.92,1.08) rotate(${-tilt * 0.6}deg)`, offset: 0.5 },
        { transform: `scale(1.04,0.96) rotate(${tilt * 0.3}deg)`, offset: 0.75 },
        { transform: 'scale(1,1) rotate(0deg)' },
      ],
      { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' }
    );
  }

  /** Crée un “+X” flottant à la position du clic (coordonnées écran) */
  private spawnFloatingDelta(clientX: number, clientY: number, delta: number, multiplier = 1) {
    const span = document.createElement('span');
    // tu peux réutiliser ton pipe si tu veux le même formatage :
    const formatted = new FormatAuraPipe().transform(delta >= 0 ? delta : -delta);
    span.textContent = `${delta >= 0 ? '+' : '-'}${formatted}`;

    // Un clic porté par un combo se signale : c'est toute la récompense du
    // geste, il ne doit pas passer pour un clic ordinaire.
    if (multiplier > 1.05) {
      const badge = document.createElement('small');
      badge.textContent = ` ${this.translate.instant('COMBO_CLICK')} ×${multiplier.toFixed(1)}`;
      Object.assign(badge.style, {
        display: 'block',
        marginTop: '2px',
        fontSize: '15px',
        fontWeight: '700',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#ffb347'
      } as CSSStyleDeclaration);
      span.appendChild(badge);
    }

    // Style inline pour éviter de toucher tes SCSS
    Object.assign(span.style, {
      position: 'fixed',
      left: `${clientX}px`,
      top: `${clientY}px`,
      transform: 'translate(-50%, -50%)',
      fontWeight: '700',
      fontSize: '40px',
      textAlign: 'center',
      color: 'white',
      textShadow: '0 1px 0 rgba(0,0,0,.4)',
      pointerEvents: 'none',
      zIndex: '2147483647',
      willChange: 'transform, opacity',
    } as CSSStyleDeclaration);

    document.body.appendChild(span);

    // Animation : léger pop, monte et disparaît
    const anim = span.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.9)', opacity: 0 },
        { transform: 'translate(-50%, -70%) scale(1.08)', opacity: 1, offset: 0.2 },
        { transform: 'translate(-50%, -110%) scale(1)', opacity: 0 }
      ],
      { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
    );

    anim.onfinish = () => span.remove();
  }
}

  @Pipe({
    name: 'formatAura',
    standalone: true
  })
  export class FormatAuraPipe implements PipeTransform {
  transform(value: number): string {
    const absValue = Math.abs(value);

    if (absValue >= 1e12) {
      return (value / 1e12).toFixed(2).replace(/\.00$/, '') + ' T';
    } else if (absValue >= 1e9) {
      return (value / 1e9).toFixed(2).replace(/\.00$/, '') + ' B';
    } else if (absValue >= 1e6) {
      return (value / 1e6).toFixed(2).replace(/\.00$/, '') + ' M';
    } else if (absValue >= 1e3) {
      return (value / 1e3).toFixed(2).replace(/\.00$/, '') + ' k';
    } else if (absValue >= 1000) {
      return Math.round(value).toString();
    } else if (absValue >= 1) {
      return value.toFixed(2).replace(/\.00$/, '');
    } else {
      return value.toFixed(2);
    }
  }
}
