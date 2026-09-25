import { Component, computed, forwardRef, ViewChild, ElementRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormatAuraPipe } from '../../pipes/format-aura';
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
import { AchievementsList } from '../../components/achievements-list/achievements-list';
import { ModelIcons } from '../../services/model-icons';
import { GameLoop } from '../../services/game-loop';
import { SpinCombo } from '../../services/spin-combo';
import { CritStreak } from '../../services/crit-streak';
import { WardrobeManager } from '../../services/wardrobe-manager';
import { BackgroundManager } from '../../services/background-manager';
import { UtilityManager } from '../../services/utility-manager';
import { SecretTracker } from '../../services/secret-tracker';
import { Wardrobe } from '../../components/wardrobe/wardrobe';
import { QuestLog } from '../../components/quest-log/quest-log';
import { ComboMeter } from '../../components/combo-meter/combo-meter';
import { DoomPhone } from '../../components/doom-phone/doom-phone';
import { CollectionManager } from '../../services/collection-manager';
import { BattleManager } from '../../services/battle-manager';
import { Onboarding } from '../../services/onboarding';
import { StoreManager } from '../../services/store-manager';
import { ConsumableManager } from '../../services/consumable-manager';
import { ConsumableId } from '../../../assets/static/consumables';
import { COMPANION_PHONE_PAYOUT, CompanionId, companionDefinition } from '../../../assets/static/companions';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-game-page',
  templateUrl: './game-page.html',
  styleUrls: ['./game-page.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MoyaiViewer, IconBtn, ComboMeter, DoomPhone, TranslatePipe, forwardRef(() => FormatAuraPipe)]
})
export class GamePage {

  @ViewChild('btn', { read: ElementRef, static: true })
  private btnRef!: ElementRef<HTMLElement>;

  @ViewChild('btn', { static: true })
  private viewer!: MoyaiViewer;

  /** Identifiant de l'article Mewing, qui débloque le geste du « chut ». */
  private readonly mewingItemId = 4;
  /** Identifiant du Mogging, dont chaque clic alimente le combo. */
  private readonly moggingItemId = 9;

  public readonly soundManager = inject(SoundManager);
  public readonly translate = inject(TranslateService);
  public readonly auraManager = inject(AuraManager);
  public readonly shopManager = inject(ShopManager);
  public readonly modalManager = inject(ModalManager);
  public readonly settingsManager = inject(SettingsManager);
  public readonly achievementsManager = inject(AchievementsManager);
  private readonly modelIcons = inject(ModelIcons);
  private readonly router = inject(Router);
  private readonly spinCombo = inject(SpinCombo);
  readonly critStreak = inject(CritStreak);
  private readonly gameLoop = inject(GameLoop);
  readonly wardrobeManager = inject(WardrobeManager);
  readonly backgroundManager = inject(BackgroundManager);
  readonly utilityManager = inject(UtilityManager);
  readonly collection = inject(CollectionManager);
  readonly battles = inject(BattleManager);
  readonly onboarding = inject(Onboarding);
  readonly store = inject(StoreManager);
  readonly consumables = inject(ConsumableManager);

  /** L'accès à la collection apparaît avec le premier coffre ou la première gemme. */
  readonly showCollection = computed(
    () =>
      this.utilityManager.isOwned('doomscroll') ||
      this.collection.gems() > 0 ||
      this.collection.pendingChests() > 0 ||
      this.collection.ownedCount() > 0
  );

  readonly chestIcon = this.modelIcons.chest('premium');
  readonly storeIcon = this.modelIcons.coin();
  private readonly secretTracker = inject(SecretTracker);

  readonly hangerIcon = this.modelIcons.hanger();

  /**
   * Le smoking et la cravate descendent sous la mâchoire : sans ce recul, le
   * bas du buste sortirait du cadre.
   */
  readonly heroDistance = computed(() => {
    const worn = this.wardrobeManager.equipped();
    const hasBust = worn.includes('tuxedo') || worn.includes('tie') || worn.includes('cape');
    return hasBust ? 7.4 : 5.8;
  });

