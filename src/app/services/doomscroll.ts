import { Injectable, inject } from '@angular/core';
import { AuraManager } from './aura-manager';
import { ShopManager } from './shop-manager';
import { SpinCombo } from './spin-combo';
import { UtilityManager } from './utility-manager';
import { CollectionManager } from './collection-manager';
import { ModalManager } from './modal-manager';
import { ChestOpening } from '../components/chest-opening/chest-opening';

/** Nature d'une publication, connue dès qu'elle entre à l'écran. */
export type PostKind = 'good' | 'bad' | 'chest';

export interface DoomscrollOutcome {
  kind: PostKind;
  /** Aura gagnée, ou perdue si négatif ; 0 pour un coffre. */
  amount: number;
}

/**
 * Doomscrolling : chaque publication parcourue sur le téléphone fait gagner
 * ou perdre de l'aura, et nourrit le combo. De loin en loin, une publication
 * dorée fait tomber un coffre.
 *
 * Le tirage est en deux temps : `roll()` décide de la nature d'une
 * publication dès qu'elle apparaît, pour que l'écran l'affiche en vert, en
 * rouge ou en or sans ambiguïté ; `resolve()` l'applique quand elle occupe
 * tout l'écran.
 */
@Injectable({
  providedIn: 'root'
})
export class Doomscroll {

  private readonly auraManager = inject(AuraManager);
  private readonly shopManager = inject(ShopManager);
  private readonly utilityManager = inject(UtilityManager);
  private readonly spinCombo = inject(SpinCombo);
  private readonly collection = inject(CollectionManager);
  private readonly modalManager = inject(ModalManager);

  /** Une perte pèse un peu moins qu'un gain : l'espérance reste positive. */
  private static readonly LOSS_SHARE = 0.6;

  roll(): PostKind {
    if (Math.random() < this.utilityManager.chestChance()) return 'chest';
    return Math.random() < this.utilityManager.doomscrollLuck() ? 'good' : 'bad';
  }

  /**
   * Applique une publication. Le montant suit la progression — le plus fort
   * du clic ou de la production — pour que le téléphone reste intéressant du
   * début à la fin.
   */
  resolve(kind: PostKind): DoomscrollOutcome {
    this.spinCombo.boost(this.utilityManager.doomscrollCombo());

    if (kind === 'chest') {
      this.collection.addChest('doomscroll');
      // Une seule modale d'ouverture à la fois : les coffres suivants
      // attendent dans l'inventaire, où elle les enchaîne.
      const alreadyOpen = this.modalManager.entries().some(entry => entry.component === ChestOpening);
      if (!alreadyOpen) this.modalManager.open(ChestOpening, { tier: 'doomscroll' });
      return { kind, amount: 0 };
    }

    const stake =
      Math.max(this.shopManager.clickValue() * 4, this.shopManager.production() * 1.5) *
      this.utilityManager.doomscrollPayout();

    // Jamais sous zéro : une mauvaise série vide le compte sans le creuser.
    const amount =
      kind === 'good'
        ? stake * this.spinCombo.current()
        : -Math.min(stake * Doomscroll.LOSS_SHARE, Math.max(0, this.auraManager.auraCount()));

    this.auraManager.gain(amount);
    return { kind, amount };
  }
}
