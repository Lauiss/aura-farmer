import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuraManager } from '../../services/aura-manager';
import { BattleManager } from '../../services/battle-manager';
import { GameLoop } from '../../services/game-loop';
import { HintManager } from '../../services/hint-manager';
import { ModelIcons } from '../../services/model-icons';
import { Item, ShopManager } from '../../services/shop-manager';
import { UtilityManager } from '../../services/utility-manager';
import { Sound, SoundManager } from '../../services/sound-manager';
import { FormatAuraPipe } from '../../pipes/format-aura';
import {
  ATTACK_SHAPES,
  AttackProfile,
  BossDefinition,
  DIE_FACES,
  PLAYER_HP_SECONDS
} from '../../../assets/static/bosses';

/** Une attaque jouable : un enseignement doublé de son profil de combat. */
export interface Attack {
  item: Item;
  profile: AttackProfile;
  /** Dégâts, déjà rapportés à la production du joueur. */
  damage: number;
  rollBonus: number;
  cooldown: number;
}

/** Ce qui s'est passé au dernier tour, pour l'afficher. */
interface Round {
  /** Lancer brut du joueur, avant le bonus de profil. */
  playerRoll: number;
  /** Lancer une fois le bonus appliqué : c'est lui qui est comparé. */
  playerTotal: number;
  bossRoll: number;
  /** `clash` quand les deux totaux tombent à égalité : personne ne touche. */
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
  private readonly utilityManager = inject(UtilityManager);
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

  /** Temps de recharge restant, par identifiant d'enseignement. */
  private readonly cooldowns = signal<Record<number, number>>({});

  /** Le manuel, replié par défaut : il sert la première fois, puis encombre. */
  readonly manualOpen = signal(false);

  /**
   * Les coups disponibles : les enseignements achetés, répartis en trois tiers
   * selon leur ancienneté. Les plus anciens frappent léger et sûr, les derniers
   * frappent lourd et risqué — ce qui donne un choix à chaque tour quel que
   * soit l'avancement de la partie, là où un découpage figé n'aurait proposé
   * que des coups légers en début de jeu.
   */
  readonly attacks = computed<Attack[]>(() => {
    const unlocked = this.shopManager.getAllItems().filter(item => item.level() > 0);
    const production = this.production();

    return unlocked.map((item, index) => {
      const profile = BattlePage.profileFor(index, unlocked.length);
      const shape = ATTACK_SHAPES[profile];
      return {
        item,
        profile,
        damage: production * shape.power,
        rollBonus: shape.rollBonus,
        // Plafonné à ce que le nombre d'attaques permet, sinon toutes peuvent
        // se retrouver en recharge le même tour et le combat se bloque.
        cooldown: Math.min(shape.cooldown, Math.max(0, unlocked.length - 1))
      };
    });
  });

  /** Sous trois enseignements, tout reste neutre : un tiers n'aurait aucun sens. */
  private static profileFor(index: number, total: number): AttackProfile {
    if (total < 3) return 'balanced';
    const third = Math.floor((index * 3) / total);
    return third === 0 ? 'light' : third === 1 ? 'balanced' : 'heavy';
  }

  /** Tours de recharge restants sur une attaque ; 0 si elle est prête. */
  remaining(attack: Attack): number {
    return this.cooldowns()[attack.item.id] ?? 0;
  }

  isReadyToPlay(attack: Attack): boolean {
    return this.remaining(attack) === 0;
  }

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
    if (!this.attacks().length) {
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
    this.cooldowns.set({});
    this.phase.set('select');
    this.soundManager.playFX(Sound.Plop);
  }

  play(attack: Attack): void {
    const boss = this.boss();
    if (!boss || this.phase() !== 'select') return;
    if (!this.isReadyToPlay(attack)) {
      this.hintManager.show('BATTLE_COOLDOWN_HINT');
      return;
    }

    const playerRoll = this.rollPlayer();
    // Le profil de l'attaque pèse sur le lancer : c'est là que se joue le
    // choix. Frapper lourd, c'est accepter de rater plus souvent.
    const playerTotal = playerRoll + attack.rollBonus;
    const bossRoll = this.roll();
    const name = attack.item.name();

    this.startCooldowns(attack);

    if (playerTotal === bossRoll) {
      // Égalité : les deux auras se neutralisent, personne ne perd de vie.
      this.lastRound.set({ playerRoll, playerTotal, bossRoll, outcome: 'clash', damage: 0, actionName: name });
      this.soundManager.playFX(Sound.Plop);
      return;
    }

    if (playerTotal > bossRoll) {
      this.bossHp.update(hp => Math.max(0, hp - attack.damage));
      this.lastRound.set({ playerRoll, playerTotal, bossRoll, outcome: 'hit', damage: attack.damage, actionName: name });
      // Le son monte avec le dé : un vingt s'entend.
      this.soundManager.playPitched(Sound.Plop, 1 + (playerRoll / DIE_FACES) * 0.5);
    } else {
      const damage = boss.recommended * boss.damageSeconds;
      this.playerHp.update(hp => Math.max(0, hp - damage));
      this.lastRound.set({ playerRoll, playerTotal, bossRoll, outcome: 'taken', damage, actionName: name });
      this.soundManager.playPitched(Sound.Plop, 0.7);
    }

    this.resolveEnd(boss);
  }

  /**
   * Fait vieillir toutes les recharges d'un tour, puis met celle de l'attaque
   * jouée. Dans cet ordre : sinon elle perdrait un tour dès son propre coup.
   */
  private startCooldowns(played: Attack): void {
    const next: Record<number, number> = {};
    for (const [id, turns] of Object.entries(this.cooldowns())) {
      if (turns > 1) next[Number(id)] = turns - 1;
    }
    if (played.cooldown > 0) next[played.item.id] = played.cooldown;
    this.cooldowns.set(next);
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

  /**
   * Le lancer du joueur, qui profite des dés pipés : une fraction des jets
   * sort d'office sur la face maximale. Le boss, lui, lance un dé honnête.
   */
  private rollPlayer(): number {
    return Math.random() < this.utilityManager.dieLuck() ? DIE_FACES : this.roll();
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