  /**
   * Passé tel quel à la statue, qui l'appelle à chaque image hors de la zone
   * Angular. Lié une fois pour toutes, sinon le gabarit en recréerait un à
   * chaque détection de changements.
   */
  readonly reportSpin = (yaw: number, pitch: number, dt: number) =>
    this.spinCombo.report(yaw, pitch, dt);

  readonly reportBackFacing = (backFacing: boolean, dt: number) =>
    this.secretTracker.reportBackFacing(backFacing, dt);

  /** Un point faible parti sans avoir été touché casse la série en cours. */
  readonly reportWeakPointMissed = () => this.critStreak.miss();

  /**
   * Au-delà de ce multiplicateur, l'écran passe en « go fast » : des traînées
   * filent sur les bords pour dire que la partie s'emballe.
   */
  // Les traînées de vitesse filent le long des bords de l'écran : c'est le
  // premier effet que coupe le mode calme.
  readonly goFast = computed(() => this.spinCombo.multiplier() >= 10 && !this.settingsManager.calm());

  /**
   * Palier d'aura, qui commande le halo autour de la statue. Le premier seuil
   * est le million : c'est le moment où la partie décolle, et l'aura doit se
   * voir sans qu'on ait à lire le compteur.
   */
  readonly auraLevel = computed(() => {
    const aura = this.auraManager.auraCount();
    if (aura.gte(1e12)) return 3;
    if (aura.gte(1e9)) return 2;
    if (aura.gte(1e6)) return 1;
    return 0;
  });


  /**
   * Position des traînées le long de chaque bord, en pourcentage. Fixée une
   * fois : les recalculer ferait sauter les traînées à chaque image.
   */
  readonly speedLines = [6, 18, 31, 44, 57, 70, 83, 94];

  /** L'accès aux battles apparaît au débit conseillé du premier boss. */
  readonly showBattles = this.battles.discovered;

  readonly battleIcon = this.modelIcons.swords();
  readonly shopIcon = this.modelIcons.shop();
  readonly trophyIcon = this.modelIcons.trophy(true);
  readonly gearIcon = this.modelIcons.gear();
  readonly moyaiIcon = this.modelIcons.moyai();
  readonly casinoIcon = this.modelIcons.die();
  readonly companionPhoneIcon = this.modelIcons.companionPhone();
  readonly questIcon = this.modelIcons.exclamation();

  openQuests() {
    this.modalManager.open(QuestLog);
  }

  openShop() {
    this.router.navigate(['/shop']);
  }

  openWardrobe() {
    this.modalManager.open(Wardrobe);
  }

  openBattles() {
    // Cliquer la cible éteint le projecteur : l'explication a porté.
    this.onboarding.dismiss();
    this.router.navigate(['/battle']);
  }

  /** Vignette d'une canette ou d'un plat en cours. */
  consumableIcon(id: ConsumableId): string {
    return this.modelIcons.can(id);
  }

