import { Injectable, computed, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';
import { SaveLocation, SaveManager } from './save-manager';

export type UtilityId = 'trickshot';

export interface UtilityDefinition {
  id: UtilityId;
  price: number;
  /** Probabilité de déclenchement à chaque clic. */
  chance: number;
}

export const UTILITIES: readonly UtilityDefinition[] = [
  { id: 'trickshot', price: 5000000, chance: 0.03 }
];

/**
 * Utilitaires : des achats ponctuels qui ajoutent une mécanique plutôt qu'un
 * bonus continu. Le trickshot, seul pour l'instant, se déclenche rarement au
 * clic et fait s'envoler le multiplicateur quand il part.
 */
@Injectable({
  providedIn: 'root'
})
export class UtilityManager {

  readonly catalogue = UTILITIES;

  private readonly auraManager = inject(AuraManager);
  private readonly saveManager = inject(SaveManager);

  private readonly ownedIds = signal<Set<UtilityId>>(new Set());

  constructor() {
    const saved: UtilityId[] | null = this.saveManager.loadProgress(SaveLocation.Utilities);
    if (saved) this.ownedIds.set(new Set(saved));
  }

  readonly owned = computed<UtilityId[]>(() => [...this.ownedIds()]);

  isOwned(id: UtilityId): boolean {
    return this.ownedIds().has(id);
  }

  definition(id: UtilityId): UtilityDefinition {
    return UTILITIES.find(utility => utility.id === id)!;
  }

  buy(id: UtilityId): boolean {
    if (this.isOwned(id)) return false;

    const price = this.definition(id).price;
    if (this.auraManager.auraCount() < price) return false;

    this.auraManager.auraCount.update(aura => aura - price);
    this.ownedIds.update(owned => new Set(owned).add(id));
    this.saveManager.saveProgress(SaveLocation.Utilities, [...this.ownedIds()]);
    return true;
  }

  /** Tire au sort le déclenchement du trickshot, si on le possède. */
  rollTrickshot(): boolean {
    if (!this.isOwned('trickshot')) return false;
    return Math.random() < this.definition('trickshot').chance;
  }
}
