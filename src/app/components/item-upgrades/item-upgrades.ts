import { Component, computed, forwardRef, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { Upgrade } from '../../services/game-manager';
import { ModalManager } from '../../services/modal-manager';
import { ShopManager } from '../../services/shop-manager';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionBtn } from '../action-btn/action-btn';
import { FormatAuraPipe } from '../../pipes/format-aura';
import { AuraManager } from '../../services/aura-manager';

@Component({
  selector: 'app-item-upgrades',
  imports: [TranslatePipe, ActionBtn, forwardRef(() => FormatAuraPipe)],
  templateUrl: './item-upgrades.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './item-upgrades.scss'
})
export class ItemUpgradesShop {

  modalManager = inject(ModalManager);
  shopManager = inject(ShopManager);
  auraManager = inject(AuraManager);

  upgrades = computed(() => {
    return this.modalManager.modalData()?.data?.upgrades;
  });

  itemId = computed(() => {
    return this.modalManager.modalData()?.data?.itemId;
  })

  buyUpgrade(upgrade: Upgrade) {
    this.shopManager.unlockUpgrade(this.itemId(), upgrade.id);
  }
}
