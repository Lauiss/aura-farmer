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
  /**
   * Compagnons **rangés**, et non ceux qui sont sortis : comme la garde-robe,
   * on mémorise ce qu'on retire. Un compagnon fraîchement acheté doit se voir
   * sans qu'on ait à l'activer.
   */
  stowed?: CompanionId[];
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
  private readonly stowed = signal<Set<CompanionId>>(new Set());

  constructor() {
    const saved: StoreSave | null = this.saveManager.loadProgress(SaveLocation.Store);
    if (saved) {
      this.chests.set(new Set(saved.chests ?? []));
      this.drinks.set(new Set(saved.drinks ?? []));
      this.companionIds.set(new Set(saved.companions ?? []));
      this.stowed.set(new Set(saved.stowed ?? []));
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

  /** Tous les compagnons acquis, rangés ou non. */
  readonly companions = computed<CompanionId[]>(() => [...this.companionIds()]);
  readonly companionCount = computed(() => this.companionIds().size);

  /** Ceux qui sont réellement posés autour de la statue. */
  readonly shownCompanions = computed<CompanionId[]>(() =>
    [...this.companionIds()].filter(id => !this.stowed().has(id))
  );

  isCompanionShown(id: CompanionId): boolean {
    return this.hasCompanion(id) && !this.stowed().has(id);
  }

  /**
   * Sort un compagnon ou le range. Cela ne touche **pas** au bonus : il est
   * acquis à l'achat et le rester quoi qu'on affiche, sinon décorer coûterait
   * de la production.
   */
  toggleCompanion(id: CompanionId): void {
    if (!this.hasCompanion(id)) return;
    this.stowed.update(hidden => {
      const next = new Set(hidden);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    this.persist();
  }

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
      companions: [...this.companionIds()],
      stowed: [...this.stowed()]
    } satisfies StoreSave);
  }
}
