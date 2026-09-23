import { Injectable } from '@angular/core';
import { createArrow } from '../three/models/arrow';
import { createGear } from '../three/models/gear';
import { createHanger } from '../three/models/hanger';
import { createMoyai } from '../three/models/moyai';
import { createChest } from '../three/models/chest';
import { ChestTier, collectibleDefinition, relicDefinition } from '../../assets/static/collectibles';
import { createQuestionMark } from '../three/models/question-mark';
import { createBuilding } from '../three/models/building';
import { createTrophy } from '../three/models/trophy';
import { createPhone } from '../three/models/phone';
import { createSniper } from '../three/models/sniper';
import { createWeakPoint } from '../three/models/weak-point';
import { createGem } from '../three/models/gem';
import { createRelic } from '../three/models/relic';
import { renderToDataUrl } from '../three/snapshot';
import * as THREE from 'three';

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
    arrow: 'assets/imgs/upgrades/upgrade_generic.png',
    hanger: 'assets/imgs/moyai/moyai_tuxedo.png',
    phone: 'assets/imgs/upgrades/upgrade_generic.png',
    'weak-point': 'assets/imgs/upgrades/upgrade_generic.png',
    sniper: 'assets/imgs/upgrades/upgrade_generic.png',
    gem: 'assets/imgs/upgrades/upgrade_generic.png'
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

  /** Cintre, enseigne de la garde-robe. */
  hanger(): string {
    return this.render('hanger', () =>
      renderToDataUrl(createHanger(), { size: 192, distance: 4.8, rotation: [0.1, 0.35, 0] })
    );
  }

  /** Statuette de la collection : le moyai dans la matière voulue. */
  moyaiSkin(id: string): string {
    return this.render(`moyai-${id}`, () =>
      renderToDataUrl(createMoyai({ palette: collectibleDefinition(id)?.palette }), {
        size: 192,
        distance: 5.4,
        rotation: [0.06, 0.5, 0]
      })
    );
  }

  /** Coffre fermé d'un tier donné. */
  chest(tier: ChestTier): string {
    return this.render(`chest-${tier}`, () =>
      renderToDataUrl(createChest(tier), { size: 192, distance: 3.4, rotation: [0.45, -0.6, 0] })
    );
  }

  /** Téléphone du doomscrolling, écran éteint. */
  phone(): string {
    return this.render('phone', () => {
      const screen = new THREE.DataTexture(new Uint8Array([22, 22, 21, 255]), 1, 1);
      screen.needsUpdate = true;
      const icon = renderToDataUrl(createPhone(screen), { size: 192, distance: 4.4, rotation: [0.1, -0.45, 0.12] });
      screen.dispose();
      return icon;
    });
  }

  /** Point faible, vu de face. */
  weakPoint(): string {
    return this.render('weak-point', () =>
      renderToDataUrl(createWeakPoint(), { size: 192, distance: 1.25, rotation: [0, 0, 0] })
    );
  }

  /** Fusil du trickshot. */
  sniper(): string {
    return this.render('sniper', () =>
      renderToDataUrl(createSniper(), { size: 192, distance: 6.2, rotation: [0.2, 0.5, 0.25] })
    );
  }

  /** Gemme, la seconde monnaie. */
  gem(): string {
    return this.render('gem', () =>
      renderToDataUrl(createGem(), { size: 192, distance: 3.6, rotation: [0.12, 0.4, 0] })
    );
  }

  /** Relique sacrée. Un identifiant inconnu retombe sur l'image de secours. */
  relic(id: string): string {
    return this.render(`relic-${id}`, () => {
      const definition = relicDefinition(id);
      if (!definition) throw new Error(`relique inconnue : ${id}`);
      return renderToDataUrl(createRelic(definition), {
        size: 192,
        distance: 6.4,
        rotation: [0.1, 0.4, 0]
      });
    });
  }

  private render(key: string, draw: () => string): string {
    const cached = this.cache.get(key);
    if (cached) return cached;

    let icon: string;
    try {
      icon = draw();
    } catch {
      // Les statuettes et les coffres, trop nombreux pour avoir chacun une
      // image de secours, se rabattent sur celle du moyai ou de l'engrenage.
      icon =
        ModelIcons.FALLBACK[key] ??
        (key.startsWith('moyai-') ? ModelIcons.FALLBACK['moyai'] : ModelIcons.FALLBACK['gear']);
    }
    this.cache.set(key, icon);
    return icon;
  }
}
