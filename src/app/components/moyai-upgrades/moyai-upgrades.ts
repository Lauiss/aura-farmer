import { Component, forwardRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { moyaiUpgrades } from '../../../assets/static/moyai-upgrades';
import { MoyaiUpgrades } from '../aura-btn/aura-btn';
import { AuraManager } from '../../services/aura-manager';
import { ShopManager } from '../../services/shop-manager';
import { TranslatePipe } from '@ngx-translate/core';
import { FormatAuraPipe } from '../../pages/game-page/game-page';
import { ActionBtn } from "../action-btn/action-btn";

@Component({
  selector: 'app-moyai-upgrades',
  imports: [TranslatePipe, forwardRef(() => FormatAuraPipe), ActionBtn],
  templateUrl: './moyai-upgrades.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './moyai-upgrades.scss'
})
export class MoyaiUpgradesShop {
  private auraManager = inject(AuraManager);
  private shopManager = inject(ShopManager);
  moyaiUpgrades = signal<MoyaiUpgrades[]>(moyaiUpgrades);

  buyUnlock(index: number) {
    this.shopManager.buyMoyaiUpgrade(index);
  }
}
