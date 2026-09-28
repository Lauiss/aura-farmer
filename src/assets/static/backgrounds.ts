import type { Purchasable } from '../../app/services/shop-manager';
import { sortByPrice } from './order';

/**
 * Décors de fond : ce qui se possède, ce que ça coûte et ce que ça rapporte.
 *
 * Le fichier vivait dans `three/models/` du temps où chaque décor était un
 * modèle low poly rendu dans une scène à part. Le dessin est passé en SVG
 * ([backdrops.ts](./backdrops.ts)), et il ne reste ici que des données de jeu —
 * leur place est donc avec les autres.
 *
 * `sky` reste la couleur du ciel, qui sert encore à teinter la vignette du
 * décor dans la carte des améliorations.
 */

export type BackgroundId = 'city' | 'mountains' | 'dusk' | 'shore' | 'void';

export interface BackgroundDefinition {
  id: BackgroundId;
  /** Couleur du ciel, peinte derrière le décor. */
  sky: number;
  /** Bonus de production accordé tant que le décor est choisi. */
  bonus: number;
  price: number;
  /** Améliorations propres au décor, qui en augmentent le bonus. */
  upgrades: BackgroundUpgrade[];
}

/** Amélioration d'un décor : chaque exemplaire ajoute `value` à son bonus. */
export interface BackgroundUpgrade extends Purchasable {
  value: number;
}

/**
 * Trois améliorations par décor, sur la même courbe que celles de l'outfit :
 * leur prix part de celui du décor, leur effet de son bonus.
 */
function backgroundUpgrades(bonus: number, price: number): BackgroundUpgrade[] {
  const steps = [
    { share: 0.2, cost: 3 },
    { share: 0.3, cost: 12 },
    { share: 0.5, cost: 50 }
  ];
  return steps.map((step, index) => ({
    id: index + 1,
    name: `BACKGROUND_UP_${index + 1}`,
    value: bonus * step.share,
    price: price * step.cost,
    unlocked: false,
    purchases: 0
  }));
}

const CATALOGUE: BackgroundDefinition[] = [
  { id: 'city', sky: 0x2b3a57, bonus: 0.25, price: 1000000, upgrades: backgroundUpgrades(0.25, 1000000) },
  { id: 'mountains', sky: 0x3b5068, bonus: 0.5, price: 100000000, upgrades: backgroundUpgrades(0.5, 100000000) },
  { id: 'dusk', sky: 0x2a1b33, bonus: 1, price: 10000000000, upgrades: backgroundUpgrades(1, 10000000000) },
  { id: 'shore', sky: 0x3f6f8c, bonus: 2, price: 8e11, upgrades: backgroundUpgrades(2, 8e11) },
  { id: 'void', sky: 0x0d0b16, bonus: 4, price: 6e13, upgrades: backgroundUpgrades(4, 6e13) }
];

// Les décors sont déjà écrits dans l'ordre, mais le tri le garantit si l'on en
// intercale un plus tard. Il se fait avant l'export, qui reste en lecture
// seule pour les consommateurs.
sortByPrice(CATALOGUE);
for (const background of CATALOGUE) {
  sortByPrice(background.upgrades);
}

export const BACKGROUNDS: readonly BackgroundDefinition[] = CATALOGUE;

/**
 * Repères de la scène de fond.
 *
 * Les plans peints étaient trop petits : la caméra du décor voit, à la
 * distance du ciel, près de 108 unités de large sur un écran 21/9 et 45 de
 * haut, là où le plan n'en faisait que 62 sur 40. Les bords de l'écran
 * restaient donc vides. Les plans couvrent maintenant largement, et la
 * couleur du ciel est **en plus** posée sur la scène elle-même
 * (`backgroundScene.background`), ce qui garantit qu'aucun format ne laisse
 * de trou quoi qu'il arrive.
 */
const HALF_WIDTH = 26;
const GROUND_Y = -7;
/** Cotes du plan de ciel : de quoi couvrir un 21/9 avec de la marge. */
const SKY_WIDTH = 140;
const SKY_HEIGHT = 60;
const SKY_Z = -30;

export function backgroundDefinition(id: BackgroundId): BackgroundDefinition {
  return BACKGROUNDS.find(background => background.id === id)!;
}
