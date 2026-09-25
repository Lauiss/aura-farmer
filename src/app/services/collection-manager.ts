import { Injectable, computed, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';
import { SaveLocation, SaveManager } from './save-manager';
import { ShopManager } from './shop-manager';
import {
  COLLECTIBLES,
  CollectibleDefinition,
  ChestTier,
  RARITIES,
  RARITY_AURA_SECONDS,
  RARITY_BONUS,
  RARITY_COLLECTIBLE_CHANCE,
  RARITY_GEMS,
  RELICS,
  Rarity,
  RelicDefinition,
  chestDefinition,
  collectibleDefinition,
  relicDefinition,
  relicForBoss
} from '../../assets/static/collectibles';
import type { BossId } from '../../assets/static/bosses';
import type { MoyaiPalette } from '../three/models/moyai';

/** Ce que rapporte un coffre ouvert. */
export interface ChestReward {
  tier: ChestTier;
  rarity: Rarity;
  gems: number;
  /** Statuette obtenue, jamais un doublon. */
  collectible?: CollectibleDefinition;
  /** Aura rendue quand la rareté ne donne pas de statuette. */
  aura: number;
}

interface CollectionSave {
  gems: number;
  /** Gemmes amassées depuis le début, dépenses comprises : pour les succès. */
  gemsEarned?: number;
  owned: string[];
  /** Reliques sacrées trouvées. */
  relics?: string[];
  chests: Partial<Record<ChestTier, number>>;
  skin: string | null;
  /** Coffres ouverts depuis le début, pour les quêtes. */
  chestsOpened?: number;
}

/**
 * Gacha : la seconde monnaie (les gemmes), les coffres en attente, la
 * collection de statuettes et celle des reliques sacrées.
 *
 * Une statuette ne s'obtient qu'une fois : le tirage ne pioche que parmi
 * celles qui manquent. Une rareté complétée ne bloque pas le coffre, il monte
 * d'un cran — commun épuisé, il donne du rare — et ne se rabat sur de l'aura
 * qu'une fois toute la collection réunie.
 */
@Injectable({
  providedIn: 'root'
})
export class CollectionManager {

  readonly catalogue = COLLECTIBLES;

  private readonly auraManager = inject(AuraManager);
  private readonly shopManager = inject(ShopManager);
  private readonly saveManager = inject(SaveManager);

  readonly gems = signal(0);
  /**
   * Total gagné sur toute la partie. Le solde courant ne suffit pas aux
   * succès : acheter un coffre le fait redescendre, et « amasser cent
   * gemmes » ne doit pas se perdre à la première dépense.
   */
  readonly gemsEarned = signal(0);
  /** Coffres ouverts depuis le début de la partie : une mesure de quête. */
  readonly chestsOpened = signal(0);
  private readonly ownedIds = signal<Set<string>>(new Set());
  private readonly relicIds = signal<Set<string>>(new Set());
  /** Coffres possédés et pas encore ouverts, par tier. */
  readonly chests = signal<Partial<Record<ChestTier, number>>>({});
  /** Statuette dont la statue du jeu porte la matière, `null` pour la pierre. */
  readonly skin = signal<string | null>(null);

  constructor() {
    const saved: CollectionSave | null = this.saveManager.loadProgress(SaveLocation.Collection);
    if (saved) {
      this.gems.set(saved.gems ?? 0);
      // Parties d'avant le suivi : on repart du solde, faute de mieux.
      this.gemsEarned.set(saved.gemsEarned ?? saved.gems ?? 0);
      this.chestsOpened.set(saved.chestsOpened ?? 0);
      this.ownedIds.set(new Set(saved.owned ?? []));
      // Les reliques d'avant tombaient des coffres et n'existent plus : chacune
      // est remboursée en gemmes. Celles des boss déjà battus sont rendues
      // par `BattleManager` au chargement.
      const relics = saved.relics ?? [];
      const kept = relics.filter(id => relicDefinition(id));
      const retired = relics.length - kept.length;
      this.relicIds.set(new Set(kept));
      if (retired > 0) {
        this.gems.update(gems => gems + retired * CollectionManager.RETIRED_RELIC_GEMS);
        this.persist();
      }
      this.chests.set(saved.chests ?? {});
      this.skin.set(saved.skin ?? null);
    }
  }

  readonly ownedCount = computed(() => this.ownedIds().size);
  readonly relicCount = computed(() => this.relicIds().size);
  readonly relicCatalogue = RELICS;
  readonly pendingChests = computed(() =>
    Object.values(this.chests()).reduce((total, count) => total + (count ?? 0), 0)
  );

  /** Bonus de production cumulé de toutes les statuettes obtenues. */
  readonly bonus = computed(() => {
    let total = 1;
    for (const id of this.ownedIds()) {
      const definition = collectibleDefinition(id);
      if (definition) total += RARITY_BONUS[definition.rarity];
    }
    return total;
  });

  /**
   * Bonus des reliques. Il est **multiplicatif**, contrairement à celui des
   * statuettes qui s'additionne : c'est ce qui fait des dix reliques la
   * récompense de toute une partie plutôt qu'un bonus de plus.
   */
  readonly relicBonus = computed(() => {
    let total = 1;
    for (const id of this.relicIds()) {
      const definition = relicDefinition(id);
      if (definition) total *= definition.bonus;
    }
    return total;
  });

  /** Gemmes rendues pour chaque relique de l'ancienne formule. */
  private static readonly RETIRED_RELIC_GEMS = 60;

  /**
   * Donne la relique d'un boss, s'il en a une et qu'elle manque encore.
   * Renvoie la relique **nouvellement** obtenue, `null` sinon.
   */
  grantBossRelic(boss: BossId): RelicDefinition | null {
    const relic = relicForBoss(boss);
    if (!relic || this.relicIds().has(relic.id)) return null;
    this.relicIds.update(owned => new Set(owned).add(relic.id));
    this.persist();
    return relic;
  }

  isRelicOwned(id: string): boolean {
    return this.relicIds().has(id);
  }

  readonly skinPalette = computed<MoyaiPalette | null>(() => {
    const id = this.skin();
    return id ? collectibleDefinition(id)?.palette ?? null : null;
  });

  isOwned(id: string): boolean {
    return this.ownedIds().has(id);
  }

  chestCount(tier: ChestTier): number {
    return this.chests()[tier] ?? 0;
  }

  addChest(tier: ChestTier): void {
    this.chests.update(chests => ({ ...chests, [tier]: (chests[tier] ?? 0) + 1 }));
    this.persist();
  }

  addGems(amount: number): void {
    this.gems.update(gems => gems + amount);
    this.gemsEarned.update(total => total + amount);
    this.persist();
  }

  /**
   * Retire des gemmes sans toucher au total gagné : `gemsEarned` sert aux
   * succès, une dépense ne doit pas les faire reculer.
   */
  spendGems(amount: number): void {
    this.gems.update(gems => Math.max(0, gems - amount));
    this.persist();
  }

  /**
   * Rend des gemmes sans les compter comme gagnées : les gains du casino ne
   * font que rendre une mise, les compter ferait monter les succès de
   * collection en rejouant la même gemme.
   */
  refundGems(amount: number): void {
    this.gems.update(gems => gems + amount);
    this.persist();
  }

  /** Achète un coffre en gemmes ; il rejoint les coffres à ouvrir. */
  buyChest(tier: ChestTier): boolean {
    const price = chestDefinition(tier).price;
    if (price === null || this.gems() < price) return false;
    this.gems.update(gems => gems - price);
    this.addChest(tier);
    return true;
  }

  /**
   * Ouvre un coffre du tier donné et en applique aussitôt la récompense : la
   * refermer pendant l'animation ne la fait pas perdre.
   */
  openChest(tier: ChestTier): ChestReward | null {
    if (this.chestCount(tier) <= 0) return null;
    this.chests.update(chests => ({ ...chests, [tier]: (chests[tier] ?? 1) - 1 }));

    // La rareté tirée peut être déjà complète. Plutôt que de se rabattre
    // aussitôt sur de l'aura, on monte d'un cran : commun épuisé, le coffre
    // donne du rare, puis de l'épique, et ainsi de suite.
    const rolled = this.rollRarity(tier);
    const rarity = this.firstRarityWithMissing(rolled) ?? rolled;
    const reward: ChestReward = { tier, rarity, gems: RARITY_GEMS[rarity], aura: 0 };

    const missing = COLLECTIBLES.filter(c => c.rarity === rarity && !this.ownedIds().has(c.id));
    if (missing.length && Math.random() < RARITY_COLLECTIBLE_CHANCE[rarity]) {
      reward.collectible = missing[Math.floor(Math.random() * missing.length)];
      this.ownedIds.update(owned => new Set(owned).add(reward.collectible!.id));
    } else {
      // Au plancher, quelques dizaines de clics : un coffre ouvert tôt dans la
      // partie rapporte quand même quelque chose.
      reward.aura = Math.max(
        this.shopManager.production() * RARITY_AURA_SECONDS[rarity],
        this.shopManager.clickValue() * RARITY_AURA_SECONDS[rarity]
      );
      this.auraManager.gain(reward.aura);
    }

    this.gems.update(gems => gems + reward.gems);
    this.gemsEarned.update(total => total + reward.gems);
    this.chestsOpened.update(total => total + 1);
    this.persist();
    return reward;
  }

  /** Porte la matière d'une statuette obtenue, ou revient à la pierre. */
  applySkin(id: string | null): void {
    if (id && !this.isOwned(id)) return;
    this.skin.set(id);
    this.persist();
  }

  /**
   * Première rareté, à partir de celle tirée et en montant, qui a encore une
   * statuette à donner. `null` quand la collection est complète.
   */
  private firstRarityWithMissing(from: Rarity): Rarity | null {
    const start = RARITIES.indexOf(from);
    for (let i = start; i < RARITIES.length; i++) {
      const rarity = RARITIES[i];
      if (COLLECTIBLES.some(c => c.rarity === rarity && !this.ownedIds().has(c.id))) return rarity;
    }
    return null;
  }

  private rollRarity(tier: ChestTier): Rarity {
    const odds = chestDefinition(tier).odds;
    let roll = Math.random();
    for (const rarity of RARITIES) {
      roll -= odds[rarity];
      if (roll < 0) return rarity;
    }
    return 'common';
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Collection, {
      gems: this.gems(),
      gemsEarned: this.gemsEarned(),
      chestsOpened: this.chestsOpened(),
      owned: [...this.ownedIds()],
      relics: [...this.relicIds()],
      chests: this.chests(),
      skin: this.skin()
    } satisfies CollectionSave);
  }
}
