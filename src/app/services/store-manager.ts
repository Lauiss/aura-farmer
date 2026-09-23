import { Injectable, computed, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';
import { SaveLocation, SaveManager } from './save-manager';
import { ChestTier } from '../../assets/static/collectibles';
import { COMPANIONS, CompanionDefinition, CompanionId, companionDefinition } from '../../assets/static/companions';
import { CONSUMABLES, ConsumableDefinition, ConsumableId } from '../../assets/static/consumables';
import { CHEST_UNLOCK_PRICES } from '../../assets/static/store-unlocks';

interface StoreSave {
  chests: ChestTier[];
  drinks: ConsumableId[];
  companions: CompanionId[];
}

/**
 * Ce que la branche « Boutique » de l'arbre a ouvert : les rayons du marchand
 * et les compagnons posés autour de la statue.
 *
 * Les achats se font en **aura** ici, dans l'arbre, et non en gemmes : c'est la
 * progression ordinaire qui donne accès au rayon, les gemmes ne servant qu'à y
 * acheter ensuite.
 */
@Injectable({
  providedIn: 'root'
})
export class StoreManager {

  readonly companionCatalogue = COMPANIONS;

  private readonly auraManager = inject(AuraManager);
  private readonly saveManager = inject(SaveManager);

  private readonly chests = signal<Set<ChestTier>>(new Set());
  private readonly drinks = signal<Set<ConsumableId>>(new Set());
  private readonly companionIds = signal<Set<CompanionId>>(new Set());

  constructor() {
    const saved: StoreSave | null = this.saveManager.loadProgress(SaveLocation.Store);
    if (saved) {
      this.chests.set(new Set(saved.chests ?? []));
      this.drinks.set(new Set(saved.drinks ?? []));
      this.companionIds.set(new Set(saved.companions ?? []));
    }
  }

  // --- Rayons ------------------------------------------------------------

  isChestUnlocked(tier: ChestTier): boolean {
    // Le coffre du doomscrolling tombe tout seul : il n'a rien à débloquer.
    return CHEST_UNLOCK_PRICES[tier] === undefined || this.chests().has(tier);
  }

  isDrinkUnlocked(id: ConsumableId): boolean {
    return this.drinks().has(id);
  }

  chestPrice(tier: ChestTier): number {
    return CHEST_UNLOCK_PRICES[tier] ?? 0;
  }

  /** Canettes réellement en rayon. */
  readonly availableDrinks = computed<readonly ConsumableDefinition[]>(() =>
    CONSUMABLES.filter(drink => this.drinks().has(drink.id))
  );

  unlockChest(tier: ChestTier): boolean {
    const price = this.chestPrice(tier);
    if (this.isChestUnlocked(tier) || this.auraManager.auraCount() < price) return false;

    this.auraManager.auraCount.update(aura => aura - price);
    this.chests.update(unlocked => new Set(unlocked).add(tier));
    this.persist();
    return true;
  }

  unlockDrink(drink: ConsumableDefinition): boolean {
    if (this.isDrinkUnlocked(drink.id) || this.auraManager.auraCount() < drink.unlockPrice) return false;

    this.auraManager.auraCount.update(aura => aura - drink.unlockPrice);
    this.drinks.update(unlocked => new Set(unlocked).add(drink.id));
    this.persist();
    return true;
  }

  // --- Compagnons --------------------------------------------------------

  hasCompanion(id: CompanionId): boolean {
    return this.companionIds().has(id);
  }

  readonly companions = computed<CompanionId[]>(() => [...this.companionIds()]);
  readonly companionCount = computed(() => this.companionIds().size);

  /**
   * Ce que les compagnons ajoutent à la production, en facteur. Additif entre
   * eux : sept bonus multipliés les uns aux autres feraient de la dernière
   * acquisition un saut hors de proportion avec son prix.
   */
  readonly companionBonus = computed(() => {
    let total = 1;
    for (const id of this.companionIds()) {
      total += companionDefinition(id).bonus;
    }
    return total;
  });

  buyCompanion(definition: CompanionDefinition): boolean {
    if (this.hasCompanion(definition.id) || this.auraManager.auraCount() < definition.price) return false;

    this.auraManager.auraCount.update(aura => aura - definition.price);
    this.companionIds.update(owned => new Set(owned).add(definition.id));
    this.persist();
    return true;
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Store, {
      chests: [...this.chests()],
      drinks: [...this.drinks()],
      companions: [...this.companionIds()]
    } satisfies StoreSave);
  }
}
