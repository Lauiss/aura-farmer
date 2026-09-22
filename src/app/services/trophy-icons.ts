import { Injectable } from '@angular/core';
import { createTrophy } from '../three/models/trophy';
import { renderToDataUrl } from '../three/snapshot';

/**
 * Fournit les deux icônes de trophée, ambrée et grise, rendues en 3D une seule
 * fois puis réutilisées par toutes les cartes de succès.
 */
@Injectable({
  providedIn: 'root'
})
export class TrophyIcons {

  /** Image conservée si le rendu 3D n'est pas possible, faute de WebGL. */
  private static readonly FALLBACK: Record<'true' | 'false', string> = {
    true: 'assets/imgs/achievements/trophy_achievement.png',
    false: 'assets/imgs/achievements/locked_achievement.png'
  };

  private cache = new Map<boolean, string>();

  /** Data URL du trophée, ambré si le succès est débloqué, gris sinon. */
  get(unlocked: boolean): string {
    const cached = this.cache.get(unlocked);
    if (cached) return cached;

    let icon: string;
    try {
      icon = renderToDataUrl(createTrophy({ unlocked }), { size: 192, distance: 3.6 });
    } catch {
      icon = TrophyIcons.FALLBACK[unlocked ? 'true' : 'false'];
    }
    this.cache.set(unlocked, icon);
    return icon;
  }
}
