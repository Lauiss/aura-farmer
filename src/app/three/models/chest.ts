import * as THREE from 'three';
import { chisel, createRandom, loft, mesh } from '../geometry';
import type { ChestTier } from '../../../assets/static/collectibles';

/**
 * Coffre au trésor en low poly, pour le gacha. Le couvercle est un groupe à
 * part, pivotant sur sa charnière arrière : `lid.rotation.x` négatif l'ouvre.
 */

interface ChestColors {
  wood: number;
  woodDark: number;
  metal: number;
  /** Lueur propre du métal, pour les coffres les plus précieux. */
  glow?: number;
}

export const CHEST_COLORS: Record<ChestTier, ChestColors> = {
  doomscroll: { wood: 0x7a4e2d, woodDark: 0x5c3920, metal: 0x8a8f96 },
  basic: { wood: 0x7a4e2d, woodDark: 0x5c3920, metal: 0xc9a14a },
  premium: { wood: 0x35507e, woodDark: 0x263a5c, metal: 0xe8b84b },
  mythic: { wood: 0x55306f, woodDark: 0x3c2050, metal: 0xffd27a, glow: 0x3a2400 }
};

const WIDTH = 1.4;
const DEPTH = 0.9;
const HEIGHT = 0.72;

function material(color: number, roughness: number, emissive = 0): THREE.MeshStandardMaterial {
  // Métal volontairement mat : sans carte d'environnement, un `metalness`
  // élevé rendrait presque noir. L'éclat est porté par la couleur.
  return new THREE.MeshStandardMaterial({ color, emissive, flatShading: true, roughness, metalness: 0.1 });
}

/** Pavé centré, à la base posée en `y`. */
function block(halfWidth: number, halfDepth: number, y: number, height: number, chamfer = 0.08) {
  return loft([
    { y, halfWidth, front: halfDepth, back: -halfDepth, chamfer },
    { y: y + height, halfWidth, front: halfDepth, back: -halfDepth, chamfer }
  ]);
}

export function createChest(tier: ChestTier, seed = 881): THREE.Group {
  const random = createRandom(seed);
  const colors = CHEST_COLORS[tier];
  const wood = material(colors.wood, 0.9);
  const woodDark = material(colors.woodDark, 0.95);
  const metal = material(colors.metal, 0.45, colors.glow);

  const chest = new THREE.Group();
  chest.name = 'chest';

  // --- Caisse ------------------------------------------------------------
  chest.add(mesh(chisel(block(WIDTH / 2, DEPTH / 2, 0, HEIGHT), 0.012, random), wood));
  // Bandeau sombre en haut de la caisse, là où le couvercle se referme.
  chest.add(mesh(block(WIDTH / 2 + 0.015, DEPTH / 2 + 0.015, HEIGHT - 0.1, 0.1, 0.06), woodDark));
  // Deux cerclages verticaux.
  for (const x of [-0.42, 0.42]) {
    chest.add(mesh(block(0.07, DEPTH / 2 + 0.03, -0.01, HEIGHT + 0.02, 0.2), metal, [x, 0, 0]));
  }
  // Serrure sur la face avant.
  chest.add(mesh(block(0.12, 0.05, HEIGHT - 0.3, 0.26, 0.3), metal, [0, 0, DEPTH / 2 + 0.03]));

  // --- Couvercle ---------------------------------------------------------
  // Demi-prisme à six pans, couché selon X. Son groupe est placé sur la
  // charnière (arrière, haut de la caisse) pour pivoter autour d'elle.
  const lid = new THREE.Group();
  lid.name = 'lid';
  lid.position.set(0, HEIGHT, -DEPTH / 2);

  // Demi-cylindre ouvert dessous : une fois le couvercle levé on en voit
  // l'intérieur, d'où les deux faces.
  const lidWood = material(colors.wood, 0.9);
  lidWood.side = THREE.DoubleSide;
  const vault = new THREE.CylinderGeometry(DEPTH / 2, DEPTH / 2, WIDTH, 6, 1, false, 0, Math.PI);
  // L'axe passe de Y à X, et la moitié conservée se retrouve vers le haut.
  vault.rotateZ(Math.PI / 2);
  lid.add(mesh(vault, lidWood, [0, 0, DEPTH / 2]));

  const band = new THREE.CylinderGeometry(DEPTH / 2 + 0.03, DEPTH / 2 + 0.03, 0.14, 6, 1, false, 0, Math.PI);
  band.rotateZ(Math.PI / 2);
  for (const x of [-0.42, 0.42]) lid.add(mesh(band.clone(), metal, [x, 0, DEPTH / 2]));
  band.dispose();
  // Moraillon qui descend sur la serrure.
  lid.add(mesh(block(0.09, 0.04, -0.12, 0.2, 0.3), metal, [0, 0, DEPTH + 0.03]));

  chest.add(lid);

  // Recentrage vertical : le coffre tourne sur lui-même autour de son milieu.
  chest.children.forEach(child => (child.position.y -= (HEIGHT + DEPTH / 2) / 2));
  return chest;
}
