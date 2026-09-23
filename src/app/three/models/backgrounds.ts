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

function flat(color: number, roughness = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness, metalness: 0 });
}

/** Grand plan peint, posé loin derrière le décor. */
function sky(color: number): THREE.Mesh {
  return mesh(
    new THREE.PlaneGeometry(SKY_WIDTH, SKY_HEIGHT),
    new THREE.MeshBasicMaterial({ color }),
    [0, 4, SKY_Z]
  );
}

/**
 * Sol qui ferme le bas du cadre, large comme le ciel.
 *
 * Il s'arrête devant la caméra du décor (posée en z = 16) : le faire passer
 * derrière elle n'ajoutait rien à l'image et ne produisait que de la
 * géométrie hors champ.
 */
function ground(color: number): THREE.Mesh {
  // De l'arrière du ciel jusqu'à huit unités devant la caméra du décor : au
  // delà, la géométrie passe derrière l'objectif sans rien ajouter.
  const depth = 48;
  const floor = mesh(new THREE.PlaneGeometry(SKY_WIDTH, depth), flat(color), [0, GROUND_Y, SKY_Z + depth / 2 - 10]);
  floor.rotation.x = -Math.PI / 2;
  return floor;
}

/** Skyline : deux rangées de blocs, la plus lointaine plus sombre. */
function createCity(random: () => number): THREE.Group {
  const group = new THREE.Group();
  group.add(sky(0x2b3a57));

  // Les fenêtres allumées partagent un seul matériau : c'est elles qui font
  // lire la skyline comme une ville plutôt que comme des barres grises.
  const window = new THREE.MeshBasicMaterial({ color: 0xffd489 });

  const row = (z: number, color: number, count: number, maxHeight: number, lit: number) => {
    const material = flat(color);
    for (let i = 0; i < count; i++) {
      const width = 0.9 + random() * 1.6;
      const height = 2.5 + random() * maxHeight;
      const x = -HALF_WIDTH + (i / (count - 1)) * HALF_WIDTH * 2 + (random() - 0.5);
      const block = loft([
        { y: GROUND_Y, halfWidth: width, front: width * 0.7, back: -width * 0.7, chamfer: 0.04 },
        { y: GROUND_Y + height, halfWidth: width, front: width * 0.7, back: -width * 0.7, chamfer: 0.04 }
      ]);
      group.add(mesh(chisel(block, 0.03, random), material, [x, 0, z]));

      // Quelques fenêtres, posées juste devant la façade pour ne pas s'y
      // enfoncer et disparaître.
      const floors = Math.floor(height / 0.9);
      for (let f = 0; f < floors; f++) {
        if (random() > lit) continue;
        const pane = new THREE.PlaneGeometry(width * 0.22, 0.3);
        group.add(
          mesh(pane, window, [
            x + (random() - 0.5) * width * 1.1,
            GROUND_Y + 0.7 + f * 0.9,
            z + width * 0.7 + 0.02
          ])
        );
      }
    }
  };

  row(-22, 0x3a4763, 22, 7, 0.35);
  row(-16, 0x2a3348, 18, 5, 0.45);

  group.add(ground(0x1b2230));
  return group;
}

/** Trois rangées de pics, de plus en plus clairs vers l'avant. */
function createMountains(random: () => number): THREE.Group {
  const group = new THREE.Group();
  group.add(sky(0x3b5068));

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

  // Les rangées s'assombrissent vers l'avant : c'est ce contraste qui donne
  // la profondeur, les trois teintes d'origine étant trop proches pour se
  // distinguer l'une de l'autre.
  range(-24, 0x53687e, 9, 11, 3.6);
  range(-18, 0x3a4c5e, 7, 8, 3.2);
  range(-12, 0x25323f, 6, 6, 3);

  group.add(ground(0x1a242e));
  return group;
}

/** Ciel de crépuscule : un dégradé peint par sommets et un soleil bas. */
function createDusk(random: () => number): THREE.Group {
  const group = new THREE.Group();

  // Dégradé : un plan dont les sommets hauts et bas portent deux teintes.
  const plane = new THREE.PlaneGeometry(SKY_WIDTH, SKY_HEIGHT, 1, 6);
  const colors: number[] = [];
  const top = new THREE.Color(0x2a1b33);
  const bottom = new THREE.Color(0xc4623f);
  const position = plane.attributes['position'] as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    // Rapporté à la hauteur réelle du plan : la constante 40 d'origine n'a
    // pas suivi son agrandissement et écrasait tout le dégradé en bas.
    const t = (position.getY(i) + SKY_HEIGHT / 2) / SKY_HEIGHT;
    const color = bottom.clone().lerp(top, t);
    colors.push(color.r, color.g, color.b);
  }
  plane.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  group.add(
    mesh(plane, new THREE.MeshBasicMaterial({ vertexColors: true }), [0, 4, SKY_Z])
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

  group.add(ground(0x140f1a));
  return group;
}

/**
 * Rivage : une mer facettée jusqu'à l'horizon, quelques îlots et des palmiers.
 * L'eau est le seul plan clair du jeu, ce qui change franchement l'ambiance.
 */
