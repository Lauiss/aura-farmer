import { Component, inject, signal, WritableSignal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuraBtn } from './components/aura-btn/aura-btn';
import { interval } from 'rxjs';
import { AuraManager } from './services/aura-manager';
import { ShopManager } from './services/shop-manager';
import { ShopList } from './components/shop-list/shop-list';
import { ModalHost } from "./components/modal-host/modal-host";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ModalHost],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

}
