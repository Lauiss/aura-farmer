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
  Rarity,
  chestDefinition,
  collectibleDefinition
} from '../../assets/static/collectibles';
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
  owned: string[];
  chests: Partial<Record<ChestTier, number>>;
  skin: string | null;
}

/**
 * Gacha : la seconde monnaie (les gemmes), les coffres en attente et la
 * collection de statuettes.
 *
 * Une statuette ne s'obtient qu'une fois : le tirage ne pioche que parmi
 * celles qui manquent, et une rareté complétée se rabat sur de l'aura.
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
  private readonly ownedIds = signal<Set<string>>(new Set());
  /** Coffres possédés et pas encore ouverts, par tier. */
  readonly chests = signal<Partial<Record<ChestTier, number>>>({});
  /** Statuette dont la statue du jeu porte la matière, `null` pour la pierre. */
  readonly skin = signal<string | null>(null);

  constructor() {
    const saved: CollectionSave | null = this.saveManager.loadProgress(SaveLocation.Collection);
    if (saved) {
      this.gems.set(saved.gems ?? 0);
      this.ownedIds.set(new Set(saved.owned ?? []));
      this.chests.set(saved.chests ?? {});
      this.skin.set(saved.skin ?? null);
    }
  }

  readonly ownedCount = computed(() => this.ownedIds().size);
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

    const rarity = this.rollRarity(tier);
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
    this.persist();
    return reward;
  }

  /** Porte la matière d'une statuette obtenue, ou revient à la pierre. */
  applySkin(id: string | null): void {
    if (id && !this.isOwned(id)) return;
    this.skin.set(id);
    this.persist();
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
      owned: [...this.ownedIds()],
      chests: this.chests(),
      skin: this.skin()
    } satisfies CollectionSave);
  }
}
