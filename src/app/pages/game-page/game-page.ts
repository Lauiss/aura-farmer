import { Component, signal } from '@angular/core';
import { inject } from '@angular/core/primitives/di';
import { AuraManager } from '../../services/aura-manager';
import { ShopManager } from '../../services/shop-manager';
import { interval } from 'rxjs';
import { AuraBtn } from "../../components/aura-btn/aura-btn";
import { ShopList } from "../../components/shop-list/shop-list";

@Component({
  standalone: true,
  selector: 'app-game-page',
  templateUrl: './game-page.html',
  styleUrls: ['./game-page.scss'],
  imports: [AuraBtn, ShopList]
})
export class GamePage {

  constructor(
    protected readonly auraManager: AuraManager,
    protected readonly shopManager: ShopManager
  ) {}

  ngOnInit() {
    this.startAuraGain();
  }

  protected increment() {
    this.auraManager.increment();
  }



  startAuraGain() {
    interval(100).subscribe(() => {
      if(this.shopManager.getTotalValue() > 0){
        this.auraManager.auraCount.update(current => current + this.shopManager.getTotalValue());
      }
    });
  }
}
