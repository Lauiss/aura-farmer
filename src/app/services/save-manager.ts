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
  Settings = "AURA_FARMER_SETTINGS",
  Wardrobe = "AURA_FARMER_WARDROBE",
  Backgrounds = "AURA_FARMER_BACKGROUNDS",
  Utilities = "AURA_FARMER_UTILITIES",
  Collection = "AURA_FARMER_COLLECTION"
}

@Injectable({
  providedIn: 'root'
})
export class SaveManager {
  // Le type reste ouvert : ce service ne fait que sérialiser sous une clé, et
  // l'énumérer figerait la liste de ce qu'on a le droit de conserver.
  saveProgress(key: string, data: unknown): void {
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
