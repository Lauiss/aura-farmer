import * as THREE from 'three';
import { chisel, createRandom, loft, mesh } from '../geometry';

/**
 * Fusil de précision en low poly, et sa balle. Ils servent au « trickshot » :
 * un coup rare qui, s'il part, fait s'envoler le multiplicateur.
 */

export const SNIPER_PALETTE = {
  body: 0x2b2f33,
  metal: 0x53585e,
  stock: 0x4a3a2c,
  scope: 0x15181b,
  tracer: 0xffd27a
} as const;

function part(color: number, roughness: number, metalness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness,
    metalness,
    transparent: true
  });
}

/** Barre allongée selon l'axe X, la longueur d'une arme étant horizontale. */
function bar(length: number, halfHeight: number, halfDepth: number): THREE.BufferGeometry {
  const geometry = loft([
    { y: -length / 2, halfWidth: halfHeight, front: halfDepth, back: -halfDepth, chamfer: 0.26 },
    { y: length / 2, halfWidth: halfHeight, front: halfDepth, back: -halfDepth, chamfer: 0.26 }
  ]);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

export function createSniper(seed = 1147): THREE.Group {
  const random = createRandom(seed);

  const body = part(SNIPER_PALETTE.body, 0.7, 0.25);
  const metal = part(SNIPER_PALETTE.metal, 0.4, 0.6);
  const stock = part(SNIPER_PALETTE.stock, 0.85, 0.05);
  const scope = part(SNIPER_PALETTE.scope, 0.35, 0.5);

  const sniper = new THREE.Group();
  sniper.name = 'sniper';

  // Canon, la pièce la plus longue : elle donne la direction du tir.
  sniper.add(mesh(chisel(bar(2.3, 0.07, 0.07), 0.006, random), metal, [0.55, 0.04, 0]));
  // Corps.
  sniper.add(mesh(chisel(bar(1.25, 0.16, 0.13), 0.008, random), body, [-0.35, 0, 0]));
  // Crosse, inclinée vers l'arrière.
  sniper.add(mesh(chisel(bar(0.8, 0.17, 0.12), 0.008, random), stock, [-1.2, -0.1, 0], [0, 0, -0.16]));
  // Lunette et ses supports.
  sniper.add(mesh(chisel(bar(0.8, 0.1, 0.1), 0.006, random), scope, [-0.2, 0.3, 0]));
  sniper.add(mesh(chisel(bar(0.16, 0.05, 0.05), 0, random), metal, [-0.45, 0.16, 0], [0, 0, Math.PI / 2]));
  sniper.add(mesh(chisel(bar(0.16, 0.05, 0.05), 0, random), metal, [0.05, 0.16, 0], [0, 0, Math.PI / 2]));
  // Chargeur.
  sniper.add(mesh(chisel(bar(0.34, 0.12, 0.08), 0, random), body, [-0.42, -0.24, 0], [0, 0, Math.PI / 2]));

  return sniper;
}

/** Petite balle traçante, étirée dans le sens de la marche. */
export function createBullet(): THREE.Mesh {
  const geometry = loft([
    { y: -0.16, halfWidth: 0.035, front: 0.035, back: -0.035, chamfer: 0.3 },
    { y: 0.16, halfWidth: 0.035, front: 0.035, back: -0.035, chamfer: 0.3 }
  ]);
  geometry.rotateZ(Math.PI / 2);
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: SNIPER_PALETTE.tracer, transparent: true })
  );
}

/** Règle l'opacité de l'arme et de sa balle, pour l'apparition et le fondu. */
export function setSniperOpacity(root: THREE.Object3D, opacity: number): void {
  root.traverse(child => {
    const asMesh = child as THREE.Mesh;
    if (!asMesh.isMesh) return;
    const material = asMesh.material as THREE.Material;
    material.opacity = opacity;
    material.transparent = true;
  });
}