function createShore(random: () => number): THREE.Group {
  const group = new THREE.Group();
  group.add(sky(0x3f6f8c));

  // La mer : des bandes de plus en plus claires vers l'horizon, ce qui suffit
  // à donner la profondeur sans reflets.
  const bands: [number, number, number][] = [
    [-34, -18, 0x1d4a63],
    [-18, -6, 0x246079],
    [-6, 6, 0x2d7791]
  ];
  for (const [from, to, color] of bands) {
    const water = mesh(new THREE.PlaneGeometry(SKY_WIDTH, to - from), flat(color), [0, GROUND_Y, (from + to) / 2]);
    water.rotation.x = -Math.PI / 2;
    group.add(water);
  }

  // Îlots, chacun coiffé d'un palmier sommaire : un fût penché et une
  // couronne de palmes.
  for (let i = 0; i < 6; i++) {
    const x = -HALF_WIDTH + (i / 5) * HALF_WIDTH * 2 + (random() - 0.5) * 3;
    const z = -20 + random() * 10;
    const width = 1.6 + random() * 1.4;

    group.add(
      mesh(
        chisel(loft([
          { y: GROUND_Y, halfWidth: width, front: width, back: -width, chamfer: 0.36 },
          { y: GROUND_Y + 0.8, halfWidth: width * 0.7, front: width * 0.7, back: -width * 0.7, chamfer: 0.36 }
        ]), 0.1, random),
        flat(0xd8c48c),
        [x, 0, z]
      )
    );

    const lean = (random() - 0.5) * 0.4;
    group.add(
      mesh(
        loft([
          { y: GROUND_Y + 0.6, halfWidth: 0.16, front: 0.16, back: -0.16, chamfer: 0.34 },
          { y: GROUND_Y + 3.4, halfWidth: 0.1, front: 0.1, back: -0.1, chamfer: 0.34 }
        ]),
        flat(0x6b5539),
        [x, 0, z],
        [0, 0, lean]
      )
    );
    for (let p = 0; p < 4; p++) {
      group.add(
        mesh(
          loft([
            { y: GROUND_Y + 3.3, halfWidth: 0.9, front: 0.3, back: -0.3, chamfer: 0.4 },
            { y: GROUND_Y + 3.6, halfWidth: 0.7, front: 0.22, back: -0.22, chamfer: 0.4 }
          ]),
          flat(0x4e8f4a),
          [x + Math.cos((p * Math.PI) / 2) * 0.7 + lean * -3, 0, z + Math.sin((p * Math.PI) / 2) * 0.7],
          [0, (p * Math.PI) / 2, 0.25]
        )
      );
    }
  }

  return group;
}

/**
 * Le Vide : pas d'horizon, pas de sol, des éclats de pierre qui flottent dans
 * le noir. C'est le décor le plus cher, donc celui qui doit le moins
 * ressembler aux autres — il est le seul sans ligne d'horizon.
 */
function createVoid(random: () => number): THREE.Group {
  const group = new THREE.Group();
  group.add(sky(0x0d0b16));

  // Étoiles : de simples points clairs, semés loin derrière.
  const star = new THREE.MeshBasicMaterial({ color: 0xcfd6ff });
  for (let i = 0; i < 90; i++) {
    group.add(
      mesh(new THREE.SphereGeometry(0.06 + random() * 0.09, 4, 3), star, [
        (random() - 0.5) * 90,
        -14 + random() * 34,
        -28 + random() * 6
      ])
    );
  }

  // Éclats de roche en suspension, du plus lointain au plus proche.
  for (let i = 0; i < 16; i++) {
    const size = 0.5 + random() * 1.8;
    const depth = -26 + random() * 16;
    group.add(
      mesh(
        chisel(loft([
          { y: -size, halfWidth: size * 0.5, front: size * 0.5, back: -size * 0.5, chamfer: 0.3 },
          { y: 0, halfWidth: size, front: size * 0.8, back: -size * 0.8, chamfer: 0.26 },
          { y: size * 0.7, halfWidth: size * 0.4, front: size * 0.4, back: -size * 0.4, chamfer: 0.32 }
        ]), 0.22, random),
        flat(0x2e2a3d),
        [(random() - 0.5) * 46, -12 + random() * 26, depth],
        [random() * 3, random() * 3, random() * 3]
      )
    );
  }

  // Une lueur violette au centre, qui détache la silhouette de la statue.
  group.add(
    mesh(
      new THREE.CircleGeometry(7, 12),
      new THREE.MeshBasicMaterial({
        color: 0x3b2359,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }),
      [0, 0, -24]
    )
  );

  return group;
}

const FACTORIES: Record<BackgroundId, (random: () => number) => THREE.Group> = {
  city: createCity,
  mountains: createMountains,
  dusk: createDusk,
  shore: createShore,
  void: createVoid
};

export function createBackground(id: BackgroundId, seed = 9001): THREE.Group {
  const group = FACTORIES[id](createRandom(seed));
  group.name = `background-${id}`;
  return group;
}

export function backgroundDefinition(id: BackgroundId): BackgroundDefinition {
  return BACKGROUNDS.find(background => background.id === id)!;
}
