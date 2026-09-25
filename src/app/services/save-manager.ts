import { Injectable } from '@angular/core';
import { ItemSave } from './shop-manager';
import { MoyaiUpgradeSave } from '../components/aura-btn/aura-btn';
import { SettingsConfig } from './settings-manager';
import { AchievementSave } from './achievements-manager';

export interface SaveData {
  /** Écrite en chaîne (« 1.23e+420 ») : au-delà d'un flottant, un nombre ne
   *  suffit plus. Les anciennes parties en portent un, que `Decimal` relit. */
  auraCount: number | string;
  allTimeAura: number | string;
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
  Collection = "AURA_FARMER_COLLECTION",
  Battles = "AURA_FARMER_BATTLES",
  Onboarding = "AURA_FARMER_ONBOARDING",
  Consumables = "AURA_FARMER_CONSUMABLES",
  Store = "AURA_FARMER_STORE",
  Casino = "AURA_FARMER_CASINO",
  Calls = "AURA_FARMER_CALLS",
  Quests = "AURA_FARMER_QUESTS"
}

@Injectable({
  providedIn: 'root'
})
export class SaveManager {
  /** Vrai une fois gelée : plus aucune écriture jusqu'au rechargement. */
  private frozen = false;

  /**
   * Coupe toute écriture. Sert à l'import d'une partie, qui recharge la page
   * juste après : sans ce gel, la sauvegarde automatique pouvait réécrire
   * l'ancienne partie par-dessus celle qu'on vient d'importer.
   */
  freeze(): void {
    this.frozen = true;
  }

  // Le type reste ouvert : ce service ne fait que sérialiser sous une clé, et
  // l'énumérer figerait la liste de ce qu'on a le droit de conserver.
  saveProgress(key: string, data: unknown): void {
    if (this.frozen) return;
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
