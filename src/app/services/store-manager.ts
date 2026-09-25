import { Injectable, computed, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';
import { ShopManager } from './shop-manager';
import { SaveLocation, SaveManager } from './save-manager';
import { ChestTier } from '../../assets/static/collectibles';
import {
  COMPANIONS,
  COMPANION_PHONES_PRICE,
  COMPANION_PHONE_PAYOUT,
  CompanionDefinition,
  CompanionId,
  companionDefinition
} from '../../assets/static/companions';
import { DRINKS, FOODS, ConsumableDefinition, ConsumableId } from '../../assets/static/consumables';
import { CASINO_PRICE, CHEST_UNLOCK_PRICES } from '../../assets/static/store-unlocks';

interface StoreSave {
  chests: ChestTier[];
  drinks: ConsumableId[];
  companions: CompanionId[];
  /** Téléphones offerts aux compagnons. */
  phones?: boolean;
  /** Casino ouvert. */
  casino?: boolean;
  /** Restant d'une version où l'on pouvait ranger un compagnon. Ignoré. */
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
  private readonly shopManager = inject(ShopManager);

  private readonly chests = signal<Set<ChestTier>>(new Set());
  private readonly drinks = signal<Set<ConsumableId>>(new Set());
  private readonly companionIds = signal<Set<CompanionId>>(new Set());
  readonly phones = signal(false);
  /** Le casino n'existe qu'une fois ouvert dans l'arbre. */
  readonly casino = signal(false);

  constructor() {
    const saved: StoreSave | null = this.saveManager.loadProgress(SaveLocation.Store);
    if (saved) {
      this.chests.set(new Set(saved.chests ?? []));
      this.drinks.set(new Set(saved.drinks ?? []));
      this.companionIds.set(new Set(saved.companions ?? []));
      this.phones.set(saved.phones ?? false);
      this.casino.set(saved.casino ?? false);
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

  /** Prix d'ouverture d'un rayon de coffres, indexation comprise. */
  chestPrice(tier: ChestTier): number {
    return this.shopManager.scaled(CHEST_UNLOCK_PRICES[tier] ?? 0);
  }

  /** Prix d'ouverture d'un rayon de canettes. */
  drinkPrice(drink: ConsumableDefinition): number {
    return this.shopManager.scaled(drink.unlockPrice);
  }

  /** Prix d'un compagnon. */
  companionPrice(definition: CompanionDefinition): number {
    return this.shopManager.scaled(definition.price);
  }

  /** Canettes réellement en rayon. Les plats partagent le même registre. */
  readonly availableDrinks = computed<readonly ConsumableDefinition[]>(() =>
    DRINKS.filter(drink => this.drinks().has(drink.id))
  );

  readonly availableFoods = computed<readonly ConsumableDefinition[]>(() =>
    FOODS.filter(food => this.drinks().has(food.id))
  );

  unlockChest(tier: ChestTier): boolean {
    const price = this.chestPrice(tier);
    if (this.isChestUnlocked(tier) || !this.auraManager.canAfford(price)) return false;

    this.auraManager.spend(price);
    this.chests.update(unlocked => new Set(unlocked).add(tier));
    this.persist();
    return true;
  }

  unlockDrink(drink: ConsumableDefinition): boolean {
    const price = this.drinkPrice(drink);
    if (this.isDrinkUnlocked(drink.id) || !this.auraManager.canAfford(price)) return false;

    this.auraManager.spend(price);
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

  /**
   * Ceux qui sont posés au bas de l'écran. Ils le sont **tous** : un compagnon
   * s'achète, il ne se range pas. Ils suivent l'ordre du catalogue et non celui
   * des achats, pour que la rangée ne se réordonne pas d'une partie à l'autre.
   */
  readonly shownCompanions = computed<CompanionId[]>(() =>
    COMPANIONS.filter(companion => this.companionIds().has(companion.id)).map(c => c.id)
  );

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
    const price = this.companionPrice(definition);
    if (this.hasCompanion(definition.id) || !this.auraManager.canAfford(price)) return false;

    this.auraManager.spend(price);
    this.companionIds.update(owned => new Set(owned).add(definition.id));
    this.persist();
    return true;
  }

  // --- Téléphones des compagnons ----------------------------------------

  phonesPrice(): number {
    return this.shopManager.scaled(COMPANION_PHONES_PRICE);
  }

  /**
   * Facteur appliqué au gain du doomscrolling : chaque compagnon possédé
   * scrolle avec le joueur une fois les téléphones achetés.
   */
  readonly phonePayout = computed(() =>
    this.phones() ? 1 + COMPANION_PHONE_PAYOUT * this.companionIds().size : 1
  );

  buyPhones(): boolean {
    const price = this.phonesPrice();
    if (this.phones() || !this.auraManager.canAfford(price)) return false;

    this.auraManager.spend(price);
    this.phones.set(true);
    this.persist();
    return true;
  }

  // --- Casino ------------------------------------------------------------

  casinoPrice(): number {
    return this.shopManager.scaled(CASINO_PRICE);
  }

  buyCasino(): boolean {
    const price = this.casinoPrice();
    if (this.casino() || !this.auraManager.canAfford(price)) return false;

    this.auraManager.spend(price);
    this.casino.set(true);
    this.persist();
    return true;
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Store, {
      chests: [...this.chests()],
      drinks: [...this.drinks()],
      companions: [...this.companionIds()],
      phones: this.phones(),
      casino: this.casino()
    } satisfies StoreSave);
  }
}
