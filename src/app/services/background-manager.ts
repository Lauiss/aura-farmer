import { Injectable, computed, inject, signal } from '@angular/core';
import { BackgroundId, BACKGROUNDS, backgroundDefinition } from '../three/models/backgrounds';
import { AuraManager } from './aura-manager';
import { SaveLocation, SaveManager } from './save-manager';

interface BackgroundSave {
  owned: BackgroundId[];
  selected: BackgroundId | null;
}

/**
 * Décors de fond : lesquels sont acquis, et lequel est affiché.
 *
 * Le décor choisi accorde un bonus de production qui se cumule avec tout le
 * reste ; c'est ce qui donne une raison d'en changer.
 */
@Injectable({
  providedIn: 'root'
})
export class BackgroundManager {

  readonly catalogue = BACKGROUNDS;

  private readonly auraManager = inject(AuraManager);
  private readonly saveManager = inject(SaveManager);

  private readonly ownedIds = signal<Set<BackgroundId>>(new Set());
  readonly selected = signal<BackgroundId | null>(null);

  constructor() {
    const saved: BackgroundSave | null = this.saveManager.loadProgress(SaveLocation.Backgrounds);
    if (saved) {
      this.ownedIds.set(new Set(saved.owned ?? []));
      this.selected.set(saved.selected ?? null);
    }
  }

  readonly owned = computed<BackgroundId[]>(() => [...this.ownedIds()]);
  readonly hasAny = computed(() => this.ownedIds().size > 0);

  /** Bonus du décor affiché ; 1 quand aucun n'est choisi. */
  readonly bonus = computed(() => {
    const id = this.selected();
    return id ? 1 + backgroundDefinition(id).bonus : 1;
  });

  isOwned(id: BackgroundId): boolean {
    return this.ownedIds().has(id);
  }

  buy(id: BackgroundId): boolean {
    if (this.isOwned(id)) return false;

    const price = backgroundDefinition(id).price;
    if (this.auraManager.auraCount() < price) return false;

    this.auraManager.auraCount.update(aura => aura - price);
    this.ownedIds.update(owned => new Set(owned).add(id));
    // Un décor fraîchement acheté s'affiche : c'est ce qu'on vient chercher.
    this.selected.set(id);
    this.persist();
    return true;
  }

  /** Choisit un décor acquis, ou revient au fond uni avec `null`. */
  select(id: BackgroundId | null): void {
    if (id && !this.isOwned(id)) return;
    this.selected.set(id);
    this.persist();
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Backgrounds, {
      owned: [...this.ownedIds()],
      selected: this.selected()
    } satisfies BackgroundSave);
  }
}
