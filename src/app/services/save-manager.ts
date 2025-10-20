import { Injectable } from '@angular/core';
import { ItemSave } from './shop-manager';

export interface SaveData {
  auraCount: number;
  allTimeAura: number;
  shopItems: ItemSave[];
}

@Injectable({
  providedIn: 'root'
})
export class SaveManager {
  saveProgress(key: string, data: SaveData): void {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(key, json);
    } catch (e) {
      console.error('Erreur lors de la sauvegarde:', e);
    }
  }

  loadProgress<T>(key: string): SaveData | null {
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
