import { Injectable } from '@angular/core';
import { createArrow } from '../three/models/arrow';
import { createGear } from '../three/models/gear';
import { createMoyai } from '../three/models/moyai';
import { createQuestionMark } from '../three/models/question-mark';
import { createBuilding } from '../three/models/building';
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
    gear: 'assets/imgs/upgrades/upgrade_generic.png',
    shop: 'assets/imgs/upgrades/monetize_aura.png',
    moyai: 'assets/imgs/moyai/moyai_base.png',
    question: 'assets/imgs/upgrades/unknown_upgrade.png',
    arrow: 'assets/imgs/upgrades/upgrade_generic.png'
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

  /** Bâtiment, pour l'accès à la boutique. */
  shop(): string {
    return this.render('shop', () =>
      renderToDataUrl(createBuilding(), { size: 192, distance: 5.4, rotation: [0.22, 0.6, 0] })
    );
  }

  /** Tête de moyai, pour les articles de la boutique. */
  moyai(): string {
    return this.render('moyai', () =>
      renderToDataUrl(createMoyai(), { size: 192, distance: 5.4, rotation: [0.06, 0.5, 0] })
    );
  }

  /** Point d'interrogation, pour ce qui n'est pas encore dévoilé. */
  question(): string {
    return this.render('question', () =>
      renderToDataUrl(createQuestionMark(), { size: 192, distance: 4.6, rotation: [0.1, 0.35, 0] })
    );
  }

  /** Flèche verte, pour les améliorations. */
  arrow(): string {
    return this.render('arrow', () =>
      renderToDataUrl(createArrow(), { size: 192, distance: 4.6, rotation: [0.12, 0.4, 0] })
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
