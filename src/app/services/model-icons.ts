import { Injectable } from '@angular/core';
import { createArrow } from '../three/models/arrow';
import { createGear } from '../three/models/gear';
import { createHanger } from '../three/models/hanger';
import { createMoyai } from '../three/models/moyai';
import { createChest } from '../three/models/chest';
import { ChestTier, collectibleDefinition, relicDefinition } from '../../assets/static/collectibles';
import { createExclamation, createQuestionMark } from '../three/models/question-mark';
import { createBuilding } from '../three/models/building';
import { createTrophy } from '../three/models/trophy';
import { createPhone } from '../three/models/phone';
import { createSniper } from '../three/models/sniper';
import { createWeakPoint } from '../three/models/weak-point';
import { createGem } from '../three/models/gem';
import { createHourglass } from '../three/models/hourglass';
import { createDie } from '../three/models/die';
import { createCan } from '../three/models/can';
import { createDish } from '../three/models/dish';
import { createCompanion } from '../three/models/companion';
import { createSwords } from '../three/models/swords';
import { createCoin } from '../three/models/coin';
import { CompanionId, companionDefinition } from '../../assets/static/companions';
import { ConsumableId, consumableDefinition } from '../../assets/static/consumables';
import { createRelic } from '../three/models/relic';
import { createBrainrot } from '../three/models/brainrot';
import { createCaller } from '../three/models/caller';
import { CallerId, callerDefinition } from '../../assets/static/callers';
import { BossId, bossDefinition } from '../../assets/static/bosses';
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
    gem: 'assets/imgs/upgrades/upgrade_generic.png',
    hourglass: 'assets/imgs/upgrades/upgrade_generic.png',
    die: 'assets/imgs/upgrades/upgrade_generic.png',
    swords: 'assets/imgs/upgrades/upgrade_generic.png',
    coin: 'assets/imgs/upgrades/monetize_aura.png'
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

  /** Point d'exclamation, enseigne des quêtes. */
  exclamation(): string {
    return this.render('exclamation', () =>
      renderToDataUrl(createExclamation(), { size: 192, distance: 4.6, rotation: [0.1, 0.35, 0] })
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

  /**
   * Téléphone des compagnons, écran allumé. Le modèle est celui du
   * doomscrolling, mais dans la rangée des compagnons il ne fait guère plus
   * d'un centimètre : écran éteint, il s'y lisait comme une plaque noire.
   */
  companionPhone(): string {
    return this.render('companion-phone', () => {
      const screen = new THREE.DataTexture(new Uint8Array([232, 184, 75, 255]), 1, 1);
      screen.needsUpdate = true;
      // Tourné vers la **gauche**, donc vers le compagnon qu'il accompagne : le
      // téléphone est posé à sa droite, et un écran face au spectateur donnait
      // l'impression que c'était nous qu'il regardait.
      const icon = renderToDataUrl(createPhone(screen), { size: 192, distance: 3.9, rotation: [0.06, -0.62, 0.05] });
      screen.dispose();
      return icon;
    });
  }

  /**
   * Buste de celui qui appelle. Rendu de trois quarts : de face, la casquette
   * du colonel et le groin de John perdent leur relief.
   */
  caller(id: CallerId, size = 192): string {
    return this.render(`caller-${id}-${size}`, () =>
      renderToDataUrl(createCaller(callerDefinition(id)), {
        size,
        distance: 5.6,
        rotation: [0.05, 0.42, 0]
      })
    );
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

  /** Vignette d'un consommable : sa canette, ou l'assiette d'un plat. */
  can(id: ConsumableId): string {
    const definition = consumableDefinition(id);
    if (definition.category === 'food') {
      return this.render(`dish-${id}`, () =>
        renderToDataUrl(createDish(definition), { size: 192, distance: 4.4, rotation: [0.55, 0.4, 0] })
      );
    }
    return this.render(`can-${id}`, () =>
      renderToDataUrl(createCan(definition), {
        size: 192,
        distance: 4.2,
        rotation: [0.12, 0.4, 0]
      })
    );
  }

  /** Épées croisées, enseigne des battles d'aura. */
  swords(): string {
    return this.render('swords', () =>
      renderToDataUrl(createSwords(), { size: 192, distance: 5.2, rotation: [0, 0, 0] })
    );
  }

  /** Pièce d'or, enseigne du marchand. */
  coin(): string {
    return this.render('coin', () =>
      renderToDataUrl(createCoin(), { size: 192, distance: 3.4, rotation: [0.42, 0.55, 0.12] })
    );
  }

  /** Compagnon posé autour de la statue. */
  companion(id: CompanionId): string {
    return this.render(`companion-${id}`, () =>
      renderToDataUrl(createCompanion(companionDefinition(id)), {
        size: 192,
        distance: 5,
        rotation: [0.1, 0.6, 0]
      })
    );
  }

  /** Dé à vingt faces des battles. */
  die(): string {
    return this.render('die', () =>
      renderToDataUrl(createDie(), { size: 192, distance: 3.4, rotation: [0.35, 0.45, 0] })
    );
  }

  /** Brainrot d'un boss de battle. */
  boss(id: BossId): string {
    return this.render(`boss-${id}`, () =>
      renderToDataUrl(createBrainrot(bossDefinition(id)), {
        size: 192,
        distance: 7.6,
        rotation: [0.05, 0.45, 0]
      })
    );
  }

  /** Sablier, pour tout ce qui touche au temps passé hors du jeu. */
  hourglass(): string {
    return this.render('hourglass', () =>
      renderToDataUrl(createHourglass(), { size: 192, distance: 6.4, rotation: [0.12, 0.4, 0] })
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
