import { Component, computed, forwardRef, inject, input } from '@angular/core';
import { Upgrade } from '../../services/game-manager';
import { ModalManager } from '../../services/modal-manager';
import { ShopManager } from '../../services/shop-manager';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionBtn } from '../action-btn/action-btn';
import { FormatAuraPipe } from '../../pages/game-page/game-page';

@Component({
  selector: 'app-item-upgrades',
  imports: [TranslatePipe, ActionBtn, forwardRef(() => FormatAuraPipe)],
  templateUrl: './item-upgrades.html',
  styleUrl: './item-upgrades.scss'
})
export class ItemUpgradesShop {

  modalManager = inject(ModalManager);
  shopManager = inject(ShopManager);

  upgrades = computed(() => {
    console.log('upgrades', this.modalManager.modalData()?.data?.upgrades)
    return this.modalManager.modalData()?.data?.upgrades;
  });

  itemId = computed(() => {
    console.log('upgrades', this.modalManager.modalData()?.data?.itemId)
    return this.modalManager.modalData()?.data?.itemId;
  })

  buyUpgrade(upgrade: Upgrade) {
    this.shopManager.unlockUpgrade(this.itemId(), upgrade.id);
  }
}
