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

export type CosmeticId = 'earings' | 'sunglasses' | 'tatoos' | 'crown';

/**
 * Accessoires réellement modélisés. Le smoking et la cravate en sont absents :
 * la statue s'arrête sous la mâchoire, ils n'auraient rien à habiller.
 */
export const MODELLED_COSMETICS: readonly CosmeticId[] = ['earings', 'sunglasses', 'tatoos', 'crown'];

const PALETTE = {
  gold: 0xe0b44a,
  goldDark: 0xa87f2c,
  lens: 0x1b1b1f,
  frame: 0x2a2a2e,
  ink: 0x3f4a5a
} as const;

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

const FACTORIES: Record<CosmeticId, (random: () => number) => THREE.Group> = {
  earings: createEarings,
  sunglasses: createSunglasses,
  tatoos: createTatoos,
  crown: createCrown
};

/** Construit un accessoire, prêt à être ajouté au groupe de la statue. */
export function createCosmetic(id: CosmeticId, seed = 4242): THREE.Group | null {
  const factory = FACTORIES[id];
  if (!factory) return null;
  const group = factory(createRandom(seed));
  group.name = `cosmetic-${id}`;
  return group;
}
