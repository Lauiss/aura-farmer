import { Component, computed, Pipe, PipeTransform, signal, forwardRef } from '@angular/core';
import { inject } from '@angular/core/primitives/di';
import { AuraManager } from '../../services/aura-manager';
import { ItemSave, ShopManager } from '../../services/shop-manager';
import { interval } from 'rxjs';
import { AuraBtn } from "../../components/aura-btn/aura-btn";
import { ShopList } from "../../components/shop-list/shop-list";
import { SaveData, SaveManager } from '../../services/save-manager';

@Component({
  standalone: true,
  selector: 'app-game-page',
  templateUrl: './game-page.html',
  styleUrls: ['./game-page.scss'],
  imports: [AuraBtn, ShopList, forwardRef(() => FormatAuraPipe)]
})
export class GamePage {

  saveLocation = "AURA_FARMER_SAVE";

  constructor(
    protected readonly auraManager: AuraManager,
    protected readonly shopManager: ShopManager,
    protected readonly saveManager: SaveManager
  ) {}

  ngOnInit() {
    this.loadSave();
    this.startAuraGain();
  }

  protected increment() {
    this.auraManager.increment();
  }

  startAuraGain() {
    interval(100).subscribe(() => {
      if(this.shopManager.getTotalValue() > 0){
        this.auraManager.auraCount.update(current => current + this.shopManager.getTotalValue());
        this.auraManager.allTimeAura.update(total => total + this.shopManager.getTotalValue());
      }
      this.createSave();
    });
  }

  createSave() {
    const plainItems: ItemSave[] = this.shopManager.getAllItems().map(item => ({
      id: item.id,
      value: item.value(),
      quantity: item.quantity(),
      price: item.price(),
      factor: item.factor,
      unlocked: item.unlocked
    }));

    const saveData: SaveData = {
      auraCount: parseInt(this.auraManager.auraCount().toFixed(2)),
      allTimeAura: this.auraManager.totalAllTime,
      shopItems: plainItems
    }

    this.saveManager.saveProgress(this.saveLocation,saveData);
  }

  loadSave(){
    const saveData = this.saveManager.loadProgress(this.saveLocation);
    if(!saveData){ return}

    if (saveData.auraCount) {
      this.auraManager.auraCount.set(saveData.auraCount);
    }

    if (saveData.allTimeAura) {
      this.auraManager.defineAllTimeAura(saveData.allTimeAura);
    }

    if (saveData.shopItems) {
      this.shopManager.restoreFromSave(saveData.shopItems);
    }
  }
}

  @Pipe({
    name: 'formatAura',
    standalone: true
  })
  export class FormatAuraPipe implements PipeTransform {
  transform(value: number): string {
    const absValue = Math.abs(value);

    if (absValue >= 1e12) {
      return (value / 1e12).toFixed(2).replace(/\.00$/, '') + ' T';
    } else if (absValue >= 1e9) {
      return (value / 1e9).toFixed(2).replace(/\.00$/, '') + ' B';
    } else if (absValue >= 1e6) {
      return (value / 1e6).toFixed(2).replace(/\.00$/, '') + ' M';
    } else if (absValue >= 1e3) {
      return (value / 1e3).toFixed(2).replace(/\.00$/, '') + ' k';
    } else if (absValue >= 1000) {
      return Math.round(value).toString();
    } else if (absValue >= 1) {
      return value.toFixed(2).replace(/\.00$/, '');
    } else {
      return value.toFixed(2);
    }
  }
}
