import { Component, inject } from '@angular/core';
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

  buyItem(itemId: number, amount: number): void {
    this.shopManager.buyItem(itemId, amount);
  }


}
