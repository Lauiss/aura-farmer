import * as THREE from 'three';
import { chisel, createRandom, loft, mesh } from '../geometry';

/**
 * Accessoires greffés sur la tête du moyai.
 *
 * Les positions sont exprimées dans le repère de la statue **recentrée** :
 * `createMoyai()` déplace ses enfants pour que le groupe soit centré sur
 * lui-même, si bien que l'origine tombe au milieu du crâne. Les repères utiles
 * y sont : ligne des yeux vers y 0.48 et z 0.31, sommet du crâne vers y 1.34,
 * oreilles vers x ±0.65.
 */

export type CosmeticId = 'earings' | 'sunglasses' | 'tatoos' | 'crown' | 'tuxedo' | 'tie';

/** Accessoires réellement modélisés. */
export const MODELLED_COSMETICS: readonly CosmeticId[] = [
  'earings',
  'sunglasses',
  'tatoos',
  'crown',
  'tuxedo',
  'tie'
];

const PALETTE = {
  gold: 0xe0b44a,
  goldDark: 0xa87f2c,
  lens: 0x1b1b1f,
  frame: 0x2a2a2e,
  ink: 0x3f4a5a,
  // Un noir franc se confondrait avec le fond de l'écran : le costume est un
  // anthracite, et les revers plus clairs encore pour rester lisibles.
  cloth: 0x35353e,
  satin: 0x4d4d59,
  shirt: 0xe6e3da,
  tie: 0x8e2f3c,
  tieDark: 0x6b2029
} as const;

/**
 * Base du crâne dans le repère recentré : tout ce qui habille le buste part de
 * là et descend. La statue n'ayant pas de corps, ce buste est rapporté.
 */
const JAW_BASE = -1.3;
/** Le buste ne descend pas plus bas, sous peine de sortir du cadrage. */
const BUST_BOTTOM = -1.98;

function material(color: number, roughness = 0.6, metalness = 0.15): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness, metalness });
}

function slab(
  halfWidth: number,
  halfHeight: number,
  halfDepth: number,
  chamfer = 0.22
): THREE.BufferGeometry {
  return loft([
    { y: -halfHeight, halfWidth, front: halfDepth, back: -halfDepth, chamfer },
    { y: halfHeight, halfWidth, front: halfDepth, back: -halfDepth, chamfer }
  ]);
}

/** Boucles d'oreilles : deux anneaux épais au bas des oreilles. */
function createEarings(random: () => number): THREE.Group {
  const gold = material(PALETTE.gold, 0.35, 0.5);
  const group = new THREE.Group();

  const ring = (side: number) => {
    const profile = new THREE.Shape();
    profile.absarc(0, 0, 0.12, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.07, 0, Math.PI * 2, true);
    profile.holes.push(hole);

    const geometry = new THREE.ExtrudeGeometry(profile, {
      depth: 0.05,
      bevelEnabled: false,
      curveSegments: 3
    });
    geometry.translate(0, 0, -0.025);
    geometry.rotateY(Math.PI / 2);
    return mesh(chisel(geometry, 0.006, random), gold, [side * 0.7, -0.38, 0.02]);
  };

  group.add(ring(-1));
  group.add(ring(1));
  return group;
}

/** Lunettes de soleil : deux verres reliés par un pont, posés sur l'arcade. */
function createSunglasses(random: () => number): THREE.Group {
  const lens = material(PALETTE.lens, 0.2, 0.3);
  const frame = material(PALETTE.frame, 0.7, 0.2);
  const group = new THREE.Group();

  const glass = (side: number) =>
    mesh(chisel(slab(0.26, 0.15, 0.04, 0.18), 0.005, random), lens, [side * 0.33, 0.48, 0.37]);
  group.add(glass(-1));
  group.add(glass(1));

  // Pont entre les verres.
  group.add(mesh(chisel(slab(0.09, 0.04, 0.04, 0.3), 0, random), frame, [0, 0.5, 0.36]));

  // Branches, qui filent vers les tempes.
  const arm = (side: number) =>
    mesh(chisel(slab(0.03, 0.04, 0.2, 0.3), 0, random), frame, [side * 0.61, 0.5, 0.2]);
  group.add(arm(-1));
  group.add(arm(1));

  return group;
}

/** Tatouages : trois traits d'encre sur chaque joue. */
function createTatoos(random: () => number): THREE.Group {
  const ink = material(PALETTE.ink, 0.95, 0);
  const group = new THREE.Group();

  const stripe = (side: number, index: number) =>
    mesh(
      chisel(slab(0.02, 0.11, 0.02, 0.3), 0, random),
      ink,
      [side * (0.42 + index * 0.09), 0.02 - index * 0.04, 0.33],
      [0, 0, side * 0.35]
    );

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) group.add(stripe(side, i));
  }
  return group;
}

