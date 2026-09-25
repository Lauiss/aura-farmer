import { Injectable, computed, inject, signal } from '@angular/core';
import Decimal from 'break_infinity.js';
import { AuraManager } from './aura-manager';
import { ShopManager } from './shop-manager';
import { AchievementsManager } from './achievements-manager';
import { BattleManager } from './battle-manager';
import { CollectionManager } from './collection-manager';
import { StoreManager } from './store-manager';
import { SpinCombo } from './spin-combo';
import { CallManager } from './call-manager';
import { HintManager } from './hint-manager';
import { SaveLocation, SaveManager } from './save-manager';
import {
  DAILY_AURA_SECONDS,
  DAILY_COUNT,
  DAILY_POOL,
  QuestDefinition,
  QuestGoal,
  STORY,
  dailyQuest
} from '../../assets/static/quests';

/** Une quête telle que l'écran la montre : sa définition et où elle en est. */
export interface QuestProgress {
  definition: QuestDefinition;
  /** Cible réelle : celle de la définition, sauf pour les cibles recalculées. */
  target: number;
  current: number;
  done: boolean;
}

interface DailySave {
  id: string;
  target: number;
  /** Relevé du compteur au réveil : l'avancement est l'écart avec lui. */
  baseline: number;
  done: boolean;
}

interface QuestSave {
  /** Chapitre en cours. Égal à la longueur de l'histoire une fois finie. */
  chapter: number;
  /** Jour des quotidiennes en cours, au format `AAAA-MM-JJ` local. */
  day: string;
  dailies: DailySave[];
}

/**
 * Suit l'avancement des quêtes et les valide.
 *
 * Aucune quête ne demande de détour : toutes mesurent des grandeurs qui montent
 * en jouant normalement. Leur rôle n'est pas de dicter une conduite mais de
 * **nommer la prochaine étape**, ce qui manquait à un jeu où l'on regarde des
 * nombres monter sans savoir vers quoi.
 *
 * La validation est automatique : il n'y a rien à réclamer. Un bouton
 * « récupérer » n'aurait ajouté qu'un aller-retour dans un menu entre le moment
 * où l'on mérite la récompense et celui où on l'obtient.
 */
@Injectable({
  providedIn: 'root'
})
export class QuestManager {

  private readonly auraManager = inject(AuraManager);
  private readonly shopManager = inject(ShopManager);
  private readonly achievements = inject(AchievementsManager);
  private readonly battles = inject(BattleManager);
  private readonly collection = inject(CollectionManager);
  private readonly store = inject(StoreManager);
  private readonly spinCombo = inject(SpinCombo);
  private readonly calls = inject(CallManager);
  private readonly hintManager = inject(HintManager);
  private readonly saveManager = inject(SaveManager);

  /** Rang du chapitre en cours ; `STORY.length` une fois l'histoire finie. */
  readonly chapter = signal(0);
  private readonly day = signal('');
  private readonly dailies = signal<DailySave[]>([]);

  /** Sert à réévaluer les avancements : ils dérivent de signaux divers. */
  private readonly revision = signal(0);

  constructor() {
    const saved: QuestSave | null = this.saveManager.loadProgress(SaveLocation.Quests);
    if (saved) {
      this.chapter.set(Math.min(saved.chapter ?? 0, STORY.length));
      this.day.set(saved.day ?? '');
      this.dailies.set(saved.dailies ?? []);
    }
    // Surtout **pas** de tirage ici : le service est construit avant que la
    // sauvegarde ne soit chargée, et les relevés de départ seraient pris sur
    // une partie vierge. Un joueur revenant avec cinq mille clics aurait vu sa
    // quotidienne « cliquer 400 fois » se valider dans la seconde. Le premier
    // tirage a lieu au premier `tick()`, après le chargement.
  }

  /**
   * Rattrape les chapitres déjà remplis par une partie en cours, **sans** les
   * annoncer ni les payer : ils ont été franchis avant que les quêtes
   * n'existent, et quatorze annonces à la file au retour d'une vieille partie
   * ne racontent rien. Appelé une fois, après le chargement.
   */
  catchUp(): void {
    while (this.currentChapter()?.done) {
      this.chapter.update(rank => rank + 1);
      this.revision.update(value => value + 1);
    }
    this.persist();
  }

  // --- Mesures ------------------------------------------------------------

  /**
   * Valeur courante d'une grandeur. L'aura passe par `toNumber()` : les cibles
   * de quête sont des seuils, et `Infinity` au-delà d'un flottant les valide
   * toutes, ce qui est le comportement voulu.
   */
  private measure(goal: QuestGoal): number {
    switch (goal) {
      case 'aura': return this.auraManager.allTimeAura().toNumber();
      case 'clicks': return this.achievements.totalClicks();
      case 'production': return this.shopManager.getTotalValue();
      case 'bosses': return this.battles.defeatedCount();
      case 'figures': return this.collection.ownedCount();
      case 'relics': return this.collection.relicCount();
      case 'gems': return this.collection.gemsEarned();
      case 'companions': return this.store.companionCount();
      case 'combo': return this.spinCombo.peak();
      case 'calls': return this.calls.stats().answeredCount;
      case 'chests': return this.collection.chestsOpened();
    }
  }

