import { Component, inject, signal } from '@angular/core';
import { Item, ShopManager } from '../../services/shop-manager';
import { CommonModule } from '@angular/common';
import { AuraManager } from '../../services/aura-manager';

@Component({
  selector: 'app-shop-list',
  imports: [CommonModule],
  templateUrl: './shop-list.html',
  styleUrl: './shop-list.scss'
})
export class ShopList {
  protected readonly shopManager = inject(ShopManager);
  public readonly auraManager = inject(AuraManager);
  public readonly shopItems: Item[] = this.shopManager.getAllItems();
  buyAmount = signal<'1' | '10' | '100' | 'MAX'>('1');
  buyAmountNumber = signal<number>(1);

  buyItem(itemId: number): void {
    this.shopManager.buyItem(itemId, this.buyAmount());
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

}
