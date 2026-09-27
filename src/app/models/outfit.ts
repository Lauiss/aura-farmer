import { WritableSignal } from '@angular/core';
import { ItemUpgrade, UpgradeType } from '../services/shop-manager';

/**
 * Le modèle de données des pièces d'outfit du moyai.
 *
 * Ces types vivaient dans le composant `aura-btn`, qui était l'ancien écran de
 * boutique en 2D. Le composant a disparu avec le passage à la carte, mais ses
 * interfaces servaient encore à `ShopManager` et `SaveManager` : elles sont
 * ici, à côté du reste du modèle, plutôt que dans une vue supprimée.
 */

export interface Effect {
  type: UpgradeType;
  value: number;
  targetItemId?: number[];
}

export interface MoyaiUpgrades {
  id: number;
  name: string;
  description: string;
  price: number;
  unlocked: boolean;
  effect: Effect;
  displayCondition: WritableSignal<boolean>;
  /** Améliorations propres à la pièce, sur le même modèle que les articles. */
  upgrades?: ItemUpgrade[];
}

export interface MoyaiUpgradeSave {
  id: number;
  unlocked: boolean;
  upgrades?: { id: number; unlocked: boolean; purchases?: number }[];
}
