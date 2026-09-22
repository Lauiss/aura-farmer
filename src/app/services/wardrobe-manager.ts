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

  private readonly worn = signal<Set<CosmeticId>>(new Set());

  constructor() {
    const saved: CosmeticId[] | null = this.saveManager.loadProgress(SaveLocation.Wardrobe);
    if (saved) this.worn.set(new Set(saved));
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
    const worn = this.worn();
    return this.unlocked().filter(id => worn.has(id));
  });

  /** La garde-robe n'apparaît qu'une fois un premier accessoire acquis. */
  readonly hasAny = computed(() => this.unlocked().length > 0);

  isWorn(id: CosmeticId): boolean {
    return this.worn().has(id);
  }

  toggle(id: CosmeticId): void {
    const next = new Set(this.worn());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.worn.set(next);
    this.saveManager.saveProgress(SaveLocation.Wardrobe, [...next]);
  }
}
