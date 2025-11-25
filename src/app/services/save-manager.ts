import { Injectable } from '@angular/core';
import { ItemSave } from './shop-manager';
import { MoyaiUpgradeSave } from '../components/aura-btn/aura-btn';
import { SettingsConfig } from './settings-manager';
import { AchievementSave } from './achievements-manager';

export interface SaveData {
  auraCount: number;
  allTimeAura: number;
  shopItems: ItemSave[];
  moyaiUpgrades: MoyaiUpgradeSave[];
  counters: {};
  lastSaveTime?: number;
  achievements?: AchievementSave[];
  totalClicks?: number;
}

export enum SaveLocation {
  GameSave = "AURA_FARMER_SAVE",
  Settings = "AURA_FARMER_SETTINGS"
}

@Injectable({
  providedIn: 'root'
})
export class SaveManager {
  saveProgress(key: string, data: SaveData | SettingsConfig): void {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(key, json);
    } catch (e) {
      console.error('Erreur lors de la sauvegarde:', e);
    }
  }

  loadProgress<T>(key: string): any {
    const json = localStorage.getItem(key);
    if (json) {
      try {
        return JSON.parse(json);
      } catch (e) {
        console.error('Erreur lors du chargement:', e);
        return null;
      }
    }
    return null;
  }
}
