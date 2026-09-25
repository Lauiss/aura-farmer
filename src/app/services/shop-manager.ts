import { Injectable, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';
import { shopItems } from '../../assets/static/static-items';
import { moyaiUpgrades } from '../../assets/static/moyai-upgrades';
import { Effect, MoyaiUpgrades, MoyaiUpgradeSave } from '../components/aura-btn/aura-btn';
import { UpgradeType } from '../../assets/static/enum/upgrade-types';

export interface Item {
  id: number;
  name: WritableSignal<string>;
  /** Production d'un niveau, améliorations comprises. Dérivée de `baseValue`. */
  value: WritableSignal<number>;
  /** Production d'un niveau sans aucune amélioration. */
  baseValue: number;
  level: WritableSignal<number>;
  price: WritableSignal<number>;
  factor: number;
  /** Niveau maximal achetable. Au-delà, l'article est « maxxé ». */
  maxLevel: number;
  /** Prix au niveau zéro. Sert à recalculer la courbe après rééquilibrage. */
  basePrice: number;
  displayCondition: Signal<boolean>;
  unlocked: boolean;
  upgrades?: ItemUpgrade[];
  icon: string;
}

/**
 * Ce qu'il faut savoir d'une amélioration pour la vendre : son prix de départ,
 * ses exemplaires et ses prérequis. Les améliorations des articles, des pièces
 * d'outfit et des utilitaires partagent ainsi les mêmes règles.
 */
export interface Purchasable {
  id: number;
  name: string;
  price: number;
  unlocked: boolean;
  /**
   * Améliorations à posséder avant de pouvoir acheter celle-ci. Quand le
   * champ est absent, la convention s'applique : chaque amélioration ouvre la
   * suivante de sa liste.
   */
  requires?: number[];
  /** Nombre d'exemplaires déjà achetés. */
  purchases?: number;
  /** Exemplaires achetables ; cinq par défaut. */
  maxPurchases?: number;
}

export interface ItemUpgrade extends Purchasable {
  description: string;
  type: UpgradeType;
  effect: Effect;
}

export type BuyAmount = '1' | '10' | 'MAX';

/** Palier d'achat maximal d'une amélioration, quand rien n'est précisé. */
export const DEFAULT_UPGRADE_PURCHASES = 5;
/** Renchérissement d'un exemplaire d'amélioration au suivant. */
const UPGRADE_PRICE_FACTOR = 2.2;
/**
 * Part de la production par seconde qu'ajoute chaque clic. Sans elle, le clic
 * restait à 1 d'aura pendant que la production passive se comptait en
 * milliards : on n'avait plus aucune raison de toucher à la statue.
 */
const CLICK_SHARE_OF_PRODUCTION = 0.1;
/** Plancher des réductions de prix, pour qu'elles ne rendent rien gratuit. */
const MIN_PRICE_FACTOR = 0.4;

export interface ItemSave {
  id: number;
  value: number;
  quantity: number;
  price: number;
  factor: number;
  unlocked: boolean;
  upgrades?: { id: number; unlocked: boolean; purchases?: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class ShopManager {
  protected readonly auraService = inject(AuraManager);
  items = signal<Item[]>(shopItems);
  moyaiUpgrades = signal<MoyaiUpgrades[]>(moyaiUpgrades);

  /**
   * Multiplicateurs issus des améliorations. Ils ne sont jamais cumulés au fil
   * des achats mais **recalculés** depuis ce qui est possédé : la sauvegarde
   * n'a alors à conserver que les achats, et un rééquilibrage s'applique aussi
   * aux parties en cours.
   */
  public finalMultiplier = signal(1);
  public clickMultiplier = signal(1);
  public priceReduction = signal(1);

  /**
   * Bonus d'apparence : ce que rapportent les cosmétiques portés et le décor
   * affiché. Il est fourni de l'extérieur, `ShopManager` n'ayant pas à
   * connaître la garde-robe ni les décors.
   */
  readonly styleBonus = signal(1);

  /**
   * Réémis à chaque achat d'amélioration, quelle que soit sa famille.
   *
   * Les exemplaires achetés sont des champs ordinaires des données statiques
   * (`purchases`, `unlocked`), modifiés sur place : sans ce signal, rien de ce
   * qui en dérive — la carte, ses chaînes qui s'ouvrent, son compteur — ne
   * voyait l'achat. Tous les helpers qui lisent ces champs le lisent aussi.
   */
  private readonly purchaseRevision = signal(0);

  /** À appeler après toute écriture directe de `purchases` ou `unlocked`. */
  markPurchasesChanged(): void {
    this.purchaseRevision.update(revision => revision + 1);
  }

  /**
   * Indexation des prix sur le stock de multiplicateurs.
   *
   * Les prix étaient **absolus** quand les revenus sont **multiplicatifs** :
   * chaque source de multiplicateur ajoutée au jeu — reliques, compagnons,
   * canettes, décors — divisait d'autant l'échelle de prix tout entière.
   * Mesuré : passé un million de multiplicateur cumulé, le niveau le plus cher
   * du jeu se remboursait en trois secondes.
   *
   * Les prix suivent donc ce stock, mais **moins vite que lui** (exposant
   * inférieur à 1) : monter son multiplicateur reste payant, sans rendre
   * l'échelle dérisoire. Le plancher laisse le début de partie intact — sous
   * mille de multiplicateur, rien ne change.
   */
  private static readonly PRICE_SCALE_FLOOR = 1000;
  private static readonly PRICE_SCALE_EXPONENT = 0.85;

  readonly priceScale = computed(() => {
    const stock = this.finalMultiplier() * this.styleBonus();
    if (stock <= ShopManager.PRICE_SCALE_FLOOR) return 1;
    return Math.pow(stock / ShopManager.PRICE_SCALE_FLOOR, ShopManager.PRICE_SCALE_EXPONENT);
  });

  /** Ce que coûte réellement un prix affiché, indexation et remises comprises. */
  scaled(price: number): number {
    return Math.round(price * this.priceScale() * this.priceReduction());
  }

  /** Production passive par seconde. */
  readonly production = computed(() => {
    const base = this.items().reduce((total, item) => total + item.value() * item.level(), 0);
    return base * this.finalMultiplier() * this.styleBonus();
  });

  /** Aura rapportée par un clic ordinaire, avant combo et coup critique. */
  readonly clickValue = computed(
    () => (1 + CLICK_SHARE_OF_PRODUCTION * this.production()) * this.clickMultiplier()
  );

  constructor() {
    this.recomputeEffects();
  }

  buyItem(itemId: number, amount: string): void {
    const item = this.items().find(i => i.id === itemId);
    if (!item) return;
    const amountToBuy = this.getAmountToBuy(amount, item);
    if (amountToBuy <= 0) return;

    // Un lot de dix s'achète en entier ou pas du tout.
    if (!this.auraService.canAfford(this.batchPrice(item, amountToBuy))) return;

    for (let i = 0; i < amountToBuy; i++) {
      const price = this.itemPrice(item);
      if (item.level() >= item.maxLevel || !this.auraService.canAfford(price)) break;
      this.auraService.spend(price);
      item.level.update(q => q + 1);
      item.price.set(this.priceAtLevel(item, item.level()));
    }
  }

  getTotalValue(): number {
    return this.production();
  }

  getAllItems(): Item[] {
    return this.items();
  }

  getAmountToBuy(amount: string, item: Item): number {
    const wanted =
      amount === '10' ? 10 : amount === 'MAX' ? this.calculateMaxAffordable(item) : 1;

    // Jamais au-delà du plafond : demander dix exemplaires à deux niveaux de
    // la fin n'en achète que deux.
    return Math.max(0, Math.min(Math.max(1, wanted), this.remainingLevels(item)));
  }

  /** Prix d'un article à un niveau donné, recalculé depuis son prix de base. */
  priceAtLevel(item: Item, level: number): number {
    return Math.round(item.basePrice * Math.pow(item.factor, level));
  }

  /** Prix du prochain niveau, indexation et réductions comprises. */
  itemPrice(item: Item): number {
    return this.scaled(item.price());
  }

  /** Prix cumulé des `count` prochains niveaux. */
  batchPrice(item: Item, count: number): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += this.scaled(this.priceAtLevel(item, item.level() + i));
    }
    return total;
  }

  /** Exemplaires achetés d'une amélioration. */
  /**
   * Exemplaires possédés d'une amélioration, **bornés à son plafond**. La
   * borne n'est pas cosmétique : une sauvegarde faite avant un rééquilibrage
   * peut porter plus d'exemplaires que le plafond du jour, et le compte de la
   * carte affichait alors « Niv. 7/5 » et un avancement de 101 %. Elle vaut
   * pour tout ce qui en dérive — prix du prochain exemplaire, effet, et
   * pourcentage de complétion.
   */
  upgradePurchases(upgrade: Purchasable): number {
    this.purchaseRevision();
    const owned = upgrade.purchases ?? (upgrade.unlocked ? 1 : 0);
    return Math.min(owned, this.upgradeMaxPurchases(upgrade));
  }

  /** Vrai dès le premier exemplaire acheté : la chaîne s'ouvre au suivant. */
  isUpgradeOwned(upgrade: Purchasable): boolean {
    return this.upgradePurchases(upgrade) > 0;
  }

  upgradeMaxPurchases(upgrade: Purchasable): number {
    return upgrade.maxPurchases ?? DEFAULT_UPGRADE_PURCHASES;
  }

  /** Prix du prochain exemplaire : chaque achat renchérit le suivant. */
  upgradePrice(upgrade: Purchasable): number {
    return this.scaled(upgrade.price * Math.pow(UPGRADE_PRICE_FACTOR, this.upgradePurchases(upgrade)));
  }

  isUpgradeMaxed(upgrade: Purchasable): boolean {
    return this.upgradePurchases(upgrade) >= this.upgradeMaxPurchases(upgrade);
  }

  /** Niveaux encore achetables avant le plafond. */
  remainingLevels(item: Item): number {
    return Math.max(0, item.maxLevel - item.level());
  }

  isMaxed(item: Item): boolean {
    return this.remainingLevels(item) === 0;
  }

  calculateMaxAffordable(item: Item): number {
    let count = 0;
    let aura = this.auraService.auraCount();

    while (count < this.remainingLevels(item)) {
      const price = this.scaled(this.priceAtLevel(item, item.level() + count));
      if (aura.lt(price)) break;
      aura = aura.minus(price);
      count++;
    }

    return count;
  }

  restoreItemsFromSave(savedItems: ItemSave[]) {
    const items = this.items();

    for (const saved of savedItems) {
      const existing = items.find(i => i.id === saved.id);
      if (!existing) continue;

      // La valeur, le facteur et le prix ne sont pas de la progression mais
      // de l'équilibrage : les restaurer figeait chaque partie sur les
      // réglages en vigueur le jour de sa création. Seul le niveau est
      // rechargé, le prix est recalculé depuis la courbe courante.
      existing.level.set(Math.min(saved.quantity, existing.maxLevel));
      existing.price.set(this.priceAtLevel(existing, existing.level()));
      existing.unlocked = saved.unlocked;

      for (const savedUpgrade of saved.upgrades ?? []) {
        const existingUpgrade = existing.upgrades?.find(u => u.id === savedUpgrade.id);
        if (existingUpgrade) {
          existingUpgrade.unlocked = savedUpgrade.unlocked;
          existingUpgrade.purchases = Math.min(
            savedUpgrade.purchases ?? (savedUpgrade.unlocked ? 1 : 0),
            this.upgradeMaxPurchases(existingUpgrade)
          );
        }
      }
    }
    this.items.set([...items]);
    this.markPurchasesChanged();
    this.recomputeEffects();
  }

  /**
   * Les compteurs sauvegardés sont ignorés : ils sont recalculés depuis les
   * achats. Les restaurer réappliquait par-dessus des effets déjà comptés.
   */
  restoreCountersFromSave(_counters: unknown) {
    this.recomputeEffects();
  }

  restoreMoyaiUpgradesFromSave(savedUpgrades: MoyaiUpgradeSave[]) {
    if (!savedUpgrades) return;
    const upgrades = this.moyaiUpgrades();
    for (const saved of savedUpgrades) {
      const existing = upgrades.find(u => u.id === saved.id);
      if (!existing) continue;
      existing.unlocked = saved.unlocked;

      for (const savedUpgrade of saved.upgrades ?? []) {
        const existingUpgrade = existing.upgrades?.find(u => u.id === savedUpgrade.id);
        if (existingUpgrade) {
          existingUpgrade.unlocked = savedUpgrade.unlocked;
          existingUpgrade.purchases = Math.min(
            savedUpgrade.purchases ?? (savedUpgrade.unlocked ? 1 : 0),
            this.upgradeMaxPurchases(existingUpgrade)
          );
        }
      }
    }
    this.moyaiUpgrades.set([...upgrades]);
    this.markPurchasesChanged();
    this.recomputeEffects();
  }

  /**
   * Achat d'une pièce d'outfit. La vérification du prix vivait dans le
   * composant : la ramener ici évite qu'un second appelant l'oublie.
   */
  buyMoyaiUpgrade(index: number): void {
    const piece = this.moyaiUpgrades()[index];
    if (!piece || piece.unlocked) return;
    const price = this.scaled(piece.price);
    if (!this.auraService.canAfford(price)) return;

    this.auraService.spend(price);
    this.unlockMoyaiUpgrade(index);
  }

  /** Achat d'une amélioration de pièce d'outfit, sur le modèle des articles. */
  buyOutfitUpgrade(pieceIndex: number, upgradeId: number): boolean {
    const piece = this.moyaiUpgrades()[pieceIndex];
    if (!piece?.unlocked || !piece.upgrades) return false;

    const upgrade = piece.upgrades.find(u => u.id === upgradeId);
    if (!upgrade || !this.buyUpgradeCopy(piece.upgrades, upgrade)) return false;

    this.moyaiUpgrades.set([...this.moyaiUpgrades()]);
    this.recomputeEffects();
    return true;
  }

  /** Compétences portées à leur plafond, pour les succès. */
  maxedSkillCount(): number {
    return this.items().filter(item => this.isMaxed(item)).length;
  }

  unlockMoyaiUpgrade(index: number) {
    this.moyaiUpgrades()[index].unlocked = true;
    // Le tableau était muté sur place sans que le signal soit réémis : la
    // garde-robe, qui en dérive, ne voyait jamais la nouvelle pièce.
    this.moyaiUpgrades.set([...this.moyaiUpgrades()]);
    this.recomputeEffects();
  }

  /**
   * Améliorations dont dépend celle-ci. Sans `requires` explicite, chaque
   * amélioration ouvre la suivante : la liste forme une chaîne.
   */
  upgradeRequirements<T extends Purchasable>(list: T[], upgrade: T): T[] {
    if (upgrade.requires) {
      return list.filter(candidate => upgrade.requires!.includes(candidate.id));
    }
    const index = list.indexOf(upgrade);
    return index > 0 ? [list[index - 1]] : [];
  }

  /** Vrai quand tous les prérequis sont acquis. */
  isUpgradeAvailable<T extends Purchasable>(list: T[], upgrade: T): boolean {
    return this.upgradeRequirements(list, upgrade).every(required => this.isUpgradeOwned(required));
  }

  /**
   * Débite et compte un exemplaire d'une amélioration, quelle que soit sa
   * famille. Renvoie `false` si l'achat n'a pas eu lieu.
   */
  buyUpgradeCopy<T extends Purchasable>(list: T[], upgrade: T): boolean {
    if (this.isUpgradeMaxed(upgrade)) return false;
    if (!this.isUpgradeAvailable(list, upgrade)) return false;

    const price = this.upgradePrice(upgrade);
    if (!this.auraService.canAfford(price)) return false;

    this.auraService.spend(price);
    upgrade.purchases = this.upgradePurchases(upgrade) + 1;
    upgrade.unlocked = true;
    this.markPurchasesChanged();
    return true;
  }

  unlockUpgrade(itemId: number, upgradeId: number): boolean {
    const item = this.items().find(i => i.id === itemId);
    const upgrade = item?.upgrades?.find(u => u.id === upgradeId);
    if (!item?.upgrades || !upgrade) return false;

    if (!this.buyUpgradeCopy(item.upgrades, upgrade)) return false;

    this.items.set([...this.items()]);
    this.recomputeEffects();
    return true;
  }

  /**
   * Prix cumulé des `count` prochains exemplaires d'une amélioration. Chaque
   * exemplaire renchérissant le suivant, la somme n'est pas `prix × count`.
   */
  upgradeBatchPrice(upgrade: Purchasable, count: number): number {
    const owned = this.upgradePurchases(upgrade);
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += this.scaled(upgrade.price * Math.pow(UPGRADE_PRICE_FACTOR, owned + i));
    }
    return total;
  }

  /**
   * Recalcule tous les effets depuis ce qui est possédé.
   *
   * Chaque exemplaire **ajoute** sa valeur au lieu de la multiplier : cinq
   * exemplaires à +20 % font +100 %, et non ×2,49. Empilés sur des dizaines
   * d'améliorations, les produits faisaient exploser la production.
   *
   * Les bonus de **clic** s'additionnent aussi d'une amélioration à l'autre.
   * Le clic suivant la production, un multiplicateur de clic multiplie en
   * réalité tout le revenu d'un joueur actif : multipliés entre eux, les
   * bonus de clic atteignaient ×8 000, et le dernier enseignement tombait en
   * une heure et demie (simulation).
   */
  recomputeEffects(): void {
    const itemFactors = new Map<number, number>();
    let global = 1;
    let click = 1;
    let prices = 1;

    const apply = (effect: Effect, copies: number) => {
      if (copies <= 0) return;
      const factor = 1 + effect.value * copies;

      switch (effect.type) {
        case UpgradeType.MULTIPLIER:
        case UpgradeType.ITEM_BOOST:
          if (effect.targetItemId?.length) {
            for (const id of effect.targetItemId) {
              itemFactors.set(id, (itemFactors.get(id) ?? 1) * factor);
            }
          } else {
            global *= factor;
          }
          break;
        case UpgradeType.CLICK:
          click += factor - 1;
          break;
        case UpgradeType.PRICE_REDUCTION:
          prices *= factor;
          break;
      }
    };

    for (const item of this.items()) {
      for (const upgrade of item.upgrades ?? []) {
        apply(upgrade.effect, this.upgradePurchases(upgrade));
      }
    }
    for (const piece of this.moyaiUpgrades()) {
      if (!piece.unlocked) continue;
      apply(piece.effect, 1);
      for (const upgrade of piece.upgrades ?? []) {
        apply(upgrade.effect, this.upgradePurchases(upgrade));
      }
    }

    for (const item of this.items()) {
      item.value.set(item.baseValue * (itemFactors.get(item.id) ?? 1));
    }
    this.finalMultiplier.set(global);
    this.clickMultiplier.set(click);
    this.priceReduction.set(Math.max(MIN_PRICE_FACTOR, prices));
  }

  getCountersValue() {
    return {
      finalMultiplier: this.finalMultiplier(),
      clickMultiplier: this.clickMultiplier(),
      priceReduction: this.priceReduction()
    };
  }

  unbuyMoyaiUpgrade(index: number) {
    this.moyaiUpgrades()[index].unlocked = false;
    this.recomputeEffects();
  }
}
export { UpgradeType };
