import { Injectable } from '@angular/core';
import { createGear } from '../three/models/gear';
import { createTrophy } from '../three/models/trophy';
import { renderToDataUrl } from '../three/snapshot';

/**
 * Rend les modèles 3D utilisés comme icônes, une seule fois chacun, et
 * conserve le résultat. Voir `three/snapshot.ts` pour la raison du passage par
 * une image plutôt que par un canvas vivant.
 */
@Injectable({
  providedIn: 'root'
})
export class ModelIcons {

  /** Images conservées si le rendu 3D n'est pas possible, faute de WebGL. */
  private static readonly FALLBACK: Record<string, string> = {
    'trophy-true': 'assets/imgs/achievements/trophy_achievement.png',
    'trophy-false': 'assets/imgs/achievements/locked_achievement.png',
    gear: 'assets/imgs/upgrades/upgrade_generic.png'
  };

  private cache = new Map<string, string>();

  /** Trophée ambré si le succès est débloqué, gris sinon. */
  trophy(unlocked: boolean): string {
    return this.render(`trophy-${unlocked}`, () =>
      renderToDataUrl(createTrophy({ unlocked }), { size: 192, distance: 3.6 })
    );
  }

  /** Engrenage, vu de face. */
  gear(): string {
    return this.render('gear', () =>
      renderToDataUrl(createGear(), { size: 192, distance: 3.9, rotation: [0.25, 0.3, 0.1] })
    );
  }

  private render(key: string, draw: () => string): string {
    const cached = this.cache.get(key);
    if (cached) return cached;

    let icon: string;
    try {
      icon = draw();
    } catch {
      icon = ModelIcons.FALLBACK[key];
    }
    this.cache.set(key, icon);
    return icon;
  }
}
