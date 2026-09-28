import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CollectionManager } from '../../services/collection-manager';
import { ModalManager } from '../../services/modal-manager';
import { ModelIcons } from '../../services/model-icons';
import { Sound, SoundManager } from '../../services/sound-manager';
import { ChestDefinition, ChestTier, chestDefinition } from '../../../assets/static/collectibles';

/** Coffres achetables d'un coup au maximum. */
const MAX_BATCH = 50;

/**
 * Combien de coffres acheter.
 *
 * Les coffres se prenaient un par un, chacun ouvrant aussitôt sa modale
 * d'ouverture : constituer une réserve d'une vingtaine demandait vingt
 * allers-retours et vingt animations. Le curseur les prend d'un coup, et
 * « tout ouvrir » existait déjà pour la suite.
 *
 * Le curseur s'arrête à ce qu'on peut **payer** et non à un maximum théorique :
 * on ne fait pas glisser un réglage vers une valeur qui sera refusée.
 */
@Component({
  selector: 'app-chest-quantity',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './chest-quantity.html',
  styleUrl: './chest-quantity.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChestQuantity {

  private readonly modalManager = inject(ModalManager);
  private readonly soundManager = inject(SoundManager);
  private readonly modelIcons = inject(ModelIcons);
  readonly collection = inject(CollectionManager);

  /** Lu une fois : une modale empilée par-dessus changerait `modalData`. */
  readonly tier: ChestTier = this.modalManager.modalData()?.tier ?? 'basic';
  readonly chest: ChestDefinition = chestDefinition(this.tier);
  readonly icon = this.modelIcons.chest(this.tier);
  readonly unitPrice = this.chest.price ?? 0;

  /** Ce qu'on peut s'offrir à l'instant, jamais moins de 1 ni plus du lot. */
  readonly affordable = computed(() => {
    if (this.unitPrice <= 0) return MAX_BATCH;
    return Math.max(1, Math.min(MAX_BATCH, Math.floor(this.collection.gems() / this.unitPrice)));
  });

  readonly quantity = signal(1);

  /**
   * La quantité ne dépasse jamais ce qu'on peut payer. Le curseur étant borné,
   * seule une dépense faite ailleurs pendant que la modale est ouverte peut
   * faire descendre le plafond sous la valeur choisie.
   */
  readonly chosen = computed(() => Math.min(this.quantity(), this.affordable()));
  readonly total = computed(() => this.chosen() * this.unitPrice);
  readonly canBuy = computed(() => this.collection.gems() >= this.total());

  onSlide(event: Event): void {
    this.quantity.set(Number((event.target as HTMLInputElement).value));
  }

  /** Les paliers ronds : un raccourci vaut mieux que viser au curseur. */
  readonly steps = computed(() => {
    const max = this.affordable();
    return [1, 5, 10, 25, MAX_BATCH].filter(step => step <= max);
  });

  setQuantity(value: number): void {
    this.quantity.set(value);
    this.soundManager.playFX(Sound.Plop);
  }

  max(): void {
    this.setQuantity(this.affordable());
  }

  confirm(): void {
    const wanted = this.chosen();
    let bought = 0;
    // `buyChest` revérifie le solde à chaque exemplaire : on s'arrête net s'il
    // manque de quoi, plutôt que de débiter à découvert.
    for (let i = 0; i < wanted; i++) {
      if (!this.collection.buyChest(this.tier)) break;
      bought++;
    }
    if (bought > 0) this.soundManager.playFX(Sound.Buy);
    this.modalManager.close();
  }

  cancel(): void {
    this.soundManager.playFX(Sound.Plop);
    this.modalManager.close();
  }
}
