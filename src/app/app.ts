import { Component, inject, signal, WritableSignal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuraBtn } from './components/aura-btn/aura-btn';
import { interval } from 'rxjs';
import { AuraManager } from './services/aura-manager';
import { ShopManager } from './services/shop-manager';
import { ShopList } from './components/shop-list/shop-list';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AuraBtn, ShopList],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly auraManager = inject(AuraManager);
  protected readonly shopManager = inject(ShopManager);
  protected readonly title = signal('aura_farmer');

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
