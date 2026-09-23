import { Injectable, effect, inject } from '@angular/core';
import { BackgroundManager } from './background-manager';
import { ShopManager } from './shop-manager';
import { WardrobeManager } from './wardrobe-manager';
import { COSMETIC_BONUS } from '../three/models/cosmetics';
import { CollectionManager } from './collection-manager';
import { ConsumableManager } from './consumable-manager';
import { StoreManager } from './store-manager';

/**
 * Relie l'apparence à la production : porter une pièce et afficher un décor
 * rapportent, ce qui donne une raison d'habiller la statue plutôt que de la
 * laisser nue.
 *
 * Le calcul vit ici et non dans `ShopManager`, qui n'a pas à connaître la
 * garde-robe ni les décors ; il ne reçoit que le facteur final.
 */
@Injectable({
  providedIn: 'root'
})
export class StyleBonus {

  private readonly shopManager = inject(ShopManager);
  private readonly wardrobe = inject(WardrobeManager);
  private readonly backgrounds = inject(BackgroundManager);
  private readonly collection = inject(CollectionManager);
  private readonly consumables = inject(ConsumableManager);
  private readonly store = inject(StoreManager);

  constructor() {
    effect(() => {
      const fromCosmetics = this.wardrobe
        .equipped()
        .reduce((total, id) => total + (COSMETIC_BONUS[id] ?? 0), 0);

      // Les statuettes de la collection comptent aussi : chacune rapporte,
      // qu'elle habille la statue ou non. Les reliques sacrées, elles, entrent
      // par un facteur à part : leur bonus se multiplie au lieu de s'ajouter.
      this.shopManager.styleBonus.set(
        (1 + fromCosmetics) *
          this.backgrounds.bonus() *
          this.collection.bonus() *
          this.collection.relicBonus() *
          // Les canettes en cours : un facteur temporaire, au même endroit que
          // les bonus permanents puisque `ShopManager` n'en attend qu'un seul.
          this.consumables.multiplier() *
          // Les compagnons posés autour de la statue.
          this.store.companionBonus()
      );
    });
  }

  /** Démarre l'observation. L'injection seule suffit, l'appel la rend explicite. */
  start(): void {
    // L'effet est déclaré dans le constructeur ; rien à faire de plus.
  }
}
