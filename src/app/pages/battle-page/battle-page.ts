import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuraManager } from '../../services/aura-manager';
import { BattleManager } from '../../services/battle-manager';
import { GameLoop } from '../../services/game-loop';
import { HintManager } from '../../services/hint-manager';
import { ModelIcons } from '../../services/model-icons';
import { Item, ShopManager } from '../../services/shop-manager';
import { Sound, SoundManager } from '../../services/sound-manager';
import { FormatAuraPipe } from '../../pipes/format-aura';
import {
  BossDefinition,
  DAMAGE_PER_CONTRIBUTION,
  DIE_FACES,
  PLAYER_HP_SECONDS
} from '../../../assets/static/bosses';

/** Ce qui s'est passé au dernier tour, pour l'afficher. */
interface Round {
  playerRoll: number;
  bossRoll: number;
  /** `clash` quand les deux dés tombent à égalité : personne ne touche. */
  outcome: 'hit' | 'taken' | 'clash';
  damage: number;
  actionName: string;
}

type Phase = 'select' | 'won' | 'lost';

/**
 * Battle d'aura : un duel au dé contre un brainrot.
 *
 * À chaque tour, le joueur choisit un enseignement débloqué ; les deux camps
 * lancent un dé à vingt faces, et le plus haut porte le coup. Les dégâts
 * viennent de ce que l'enseignement choisi rapporte réellement — la boutique
 * et le combat tirent donc sur la même corde.
 */
@Component({
  selector: 'app-battle-page',
  standalone: true,
  imports: [TranslatePipe, FormatAuraPipe],
  templateUrl: './battle-page.html',
  styleUrl: './battle-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BattlePage {

  readonly battles = inject(BattleManager);
  readonly shopManager = inject(ShopManager);
  private readonly auraManager = inject(AuraManager);
  private readonly soundManager = inject(SoundManager);
  private readonly hintManager = inject(HintManager);
  private readonly modelIcons = inject(ModelIcons);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly gameLoop = inject(GameLoop);

  readonly dieFaces = DIE_FACES;

  /** Boss en cours de combat, `null` sur la liste. */
  readonly boss = signal<BossDefinition | null>(null);
  readonly phase = signal<Phase>('select');
  readonly playerHp = signal(0);
  readonly bossHp = signal(0);
  readonly playerMaxHp = signal(1);
  readonly bossMaxHp = signal(1);
  readonly lastRound = signal<Round | null>(null);
  /** Gemmes gagnées à la victoire, pour l'écran de fin. */
  readonly winnings = signal(0);
  readonly firstWin = signal(false);

  /** Production par seconde : tout le combat en dépend. */
  readonly production = computed(() => this.shopManager.production());

  /** Enseignements achetés : ce sont les coups disponibles. */
  readonly actions = computed(() => this.shopManager.getAllItems().filter(item => item.level() > 0));

  readonly playerRatio = computed(() => this.playerHp() / this.playerMaxHp());
  readonly bossRatio = computed(() => this.bossHp() / this.bossMaxHp());

  /**
   * Le portrait du joueur, qui suit ce qu'il porte : sa statue, ou le brainrot
   * ramené d'une victoire précédente.
   */
  readonly playerIcon = computed(() => {
    const worn = this.battles.worn();
    return worn ? this.modelIcons.boss(worn) : this.modelIcons.moyai();
  });

  bossIcon(boss: BossDefinition): string {
    return this.modelIcons.boss(boss.id);
  }

  /** Dégâts que porterait un enseignement, tirés de ce qu'il rapporte. */
  damageOf(item: Item): number {
    return item.value() * item.level() * DAMAGE_PER_CONTRIBUTION;
  }

  /** Le débit conseillé est-il atteint ? Sinon, le combat sera rude. */
  isReady(boss: BossDefinition): boolean {
    return this.production() >= boss.recommended;
  }

  // --- Déroulement -------------------------------------------------------

  start(boss: BossDefinition): void {
    if (!this.battles.isUnlocked(boss.id)) {
      this.hintManager.show('BATTLE_LOCKED_HINT');
      return;
    }
    if (!this.actions().length) {
      this.hintManager.show('BATTLE_NO_ACTION_HINT');
      return;
    }

    this.boss.set(boss);
    // La vie du boss est absolue, tirée du débit conseillé ; celle du joueur
    // suit sa propre production. C'est cet écart qui rend le niveau conseillé
    // lisible : en dessous, on encaisse bien plus qu'on ne rend.
    this.bossMaxHp.set(boss.recommended * boss.hpSeconds);
    this.playerMaxHp.set(Math.max(1, this.production() * PLAYER_HP_SECONDS));
    this.bossHp.set(this.bossMaxHp());
    this.playerHp.set(this.playerMaxHp());
    this.lastRound.set(null);
    this.phase.set('select');
    this.soundManager.playFX(Sound.Plop);
  }

  play(item: Item): void {
    const boss = this.boss();
    if (!boss || this.phase() !== 'select') return;

    const playerRoll = this.roll();
    const bossRoll = this.roll();

    if (playerRoll === bossRoll) {
      // Égalité : les deux auras se neutralisent, personne ne perd de vie.
      this.lastRound.set({ playerRoll, bossRoll, outcome: 'clash', damage: 0, actionName: item.name() });
      this.soundManager.playFX(Sound.Plop);
      return;
    }

    if (playerRoll > bossRoll) {
      const damage = this.damageOf(item);
      this.bossHp.update(hp => Math.max(0, hp - damage));
      this.lastRound.set({ playerRoll, bossRoll, outcome: 'hit', damage, actionName: item.name() });
      // Le son monte avec le dé : un vingt s'entend.
      this.soundManager.playPitched(Sound.Plop, 1 + (playerRoll / DIE_FACES) * 0.5);
    } else {
      const damage = boss.recommended * boss.damageSeconds;
      this.playerHp.update(hp => Math.max(0, hp - damage));
      this.lastRound.set({ playerRoll, bossRoll, outcome: 'taken', damage, actionName: item.name() });
      this.soundManager.playPitched(Sound.Plop, 0.7);
    }

    this.resolveEnd(boss);
  }

  private resolveEnd(boss: BossDefinition): void {
    if (this.bossHp() <= 0) {
      const { gems, first } = this.battles.recordWin(boss);
      this.winnings.set(gems);
      this.firstWin.set(first);
      this.phase.set('won');
      this.soundManager.playFX(Sound.Buy);
      return;
    }
    if (this.playerHp() <= 0) {
      this.phase.set('lost');
    }
  }

  private roll(): number {
    return 1 + Math.floor(Math.random() * DIE_FACES);
  }

  /** Revient à la liste des boss. */
  leaveFight(): void {
    this.boss.set(null);
    this.phase.set('select');
    this.soundManager.playFX(Sound.Plop);
  }

  wear(boss: BossDefinition): void {
    this.soundManager.playFX(Sound.Plop);
    this.battles.wear(this.battles.worn() === boss.id ? null : boss.id);
  }

  back(): void {
    this.soundManager.playFX(Sound.Plop);
    this.router.navigate(['/game']);
  }

  ngOnInit(): void {
    // Comme la boutique et la collection : arriver directement ici doit
    // charger la partie.
    this.gameLoop.start();
  }
}
