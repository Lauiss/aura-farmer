import { Injectable, computed, inject, signal } from '@angular/core';
import { CosmeticId, MODELLED_COSMETICS } from '../three/models/cosmetics';
import { ShopManager } from './shop-manager';
import { SaveLocation, SaveManager } from './save-manager';

/**
 * Garde-robe du moyai : quels accessoires sont acquis, et lesquels le joueur
 * choisit de porter.
 *
 * L'acquisition vient des améliorations du moyai ; le port est un simple
 * réglage d'affichage, conservé à part de la sauvegarde de progression.
 */
@Injectable({
  providedIn: 'root'
})
export class WardrobeManager {

  private readonly shopManager = inject(ShopManager);
  private readonly saveManager = inject(SaveManager);

  /**
   * Pièces que le joueur a explicitement retirées.
   *
   * C'est le retrait qui est mémorisé, pas le port : une pièce fraîchement
   * achetée doit apparaître sur la statue sans qu'on ait à l'activer.
   */
  private readonly removed = signal<Set<CosmeticId>>(new Set());

  constructor() {
    const saved: CosmeticId[] | null = this.saveManager.loadProgress(SaveLocation.Wardrobe);
    if (saved) this.removed.set(new Set(saved));
  }

  /**
   * Accessoires acquis et modélisés. Le smoking et la cravate en sont exclus :
   * la statue s'arrête sous la mâchoire, ils n'auraient rien à habiller.
   */
  readonly unlocked = computed<CosmeticId[]>(() =>
    this.shopManager
      .moyaiUpgrades()
      .filter(upgrade => upgrade.unlocked)
      .map(upgrade => upgrade.name as CosmeticId)
      .filter(id => MODELLED_COSMETICS.includes(id))
  );

  /** Accessoires effectivement portés, donc affichés sur la statue. */
  readonly equipped = computed<CosmeticId[]>(() => {
    const removed = this.removed();
    return this.unlocked().filter(id => !removed.has(id));
  });

  /** La garde-robe n'apparaît qu'une fois un premier accessoire acquis. */
  readonly hasAny = computed(() => this.unlocked().length > 0);

  isWorn(id: CosmeticId): boolean {
    return !this.removed().has(id);
  }

  toggle(id: CosmeticId): void {
    const next = new Set(this.removed());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.removed.set(next);
    this.saveManager.saveProgress(SaveLocation.Wardrobe, [...next]);
  }
}
