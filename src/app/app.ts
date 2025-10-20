import { Component, inject, signal, WritableSignal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuraBtn } from './components/aura-btn/aura-btn';
import { interval } from 'rxjs';
import { AuraManager } from './services/aura-manager';
import { ShopManager } from './services/shop-manager';
import { ShopList } from './components/shop-list/shop-list';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

}