  /** Secondes restantes, en `m:ss`. */
  clock(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${`${seconds % 60}`.padStart(2, '0')}`;
  }

  /** Vignette d'un compagnon, rendue une fois puis conservée. */
  companionIcon(id: CompanionId): string {
    return this.modelIcons.companion(id);
  }

  /**
   * Nom et bonus d'un compagnon, pour son infobulle. Une fois les téléphones
   * offerts, chacun en tient un : l'infobulle dit ce qu'il rapporte au
   * doomscrolling, sans quoi le petit écran allumé resterait un ornement.
   */
  companionLabel(id: CompanionId): string {
    const definition = companionDefinition(id);
    const name = this.translate.instant(`COMPANION_${id.toUpperCase()}`);
    const label = `${name} · +${Math.round(definition.bonus * 100)} %`;
    if (!this.store.phones()) return label;
    const phone = this.translate.instant('COMPANION_PHONE_TIP', {
      value: Math.round(COMPANION_PHONE_PAYOUT * 100)
    });
    return `${label} · ${phone}`;
  }

  openStore() {
    this.router.navigate(['/store']);
  }

  openCasino() {
    this.router.navigate(['/casino']);
  }

  openCollection() {
    this.router.navigate(['/collection']);
  }

  openAchievements() {
    this.modalManager.open(AchievementsList, undefined, 'xl');
  }

  openSettings() {
    this.modalManager.open(Settings);
  }


  ngOnInit() {
    this.settingsManager.getSettingsConfig();

    // Idempotent : la partie se charge au premier écran de jeu atteint, que
    // ce soit celui-ci ou la carte de la boutique.
    this.gameLoop.start();
    // Après le chargement de la partie : l'introduction ne se joue que si le
    // compteur est encore au point de départ.
    this.onboarding.playIntroIfFresh();
    this.soundManager.changeMusic(Sound.Game);
  }

  protected increment(e?: MouseEvent) {
    // Le combo de rotation dope le clic : cliquer une statue lancée rapporte
    // davantage que cliquer une statue immobile.
    const multiplier = this.spinCombo.current();
    // Un point faible touché porte un coup critique, puis relance le combo.
    const critical = !!e && (this.viewer?.tryHitWeakPoint(e) ?? false);
    // Les enchaîner paie : chaque point touché d'affilée multiplie davantage,
    // jusqu'à cinq. Manquer un point remet la série à zéro.
    const streak = critical ? this.critStreak.hit() : 0;
    const critMultiplier = critical
      ? this.utilityManager.critMultiplier() * this.critStreak.multiplier()
      : 1;

    const delta = this.shopManager.clickValue() * multiplier * critMultiplier;
    this.auraManager.gain(delta);
    if (critical) {
      // La série nourrit aussi le combo affiché, pas seulement le coup porté.
      this.spinCombo.boost(this.utilityManager.weakPointCombo() * this.critStreak.multiplier());
    }

    // Les gemmes tombent au clic, rarement, et plus souvent sur un critique.
    // La Prospection, achetée dans les utilitaires, élargit les deux chances.
    const gemChance = critical
      ? this.utilityManager.gemCritChance()
      : this.utilityManager.gemClickChance();
    if (Math.random() < gemChance) {
      const amount = this.utilityManager.gemAmount();
      this.collection.addGems(amount);
      if (e) this.spawnGem(e.clientX, e.clientY, amount);
    }

    // L'aura se crée sous le clic : une volée d'éclats part de la pierre, plus
    // large sur un coup critique.
    this.viewer?.emitAura(critical ? 2.4 : 1);

    // Incrémenter le compteur de clics
    this.achievementsManager.incrementClicks();

    if (e && delta !== 0) {
      this.jellyButton(e);
      this.spawnFloatingDelta(e.clientX, e.clientY, delta, multiplier, critical ? critMultiplier : 0, streak);
    }

    if (this.hasMewing()) {
      this.viewer?.playShush();
    }

    // Le Mogging se joue au clic : chaque coup pousse le combo, ce qui donne
    // une raison de cliquer vite en plus de faire tourner la statue. Et la
    // statue prend sa tête de mogger, pour qu'on voie ce qu'on a débloqué.
    const mogging = this.moggingLevel();
    if (mogging > 0) {
      this.spinCombo.boost(GamePage.MOGGING_BOOST * mogging);
      this.viewer?.playMog();
    }

    // Le trickshot est rare : quand il part, il fait s'envoler le combo.
    if (this.utilityManager.rollTrickshot()) {
      this.viewer?.playTrickshot();
      this.spinCombo.landTrickshot(this.utilityManager.trickshotPower());
    }

    // Le clic d'une série monte d'un cran à chaque point enchaîné : c'est ce
    // qui se remarque avant même le chiffre.
    if (streak > 1) {
      this.soundManager.playPitched(Sound.Plop, this.critStreak.pitch());
    } else {
      this.soundManager.playFX(Sound.Plop);
    }
  }

  /** Élan donné au combo par clic et par niveau de Mogging. */
  private static readonly MOGGING_BOOST = 0.012;

  /** Niveau de Mogging atteint ; 0 tant qu'il n'est pas acheté. */
  private moggingLevel(): number {
    return this.shopManager.getAllItems().find(item => item.id === this.moggingItemId)?.level() ?? 0;
  }

  /**
   * Le geste apparaît dès que le Mewing est débloqué dans la boutique, sans
   * attendre un premier achat : « débloqué » se lit ici comme « révélé ».
   */
  private hasMewing(): boolean {
    const mewing = this.shopManager.getAllItems().find(item => item.id === this.mewingItemId);
    return mewing?.displayCondition() ?? false;
  }

  /**
   * Rebond au clic, incliné du côté cliqué. Il est joué par la statue elle-même
   * dans la scène 3D : animer l'élément faisait rebondir le décor avec elle.
   */
  private jellyButton(e: MouseEvent) {
    const el = this.btnRef?.nativeElement;
    if (!el) return;
    const r = el.getBoundingClientRect();
    this.viewer?.bounce(((e.clientX - r.left) / r.width - 0.5) * 2);
  }

  /** Petit « +N 💎 » qui s'envole à côté du clic. */
  private spawnGem(clientX: number, clientY: number, amount = 1) {
    const span = document.createElement('span');
    span.textContent = `+${amount} 💎`;
    Object.assign(span.style, {
      position: 'fixed',
      left: `${clientX + 40}px`,
      top: `${clientY + 20}px`,
      fontWeight: '800',
      fontSize: '26px',
      color: '#9fe6ff',
      textShadow: '0 2px 8px rgba(0,0,0,.6)',
      pointerEvents: 'none',
      zIndex: '2147483647'
    } as CSSStyleDeclaration);
    document.body.appendChild(span);
    const anim = span.animate(
      [
        { transform: 'translateY(0) scale(0.8)', opacity: 0 },
        { transform: 'translateY(-20px) scale(1.1)', opacity: 1, offset: 0.2 },
        { transform: 'translateY(-70px) scale(1)', opacity: 0 }
      ],
      { duration: 1100, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
    );
    anim.onfinish = () => span.remove();
  }

  /** Crée un “+X” flottant à la position du clic (coordonnées écran) */
  private spawnFloatingDelta(clientX: number, clientY: number, delta: number, multiplier = 1, critical = 0, streak = 0) {
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

    // Le coup critique se voit de loin : plus gros, dans le bleu du point
    // faible, avec son multiplicateur.
    if (critical > 0) {
      const crit = document.createElement('small');
      // La série se lit dans le même souffle que le critique : c'est elle qui
      // explique le chiffre qui gonfle.
      const label = streak > 1
        ? `${this.translate.instant('CRIT_STREAK')} ×${streak}`
        : this.translate.instant('CRITICAL_HIT');
      crit.textContent = `${label} ×${critical.toFixed(1)}`;
      Object.assign(crit.style, {
        display: 'block',
        fontSize: '18px',
        fontWeight: '800',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: streak >= 5 ? '#ffd166' : '#5fd4ff'
      } as CSSStyleDeclaration);
      span.prepend(crit);
    }

    // Style inline pour éviter de toucher tes SCSS
    Object.assign(span.style, {
      position: 'fixed',
      left: `${clientX}px`,
      top: `${clientY}px`,
      transform: 'translate(-50%, -50%)',
      fontWeight: '700',
      fontSize: critical > 0 ? '54px' : '40px',
      textAlign: 'center',
      color: critical > 0 ? '#dff6ff' : 'white',
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
