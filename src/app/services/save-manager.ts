import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SaveManager {
  saveProgress(key: string, data: any): void {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(key, json);
    } catch (e) {
      console.error('Erreur lors de la sauvegarde:', e);
    }
  }

  loadProgress<T>(key: string): T | null {
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
