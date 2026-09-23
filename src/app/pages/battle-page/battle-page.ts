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
  AttackRole,
  BossDefinition,
  BossIntent,
  COMBAT,
  DIE_FACES,
  INTENT_DAMAGE,
  INTENT_POOL,
  PLAYER_HP_SECONDS
} from '../../../assets/static/bosses';

/** Un coup jouable : un enseignement doublé du rôle qu'il tient au combat. */
export interface Attack {
  item: Item;
  role: AttackRole;
  /** Dégâts d'un MOG réussi, déjà rapportés à la production du joueur. */
  damage: number;
}

/** Ce qui s'est passé au dernier tour, pour l'afficher. */
interface Round {
  role: AttackRole;
  /** Jets du tour, absents quand le coup joué n'en demandait pas. */
  playerRoll?: number;
  bossRoll?: number;
  /** Ce qui est arrivé : coup porté, coup encaissé, égalité, garde, soin. */
  outcome: 'hit' | 'taken' | 'clash' | 'guarded' | 'healed';
  /** Dégâts infligés ou encaissés, selon l'issue. */
  damage: number;
  /** Vie rendue par un LOOKSMAX. */
  healed: number;
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
  /** Part de vie manquante rendue par un LOOKSMAX, en pourcentage. */
  readonly healPercent = Math.round(COMBAT.healShare * 100);

  /** Hargne du boss en pourcentage, pour l'afficher. */
  readonly enragePercent = computed(() => Math.round((this.enrage() - 1) * 100));

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

  /** Ce que le boss s'apprête à faire, annoncé avant le choix du joueur. */
  readonly intent = signal<BossIntent>('strike');
  /** Tours écoulés : c'est eux qui nourrissent la hargne du boss. */
  readonly turn = signal(1);
  /** Vrai quand une garde NPC couvre encore le tour en cours. */
  readonly guarded = signal(false);

  /** Dégâts du boss ce tour-ci, hargne et intention comprises. */
  readonly incoming = computed(() => {
    const boss = this.boss();
    if (!boss) return 0;
    return (
      boss.recommended *
      boss.damageSeconds *
      INTENT_DAMAGE[this.intent()] *
      Math.pow(1 + COMBAT.enragePerTurn, this.turn() - 1)
    );
  });

  /** Hargne accumulée, affichée dès qu'elle se met à compter. */
  readonly enrage = computed(
    () => Math.pow(1 + COMBAT.enragePerTurn, this.turn() - 1)
  );

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

    // Les rôles se distribuent en boucle sur les enseignements possédés : le
    // premier acheté frappe, le deuxième encaisse, le troisième soigne, puis
    // on recommence. Acheter plus large donne donc plusieurs cartes du même
    // rôle, ce qui permet d'en rejouer une pendant que l'autre recharge.
    return unlocked.map((item, index) => ({
      item,
      role: BattlePage.ROLE_CYCLE[index % BattlePage.ROLE_CYCLE.length],
      damage: production * COMBAT.mogPower
    }));
  });

  private static readonly ROLE_CYCLE: readonly AttackRole[] = ['mog', 'npc', 'looksmax'];

  /**
   * Recharge d'un coup, plafonnée à ce que le nombre de cartes permet : sans
   * ce plafond, toutes peuvent se retrouver indisponibles le même tour et le
   * combat se bloque.
   */
  private cooldownFor(): number {
    return Math.min(COMBAT.cooldown, Math.max(0, this.attacks().length - 1));
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
    this.turn.set(1);
    this.guarded.set(false);
    this.intent.set(BattlePage.drawIntent());
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

    const name = attack.item.name();
    // Les dégâts du tour sont figés avant d'agir : l'intention et la hargne
    // valent pour le coup qu'on est en train de jouer, pas pour le suivant.
    const incoming = this.incoming();
    const shielded = this.guarded();
    this.startCooldowns(attack);

    switch (attack.role) {
      case 'mog':
        this.resolveMog(attack, incoming, shielded, name);
        break;

      case 'npc':
        // Pas de jet : encaisser est acquis. On paie en tempo, pas en hasard.
        this.playerHp.update(hp => Math.max(0, hp - incoming * COMBAT.guardCut));
        this.guarded.set(true);
        this.lastRound.set({
          role: 'npc',
          outcome: 'guarded',
          damage: incoming * COMBAT.guardCut,
          healed: 0,
          actionName: name
        });
        this.soundManager.playPitched(Sound.Plop, 0.85);
        break;

      case 'looksmax': {
        // Part de ce qui **manque** : puissant quand on est bas, dérisoire
        // quand on est au complet. Impossible d'en faire une rente.
        const healed = (this.playerMaxHp() - this.playerHp()) * COMBAT.healShare;
        const taken = incoming * (shielded ? COMBAT.guardCut : 1);
        this.playerHp.update(hp => Math.max(0, Math.min(this.playerMaxHp(), hp + healed) - taken));
        this.guarded.set(false);
        this.lastRound.set({ role: 'looksmax', outcome: 'healed', damage: taken, healed, actionName: name });
        this.soundManager.playPitched(Sound.Plop, 1.3);
        break;
      }
    }

    this.turn.update(turn => turn + 1);
    this.intent.set(BattlePage.drawIntent());
    this.resolveEnd(boss);
  }

  /** Le MOG est le seul coup qui passe par les dés : frapper, c'est parier. */
  private resolveMog(attack: Attack, incoming: number, shielded: boolean, name: string): void {
    const playerRoll = this.rollPlayer();
    const bossRoll = this.roll();

    if (playerRoll === bossRoll) {
      this.lastRound.set({ role: 'mog', playerRoll, bossRoll, outcome: 'clash', damage: 0, healed: 0, actionName: name });
      this.soundManager.playFX(Sound.Plop);
      return;
    }

    if (playerRoll > bossRoll) {
      // Un boss en garde encaisse moitié moins : le frapper à ce moment-là est
      // du gâchis, c'est le tour où l'on se refait.
      const dealt = attack.damage * (this.intent() === 'guard' ? 0.5 : 1);
      this.bossHp.update(hp => Math.max(0, hp - dealt));
      this.lastRound.set({ role: 'mog', playerRoll, bossRoll, outcome: 'hit', damage: dealt, healed: 0, actionName: name });
      // Le son monte avec le dé : un vingt s'entend.
      this.soundManager.playPitched(Sound.Plop, 1 + (playerRoll / DIE_FACES) * 0.5);
    } else {
      const taken = incoming * (shielded ? COMBAT.guardCut : 1);
      this.playerHp.update(hp => Math.max(0, hp - taken));
      this.lastRound.set({ role: 'mog', playerRoll, bossRoll, outcome: 'taken', damage: taken, healed: 0, actionName: name });
      this.soundManager.playPitched(Sound.Plop, 0.7);
    }
    // La garde ne couvre qu'un échange de plus ; attaquer la consomme.
    this.guarded.set(false);
  }

  private static drawIntent(): BossIntent {
    return INTENT_POOL[Math.floor(Math.random() * INTENT_POOL.length)];
  }

  /**
   * Fait vieillir toutes les recharges d'un tour, puis met celle du coup joué.
   * Dans cet ordre : sinon il perdrait un tour dès son propre usage.
   */
  private startCooldowns(played: Attack): void {
    const next: Record<number, number> = {};
    for (const [id, turns] of Object.entries(this.cooldowns())) {
      if (turns > 1) next[Number(id)] = turns - 1;
    }
    const cooldown = this.cooldownFor();
    if (cooldown > 0) next[played.item.id] = cooldown;
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