  // --- Histoire -----------------------------------------------------------

  readonly storyDone = computed(() => this.chapter() >= STORY.length);

  readonly currentChapter = computed<QuestProgress | null>(() => {
    this.revision();
    const definition = STORY[this.chapter()];
    if (!definition) return null;
    const current = this.measure(definition.goal);
    return { definition, target: definition.target, current, done: current >= definition.target };
  });

  /** Chapitres déjà franchis, pour l'écran des quêtes. */
  readonly pastChapters = computed(() => STORY.slice(0, this.chapter()));

  // --- Quotidiennes -------------------------------------------------------

  readonly dailyQuests = computed<QuestProgress[]>(() => {
    this.revision();
    return this.dailies().flatMap(entry => {
      const definition = dailyQuest(entry.id);
      if (!definition) return [];
      // L'avancement est l'**écart** avec le relevé du réveil : sur un total,
      // une quotidienne serait déjà remplie le jour où elle est tirée.
      const current = Math.max(0, this.measure(definition.goal) - entry.baseline);
      return [{ definition, target: entry.target, current, done: entry.done || current >= entry.target }];
    });
  });

  /** Jour courant, en heure locale : la journée change à minuit chez le joueur. */
  private today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
  }

  /**
   * Retire trois quotidiennes si la journée a changé. Le tirage est **semé par
   * la date** : rouvrir le jeu dix fois dans la journée ne redistribue pas les
   * quêtes, et deux joueurs ont les mêmes, ce qui permet d'en parler.
   */
  private refreshDailies(): void {
    const today = this.today();
    if (this.day() === today && this.dailies().length) return;

    const random = QuestManager.seeded(today);
    const pool = [...DAILY_POOL];
    const drawn: DailySave[] = [];
    for (let i = 0; i < Math.min(DAILY_COUNT, pool.length); i++) {
      const [definition] = pool.splice(Math.floor(random() * pool.length), 1);
      drawn.push({
        id: definition.id,
        target: this.dailyTarget(definition),
        baseline: this.measure(definition.goal),
        done: false
      });
    }

    this.day.set(today);
    this.dailies.set(drawn);
    this.persist();
  }

  /**
   * Cible réelle d'une quotidienne. Celle d'aura est recalculée en secondes de
   * production : un montant fixe qui demande une heure au début se gagne en une
   * seconde plus tard, et la quête cesserait d'exister.
   */
  private dailyTarget(definition: QuestDefinition): number {
    if (definition.goal !== 'aura') return definition.target;
    return Math.max(definition.target, this.shopManager.getTotalValue() * DAILY_AURA_SECONDS);
  }

  /** Générateur déterministe à partir d'une chaîne (mulberry32 sur un hachage). */
  private static seeded(seed: string): () => number {
    let hash = 2166136261;
    for (const char of seed) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    let state = hash >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // --- Boucle -------------------------------------------------------------

  /**
   * Contrôle appelé chaque seconde par la boucle de jeu : change de journée si
   * besoin, valide ce qui est rempli.
   */
  tick(): void {
    this.revision.update(value => value + 1);
    this.refreshDailies();

    const chapter = this.currentChapter();
    if (chapter?.done) this.completeChapter(chapter);

    for (const quest of this.dailyQuests()) {
      const entry = this.dailies().find(d => d.id === quest.definition.id);
      if (quest.done && entry && !entry.done) this.completeDaily(entry, quest);
    }
  }

  private completeChapter(quest: QuestProgress): void {
    this.chapter.update(rank => rank + 1);
    this.reward(quest.definition.gems);
    this.hintManager.announce({
      titleKey: 'QUEST_CHAPTER_DONE',
      bodyKey: `QUEST_${quest.definition.id.toUpperCase().replace(/-/g, '_')}_DONE`,
      params: { gems: quest.definition.gems }
    });
    this.persist();
  }

  private completeDaily(entry: DailySave, quest: QuestProgress): void {
    this.dailies.update(list => list.map(d => (d.id === entry.id ? { ...d, done: true } : d)));
    this.reward(quest.definition.gems);
    this.hintManager.announce({
      titleKey: 'QUEST_DAILY_DONE',
      bodyKey: `QUEST_${quest.definition.id.toUpperCase().replace(/-/g, '_')}`,
      params: { gems: quest.definition.gems }
    });
    this.persist();
  }

  /**
   * Les gemmes d'une quête ne comptent **pas** comme gagnées : `gemsEarned`
   * nourrit des succès et des quêtes, et se récompenser d'une quête par de quoi
   * valider la suivante ferait boule de neige.
   */
  private reward(gems: number): void {
    this.collection.refundGems(gems);
  }

  /** Aura offerte par une quête, en secondes de production — inutilisée à ce jour. */
  auraReward(seconds: number): Decimal {
    return new Decimal(this.shopManager.getTotalValue() * seconds);
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Quests, {
      chapter: this.chapter(),
      day: this.day(),
      dailies: this.dailies()
    } satisfies QuestSave);
  }
}
