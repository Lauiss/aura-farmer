import { Component, inject } from '@angular/core';
import { Item, ShopManager } from '../../services/shop-manager';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-shop-list',
  imports: [CommonModule],
  templateUrl: './shop-list.html',
  styleUrl: './shop-list.scss'
})
export class ShopList {
  protected readonly shopManager = inject(ShopManager);
  public readonly auraManager = inject(ShopManager);
  public readonly shopItems: Item[] = this.shopManager.getAllItems();



}
