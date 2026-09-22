import { Injectable, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';
import { shopItems } from '../../assets/static/static-items';
import { Upgrade } from './game-manager';
import { moyaiUpgrades } from '../../assets/static/moyai-upgrades';
import { Effect, MoyaiUpgrades, MoyaiUpgradeSave } from '../components/aura-btn/aura-btn';
import { UpgradeType } from '../../assets/static/enum/upgrade-types';

export interface Item {
  id: number;
  name: WritableSignal<string>;
  value: WritableSignal<number>;
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

export interface ItemUpgrade {
  id: number;
  name: string;
  description: string;
  type: UpgradeType;
  effect: Effect;
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

/** Palier d'achat maximal d'une amélioration, quand rien n'est précisé. */
export const DEFAULT_UPGRADE_PURCHASES = 5;
/** Renchérissement d'un exemplaire d'amélioration au suivant. */
const UPGRADE_PRICE_FACTOR = 1.6;

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

  public finalMultiplier = signal(1);
  public clickMultiplier = signal(1);
  public priceReduction = signal(1);

  buyItem(itemId: number, amount: string): void {
    const item = this.items().find(i => i.id === itemId);
    if (!item) return;
    let amountToBuy = this.getAmountToBuy(amount, item);
    if (amountToBuy <= 0) return;

    // Pour les achats multiples (10, 100), vérifier le coût total
    if (amount === '10' || amount === '100') {
      let totalCost = 0;
      let price = item.price();
      for (let i = 0; i < amountToBuy; i++) {
        totalCost += price;
        price = Math.round(price * item.factor);
      }
      if (this.auraService.auraCount() < totalCost) return; // pas assez d'aura, rien n'est acheté
    }

    for (let i = 0; i < amountToBuy; i++) {
      if (item.level() >= item.maxLevel) break;
      if (this.auraService.auraCount() >= item.price()) {
        this.auraService.auraCount.update(c => c - item.price());
        item.level.update(q => q + 1);
        item.price.update(p => Math.round(p * item.factor));
      } else {
        break;
      }
    }
  }

  getTotalValue(): number {
    const base = this.items().reduce((total, item) => {
      return total + item.value() * item.level();
    }, 0);

    return base * this.finalMultiplier();
  }

  getAllItems(): Item[] {
    return this.items();
  }

  getAmountToBuy(amount: string, item: Item): number {
    let amountToBuy = 1;

    switch (amount) {
      case '10':
        amountToBuy = 10;
        break;
      case '100':
        amountToBuy = 100;
        break;
      case 'MAX':
        amountToBuy = this.calculateMaxAffordable(item);
        break;
    }

    // Jamais au-delà du plafond : demander 100 exemplaires à deux niveaux de
    // la fin ne doit en acheter que deux.
    return Math.max(0, Math.min(Math.max(1, amountToBuy), this.remainingLevels(item)));
  }

  /** Prix d'un article à un niveau donné, recalculé depuis son prix de base. */
  priceAtLevel(item: Item, level: number): number {
    return Math.round(item.basePrice * Math.pow(item.factor, level));
  }

  /** Exemplaires achetés d'une amélioration. */
  upgradePurchases(upgrade: ItemUpgrade): number {
    return upgrade.purchases ?? (upgrade.unlocked ? 1 : 0);
  }

  upgradeMaxPurchases(upgrade: ItemUpgrade): number {
    return upgrade.maxPurchases ?? DEFAULT_UPGRADE_PURCHASES;
  }

  /** Prix du prochain exemplaire : chaque achat renchérit le suivant. */
  upgradePrice(upgrade: ItemUpgrade): number {
    return Math.round(upgrade.price * Math.pow(UPGRADE_PRICE_FACTOR, this.upgradePurchases(upgrade)));
  }

  isUpgradeMaxed(upgrade: ItemUpgrade): boolean {
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
    let price = item.price();
    let aura = this.auraService.auraCount();

    while (aura >= price) {
      aura -= price;
      price = Math.round(price * item.factor);
      count++;
    }

    return count;
  }

    restoreItemsFromSave(savedItems: ItemSave[]) {
      const items = this.items();

      for (const saved of savedItems) {
        const existing = items.find(i => i.id === saved.id);
        if (existing) {
          // La valeur, le facteur et le prix ne sont pas de la progression
          // mais de l'équilibrage : les restaurer figeait chaque partie sur
          // les réglages en vigueur le jour de sa création. Seul le niveau
          // est rechargé, le prix est recalculé depuis la courbe courante.
          existing.level.set(Math.min(saved.quantity, existing.maxLevel));
          existing.price.set(this.priceAtLevel(existing, existing.level()));
          existing.unlocked = saved.unlocked;

          // Restaurer les upgrades
          if (saved.upgrades && existing.upgrades) {
            for (const savedUpgrade of saved.upgrades) {
              const existingUpgrade = existing.upgrades.find(u => u.id === savedUpgrade.id);
              if (existingUpgrade) {
                existingUpgrade.unlocked = savedUpgrade.unlocked;
                existingUpgrade.purchases =
                  savedUpgrade.purchases ?? (savedUpgrade.unlocked ? 1 : 0);
              }
            }
          }
        }
    }
    this.items.set(items);
  }

  restoreCountersFromSave(counters: {finalMultiplier?: number, clickMultiplier?: number, priceReduction?: number}){
    if(!counters){ return;}
    if(counters['finalMultiplier']){
      this.finalMultiplier.set(counters['finalMultiplier']);
    }
    if(counters['clickMultiplier']){
      this.clickMultiplier.set(counters['clickMultiplier']);
      this.auraService.defineClickValue(this.clickMultiplier());
    }
    if(counters['priceReduction']){
      this.priceReduction.set(counters['priceReduction']);
    }
  }

  restoreMoyaiUpgradesFromSave(savedUpgrades: MoyaiUpgradeSave[]){
    if(!savedUpgrades){ return;}
    const upgrades = this.moyaiUpgrades();
    for(const saved of savedUpgrades){
      const existing = upgrades.find(u => u.id === saved.id);
      if(existing){
        existing.unlocked = saved.unlocked;

        for(const savedUpgrade of saved.upgrades ?? []){
          const existingUpgrade = existing.upgrades?.find(u => u.id === savedUpgrade.id);
          if(existingUpgrade){
            existingUpgrade.unlocked = savedUpgrade.unlocked;
            existingUpgrade.purchases =
              savedUpgrade.purchases ?? (savedUpgrade.unlocked ? 1 : 0);
          }
        }
      }
    }
    this.moyaiUpgrades.set([...upgrades]);
  }

  /**
   * Achat d'une pièce d'outfit. La vérification du prix vivait dans le
   * composant : la ramener ici évite qu'un second appelant l'oublie.
   */
  buyMoyaiUpgrade(index: number): void {
    const piece = this.moyaiUpgrades()[index];
    if (!piece || piece.unlocked) return;
    if (this.auraService.auraCount() < piece.price) return;

    this.auraService.auraCount.update(c => c - piece.price);
    this.unlockMoyaiUpgrade(index);
  }

  /** Achat d'une amélioration de pièce d'outfit, sur le modèle des articles. */
  buyOutfitUpgrade(pieceIndex: number, upgradeId: number): void {
    const piece = this.moyaiUpgrades()[pieceIndex];
    if (!piece?.unlocked || !piece.upgrades) return;

    const upgrade = piece.upgrades.find(u => u.id === upgradeId);
    if (!upgrade || this.isUpgradeMaxed(upgrade)) return;
    if (!this.isUpgradeAvailable(piece.upgrades, upgrade)) return;

    const price = this.upgradePrice(upgrade);
    if (this.auraService.auraCount() < price) return;

    this.auraService.auraCount.update(c => c - price);
    upgrade.purchases = this.upgradePurchases(upgrade) + 1;
    upgrade.unlocked = true;
    this.applyEffect(upgrade.effect);
    this.moyaiUpgrades.set([...this.moyaiUpgrades()]);
  }

  /** Compétences portées à leur plafond, pour les succès. */
  maxedSkillCount(): number {
    return this.items().filter(item => this.isMaxed(item)).length;
  }

  unlockMoyaiUpgrade(index: number) {
    this.applyEffect(this.moyaiUpgrades()[index].effect);
    this.moyaiUpgrades()[index].unlocked = true;
  }

  /**
   * Améliorations dont dépend celle-ci. Sans `requires` explicite, chaque
   * amélioration ouvre la suivante : la liste forme une chaîne.
   */
  upgradeRequirements(list: ItemUpgrade[], upgrade: ItemUpgrade): ItemUpgrade[] {
    if (upgrade.requires) {
      return list.filter(candidate => upgrade.requires!.includes(candidate.id));
    }
    const index = list.indexOf(upgrade);
    return index > 0 ? [list[index - 1]] : [];
  }

  /** Vrai quand tous les prérequis sont acquis. */
  isUpgradeAvailable(list: ItemUpgrade[], upgrade: ItemUpgrade): boolean {
    return this.upgradeRequirements(list, upgrade).every(required => required.unlocked);
  }

  /**
   * Avancement de la boutique, en niveaux et non en objets : un article
   * compte pour ses vingt-cinq niveaux, une amélioration pour ses cinq
   * exemplaires.
   */
  progress(): { owned: number; total: number } {
    let owned = 0;
    let total = 0;

    for (const item of this.items()) {
      owned += item.level();
      total += item.maxLevel;
      for (const upgrade of item.upgrades ?? []) {
        owned += this.upgradePurchases(upgrade);
        total += this.upgradeMaxPurchases(upgrade);
      }
    }

    return { owned, total };
  }

  unlockUpgrade(itemId: number, upgradeId: number) {
    const item = this.items().find(i => i.id === itemId);
    if(!item || !item.upgrades){ return; }
    const upgrade = item.upgrades.find(u => u.id === upgradeId);
    if(!upgrade){ return; }
    if(this.isUpgradeMaxed(upgrade)){ return; }
    if(!this.isUpgradeAvailable(item.upgrades, upgrade)){ return; }

    const price = this.upgradePrice(upgrade);
    if(this.auraService.auraCount() < price){ return; }

    this.auraService.auraCount.update(c => c - price);
    // Chaque exemplaire applique l'effet à nouveau : cinq achats valent cinq
    // fois le bonus.
    upgrade.purchases = this.upgradePurchases(upgrade) + 1;
    upgrade.unlocked = true;
    this.applyEffect(upgrade.effect);
  }

  applyEffect(effect: Effect) {
    switch(effect.type){
      case UpgradeType.MULTIPLIER:
        // Si targetItemId est défini, c'est un boost d'item spécifique
        if(effect.targetItemId){
          const items = this.items();
          for(const id of effect.targetItemId){
            const item = items.find(i => i.id === id);
            if(item){
              item.value.update(v => Number((v * (1 + effect.value)).toFixed(2)));
            }
          }
          this.items.set([...items]);
        } else {
          // Sinon c'est un multiplicateur global
          this.finalMultiplier.set(Number((this.finalMultiplier() * (1 + effect.value)).toFixed(2)));
        }
        break;
      case UpgradeType.CLICK:
        this.clickMultiplier.set(Number((this.clickMultiplier() * (1 + effect.value)).toFixed(2)));
        this.auraService.defineClickValue(this.clickMultiplier());
        break;
      case UpgradeType.PRICE_REDUCTION:
        this.priceReduction.set(Number((this.priceReduction() * (1 + effect.value)).toFixed(2)));
        break;
      case UpgradeType.ITEM_BOOST:
        if(effect.targetItemId){
          const items = this.items();
          for(const id of effect.targetItemId){
            const item = items.find(i => i.id === id);
            if(item){
              item.value.update(v => Number((v * (1 + effect.value)).toFixed(2)));
            }
          }
          // Forcer la mise à jour du signal items
          this.items.set([...items]);
        }
        break;
    }
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
  }
}
export { UpgradeType };