/** Couronne : un bandeau et cinq pointes sur le sommet du crâne. */
function createCrown(random: () => number): THREE.Group {
  const gold = material(PALETTE.gold, 0.35, 0.55);
  const goldDark = material(PALETTE.goldDark, 0.45, 0.5);
  const group = new THREE.Group();

  // Bandeau : une couronne d'anneau extrudée.
  const band = new THREE.Shape();
  band.absarc(0, 0, 0.6, 0, Math.PI * 2, false);
  const inner = new THREE.Path();
  inner.absarc(0, 0, 0.52, 0, Math.PI * 2, true);
  band.holes.push(inner);

  const bandGeometry = new THREE.ExtrudeGeometry(band, {
    depth: 0.18,
    bevelEnabled: false,
    curveSegments: 3
  });
  bandGeometry.rotateX(-Math.PI / 2);
  group.add(mesh(chisel(bandGeometry, 0.008, random), gold, [0, 1.32, 0]));

  // Pointes réparties sur le bandeau.
  const points = 5;
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const spike = loft([
      { y: 0, halfWidth: 0.09, front: 0.06, back: -0.06, chamfer: 0.25 },
      { y: 0.26, halfWidth: 0.02, front: 0.02, back: -0.02, chamfer: 0.25 }
    ]);
    group.add(
      mesh(chisel(spike, 0.006, random), goldDark, [
        Math.cos(angle) * 0.56,
        1.5,
        Math.sin(angle) * 0.56
      ])
    );
  }

  return group;
}

/** Haut de costume : épaules, revers en V et plastron de chemise. */
function createTuxedo(random: () => number): THREE.Group {
  const cloth = material(PALETTE.cloth, 0.9, 0.05);
  const satin = material(PALETTE.satin, 0.45, 0.2);
  const shirt = material(PALETTE.shirt, 0.85, 0);
  const group = new THREE.Group();

  // Buste : il s'évase sous la mâchoire puis reste droit.
  const torso = loft([
    { y: BUST_BOTTOM, halfWidth: 1.02, front: 0.5, back: -0.66, chamfer: 0.2 },
    { y: -1.62, halfWidth: 0.98, front: 0.48, back: -0.64, chamfer: 0.2 },
    { y: JAW_BASE, halfWidth: 0.62, front: 0.24, back: -0.52, chamfer: 0.26 }
  ]);
  group.add(mesh(chisel(torso, 0.01, random), cloth));

  // Plastron clair entre les revers. Sa face avant reste à profondeur
  // constante : la suivre sur celle du buste l'enfonçait sous la veste.
  const front = loft([
    { y: BUST_BOTTOM + 0.06, halfWidth: 0.26, front: 0.54, back: 0.36, chamfer: 0.18 },
    { y: JAW_BASE - 0.04, halfWidth: 0.19, front: 0.54, back: 0.36, chamfer: 0.22 }
  ]);
  group.add(mesh(chisel(front, 0, random), shirt));

  // Revers satinés, inclinés vers le col.
  const lapel = (side: number) =>
    mesh(
      chisel(slab(0.13, 0.34, 0.03, 0.2), 0.006, random),
      satin,
      [side * 0.33, -1.62, 0.52],
      [0, 0, side * 0.34]
    );
  group.add(lapel(-1));
  group.add(lapel(1));

  return group;
}

/** Cravate : un nœud sous la mâchoire et une lame qui pendouille. */
function createTie(random: () => number): THREE.Group {
  const silk = material(PALETTE.tie, 0.6, 0.1);
  const knotMaterial = material(PALETTE.tieDark, 0.65, 0.1);
  const group = new THREE.Group();

  // Nœud, juste sous le menton.
  const knot = loft([
    { y: -1.44, halfWidth: 0.1, front: 0.1, back: -0.06, chamfer: 0.25 },
    { y: -1.32, halfWidth: 0.13, front: 0.12, back: -0.06, chamfer: 0.25 },
    { y: -1.24, halfWidth: 0.1, front: 0.1, back: -0.06, chamfer: 0.25 }
  ]);
  // Devant le plastron du smoking, dont la face avant est à 0.54.
  group.add(mesh(chisel(knot, 0.006, random), knotMaterial, [0, 0, 0.5]));

  // Lame : elle s'élargit en descendant, puis se referme en pointe.
  const blade = loft([
    { y: -1.96, halfWidth: 0.02, front: 0.05, back: -0.05, chamfer: 0.3 },
    { y: -1.88, halfWidth: 0.16, front: 0.06, back: -0.06, chamfer: 0.22 },
    { y: -1.58, halfWidth: 0.17, front: 0.06, back: -0.06, chamfer: 0.22 },
    { y: -1.44, halfWidth: 0.1, front: 0.05, back: -0.05, chamfer: 0.26 }
  ]);
  group.add(mesh(chisel(blade, 0.008, random), silk, [0, 0, 0.54]));

  return group;
}

const FACTORIES: Record<CosmeticId, (random: () => number) => THREE.Group> = {
  earings: createEarings,
  sunglasses: createSunglasses,
  tatoos: createTatoos,
  crown: createCrown,
  tuxedo: createTuxedo,
  tie: createTie
};

/** Construit un accessoire, prêt à être ajouté au groupe de la statue. */
export function createCosmetic(id: CosmeticId, seed = 4242): THREE.Group | null {
  const factory = FACTORIES[id];
  if (!factory) return null;
  const group = factory(createRandom(seed));
  group.name = `cosmetic-${id}`;
  return group;
}
