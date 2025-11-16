import { Component, inject, signal } from '@angular/core';
import { Item, ShopManager } from '../../services/shop-manager';
import { CommonModule } from '@angular/common';
import { AuraManager } from '../../services/aura-manager';
import { ActionBtn } from "../action-btn/action-btn";
import { Sound, SoundManager } from '../../services/sound-manager';
import { ModalManager } from '../../services/modal-manager';
import { Settings } from '../settings/settings';

@Component({
  selector: 'app-shop-list',
  imports: [CommonModule, ActionBtn],
  templateUrl: './shop-list.html',
  styleUrl: './shop-list.scss'
})
export class ShopList {
  protected readonly shopManager = inject(ShopManager);
  public readonly auraManager = inject(AuraManager);
  public readonly soundManager = inject(SoundManager);
  private readonly modalManager = inject(ModalManager);
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

  buyUnlock(index: number) {
    if( this.auraManager.auraCount() >= this.shopManager.moyaiUpgrades()[index].price){
    this.shopManager.unlockMoyaiUpgrade(index);
    }
  }
}
