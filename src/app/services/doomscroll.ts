import { Injectable, inject } from '@angular/core';
import { AuraManager } from './aura-manager';
import { ShopManager } from './shop-manager';
import { SpinCombo } from './spin-combo';
import { UtilityManager } from './utility-manager';
import { CollectionManager } from './collection-manager';
import { ModalManager } from './modal-manager';
import { ChestOpening } from '../components/chest-opening/chest-opening';
import { IncomingCall } from '../components/incoming-call/incoming-call';
import { StoreManager } from './store-manager';
import { CallManager } from './call-manager';

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
  private readonly store = inject(StoreManager);
  private readonly calls = inject(CallManager);

  /** Une perte pèse un peu moins qu'un gain : l'espérance reste positive. */
  private static readonly LOSS_SHARE = 0.6;
  /** Plancher de la mise, pour que les premières publications comptent. */
  private static readonly MIN_STAKE = 10;

  roll(): PostKind {
    if (Math.random() < this.utilityManager.chestChance()) return 'chest';
    return Math.random() < this.utilityManager.doomscrollLuck() ? 'good' : 'bad';
  }

  /**
   * Applique une publication. Le montant suit la production, pour que le
   * téléphone reste intéressant du début à la fin.
   *
   * La mise valait 1,5 s de production : à deux publications par seconde, le
   * téléphone pesait 40 % des revenus et le milieu de partie se passait à
   * acheter sans attendre. Ramenée à 0,6 s, il en pèse autour de 15 %
   * (simulation d'un joueur glouton). Elle ne suit plus le clic : celui-ci
   * porte le multiplicateur de clic, et la mise réelle montait à plusieurs
   * secondes de production.
   */
  resolve(kind: PostKind): DoomscrollOutcome {
    this.spinCombo.boost(this.utilityManager.doomscrollCombo());
    this.maybeCall();

    if (kind === 'chest') {
      const waiting = this.collection.chestCount('doomscroll');
      this.collection.addChest('doomscroll');

      // La modale ne s'ouvre que pour le **premier** coffre : au-delà, elle
      // coupait la partie en plein milieu pour annoncer ce qu'on savait déjà.
      // Les suivants s'empilent dans l'inventaire, où l'on choisit son moment
      // — et où l'on peut tout ouvrir d'un coup.
      const alreadyOpen = this.modalManager.entries().some(entry => entry.component === ChestOpening);
      if (!alreadyOpen && waiting === 0) {
        this.modalManager.open(ChestOpening, { tier: 'doomscroll' });
      }
      return { kind, amount: 0 };
    }

    const stake =
      Math.max(Doomscroll.MIN_STAKE, this.shopManager.production() * 0.6) *
      this.utilityManager.doomscrollPayout() *
      // Les compagnons équipés d'un téléphone scrollent avec le joueur.
      this.store.phonePayout();

    // Jamais sous zéro : une mauvaise série vide le compte sans le creuser.
    const amount =
      kind === 'good'
        ? stake * this.spinCombo.current()
        // `toNumber()` rend `Infinity` pour une aura hors de portée d'un
        // flottant, ce qui est exactement le comportement voulu ici : la perte
        // reste alors plafonnée par la mise.
        : -Math.min(stake * Doomscroll.LOSS_SHARE, Math.max(0, this.auraManager.auraCount().toNumber()));

    this.auraManager.gain(amount);
    return { kind, amount };
  }

  /**
   * De loin en loin, quelqu'un appelle. C'est le fil qui ouvre la modale et non
   * [`CallManager`](./call-manager.ts) : le service est injecté par la modale,
   * l'ouvrir de là-bas refermerait un cycle d'imports.
   */
  private maybeCall(): void {
    if (!this.calls.maybeRing()) return;
    const alreadyOpen = this.modalManager.entries().some(entry => entry.component === IncomingCall);
    if (!alreadyOpen) this.modalManager.open(IncomingCall, undefined, 'sm');
  }
}
