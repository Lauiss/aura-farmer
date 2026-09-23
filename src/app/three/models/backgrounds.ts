import * as THREE from 'three';
import { chisel, createRandom, loft, mesh } from '../geometry';
import type { Purchasable } from '../../services/shop-manager';
import { sortByPrice } from '../../../assets/static/order';

/**
 * Décors de fond, en low poly.
 *
 * Ils vivent dans une scène à part, rendue avant la statue avec une caméra
 * fixe : sans cela, faire tourner le moyai ferait tourner le décor avec lui,
 * puisque c'est la caméra qui orbite et non la statue.
 */

export type BackgroundId = 'city' | 'mountains' | 'dusk';

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
  { id: 'city', sky: 0x1d2433, bonus: 0.25, price: 1000000, upgrades: backgroundUpgrades(0.25, 1000000) },
  { id: 'mountains', sky: 0x23303a, bonus: 0.5, price: 100000000, upgrades: backgroundUpgrades(0.5, 100000000) },
  { id: 'dusk', sky: 0x3a2233, bonus: 1, price: 10000000000, upgrades: backgroundUpgrades(1, 10000000000) }
];

// Les décors sont déjà écrits dans l'ordre, mais le tri le garantit si l'on en
// intercale un plus tard. Il se fait avant l'export, qui reste en lecture
// seule pour les consommateurs.
sortByPrice(CATALOGUE);
for (const background of CATALOGUE) {
  sortByPrice(background.upgrades);
}

export const BACKGROUNDS: readonly BackgroundDefinition[] = CATALOGUE;

/** Repères de la scène de fond : assez large pour couvrir les écrans étirés. */
const HALF_WIDTH = 26;
const GROUND_Y = -7;

function flat(color: number, roughness = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness, metalness: 0 });
}

/** Grand plan peint, posé loin derrière le décor. */
function sky(color: number): THREE.Mesh {
  const plane = new THREE.PlaneGeometry(HALF_WIDTH * 2.4, 40);
  return new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color }));
}

/** Skyline : deux rangées de blocs, la plus lointaine plus sombre. */
function createCity(random: () => number): THREE.Group {
  const group = new THREE.Group();
  group.add(mesh(sky(0x1d2433).geometry, new THREE.MeshBasicMaterial({ color: 0x1d2433 }), [0, 4, -30]));

  const row = (z: number, color: number, count: number, maxHeight: number) => {
    const material = flat(color);
    for (let i = 0; i < count; i++) {
      const width = 0.9 + random() * 1.6;
      const height = 2 + random() * maxHeight;
      const x = -HALF_WIDTH + (i / (count - 1)) * HALF_WIDTH * 2 + (random() - 0.5);
      const block = loft([
        { y: GROUND_Y, halfWidth: width, front: width * 0.7, back: -width * 0.7, chamfer: 0.04 },
        { y: GROUND_Y + height, halfWidth: width, front: width * 0.7, back: -width * 0.7, chamfer: 0.04 }
      ]);
      group.add(mesh(chisel(block, 0.03, random), material, [x, 0, z]));
    }
  };

  row(-22, 0x2b3446, 22, 7);
  row(-16, 0x232b3a, 18, 5);

  // Sol, qui ferme le bas du cadre.
  const ground = new THREE.PlaneGeometry(HALF_WIDTH * 2.4, 24);
  const floor = new THREE.Mesh(ground, flat(0x161c26));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, GROUND_Y, -8);
  group.add(floor);

  return group;
}

/** Trois rangées de pics, de plus en plus clairs vers l'avant. */
function createMountains(random: () => number): THREE.Group {
  const group = new THREE.Group();
  group.add(mesh(sky(0x23303a).geometry, new THREE.MeshBasicMaterial({ color: 0x23303a }), [0, 4, -30]));

  const range = (z: number, color: number, count: number, height: number, base: number) => {
    const material = flat(color);
    for (let i = 0; i < count; i++) {
      const peak = height * (0.6 + random() * 0.7);
      const width = base * (0.7 + random() * 0.6);
      const x = -HALF_WIDTH + (i / (count - 1)) * HALF_WIDTH * 2 + (random() - 0.5) * 2;
      const mountain = loft([
        { y: GROUND_Y, halfWidth: width, front: width, back: -width, chamfer: 0.12 },
        { y: GROUND_Y + peak, halfWidth: 0.08, front: 0.08, back: -0.08, chamfer: 0.2 }
      ]);
      group.add(mesh(chisel(mountain, 0.08, random), material, [x, 0, z]));
    }
  };

  range(-24, 0x2e3b47, 9, 11, 3.6);
  range(-18, 0x27333e, 7, 8, 3.2);
  range(-12, 0x1e2831, 6, 6, 3);

  return group;
}

/** Ciel de crépuscule : un dégradé peint par sommets et un soleil bas. */
function createDusk(random: () => number): THREE.Group {
  const group = new THREE.Group();

  // Dégradé : un plan dont les sommets hauts et bas portent deux teintes.
  const plane = new THREE.PlaneGeometry(HALF_WIDTH * 2.4, 40, 1, 4);
  const colors: number[] = [];
  const top = new THREE.Color(0x2a1b33);
  const bottom = new THREE.Color(0xc4623f);
  const position = plane.attributes['position'] as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const t = (position.getY(i) + 20) / 40;
    const color = bottom.clone().lerp(top, t);
    colors.push(color.r, color.g, color.b);
  }
  plane.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  group.add(
    mesh(plane, new THREE.MeshBasicMaterial({ vertexColors: true }), [0, 4, -30])
  );

  // Soleil bas sur l'horizon.
  const sun = new THREE.CircleGeometry(3.4, 10);
  group.add(mesh(sun, new THREE.MeshBasicMaterial({ color: 0xffd08a }), [-6, -2.5, -28]));

  // Quelques crêtes sombres en découpe.
  const material = flat(0x1b1522);
  for (let i = 0; i < 7; i++) {
    const width = 3 + random() * 2.5;
    const peak = 4 + random() * 4;
    const x = -HALF_WIDTH + (i / 6) * HALF_WIDTH * 2;
    const ridge = loft([
      { y: GROUND_Y, halfWidth: width, front: width, back: -width, chamfer: 0.12 },
      { y: GROUND_Y + peak, halfWidth: 0.1, front: 0.1, back: -0.1, chamfer: 0.2 }
    ]);
    group.add(mesh(chisel(ridge, 0.06, random), material, [x, 0, -14]));
  }

  return group;
}

const FACTORIES: Record<BackgroundId, (random: () => number) => THREE.Group> = {
  city: createCity,
  mountains: createMountains,
  dusk: createDusk
};

export function createBackground(id: BackgroundId, seed = 9001): THREE.Group {
  const group = FACTORIES[id](createRandom(seed));
  group.name = `background-${id}`;
  return group;
}

export function backgroundDefinition(id: BackgroundId): BackgroundDefinition {
  return BACKGROUNDS.find(background => background.id === id)!;
}
