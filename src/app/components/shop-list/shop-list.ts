import { Component, forwardRef, inject, signal } from '@angular/core';
import { Item, ShopManager } from '../../services/shop-manager';
import { CommonModule } from '@angular/common';
import { AuraManager } from '../../services/aura-manager';
import { ActionBtn } from "../action-btn/action-btn";
import { Sound, SoundManager } from '../../services/sound-manager';
import { ModalManager } from '../../services/modal-manager';
import { Settings } from '../settings/settings';
import { TranslatePipe } from '@ngx-translate/core';
import { MoyaiUpgradesShop } from '../moyai-upgrades/moyai-upgrades';
import { FormatAuraPipe } from '../../pages/game-page/game-page';
import { ItemUpgradesShop } from '../item-upgrades/item-upgrades';

@Component({
  selector: 'app-shop-list',
  imports: [CommonModule, ActionBtn, TranslatePipe, forwardRef(() => FormatAuraPipe)],
  templateUrl: './shop-list.html',
  styleUrl: './shop-list.scss'
})
export class ShopList {
  protected readonly shopManager = inject(ShopManager);
  public readonly auraManager = inject(AuraManager);
  public readonly soundManager = inject(SoundManager);
  private readonly modalManager = inject(ModalManager);

  unlockUpgrades = 1000000;


  public readonly shopItems: Item[] = this.shopManager.getAllItems();
  buyAmount = signal<'1' | '10' | '100' | 'MAX'>('1');
  buyAmountNumber = signal<number>(1);

  buyItem(itemId: number): void {
    this.shopManager.buyItem(itemId, this.buyAmount());
    this.soundManager.playFX(Sound.Buy);
  }

  cycleBuyAmount() {
  const order: ('1' | '10' | '100' | 'MAX')[] = ['1', '10', '100', 'MAX'];
  const currentIndex = order.indexOf(this.buyAmount());
  const nextIndex = (currentIndex + 1) % order.length;
  this.buyAmount.set(order[nextIndex]);
}

  numberFromBuyAmount(item: Item): number {
    return this.shopManager.getAmountToBuy(this.buyAmount(), item);
  }

  openSettingsModal(){
    this.modalManager.open(Settings);
  }

  openMoyaiUpgradesModal() {
    this.modalManager.open(MoyaiUpgradesShop);
  }

  openItemUpgradesModal(item: Item) {
    this.modalManager.open(ItemUpgradesShop, { data: item});
  }
}
