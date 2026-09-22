import * as THREE from 'three';
import { chisel, createRandom, loft, mesh } from '../geometry';

/**
 * Index tendu en low poly : le geste du « chut », et celui qui longe la
 * mâchoire quand on mewe. Un doigt dressé posé sur un poing sommaire.
 */

export const FINGER_PALETTE = {
  skin: 0xd9a884,
  skinDark: 0xb8825f,
  nail: 0xf0d5c2
} as const;

export interface FingerOptions {
  seed?: number;
}

export function createFinger({ seed = 1212 }: FingerOptions = {}): THREE.Group {
  const random = createRandom(seed);
  const roughness = 0.01;

  const skin = new THREE.MeshStandardMaterial({
    color: FINGER_PALETTE.skin,
    flatShading: true,
    roughness: 0.85,
    metalness: 0,
    transparent: true
  });
  const fist = new THREE.MeshStandardMaterial({
    color: FINGER_PALETTE.skinDark,
    flatShading: true,
    roughness: 0.9,
    metalness: 0,
    transparent: true
  });
  const nail = new THREE.MeshStandardMaterial({
    color: FINGER_PALETTE.nail,
    flatShading: true,
    roughness: 0.6,
    metalness: 0,
    transparent: true
  });

  const finger = new THREE.Group();
  finger.name = 'finger';

  // Poing : un bloc trapu, juste assez pour porter le doigt.
  const knuckles = loft([
    { y: -0.62, halfWidth: 0.3, front: 0.26, back: -0.26, chamfer: 0.26 },
    { y: -0.3, halfWidth: 0.33, front: 0.29, back: -0.29, chamfer: 0.26 },
    { y: -0.04, halfWidth: 0.3, front: 0.26, back: -0.26, chamfer: 0.28 }
  ]);
  finger.add(mesh(chisel(knuckles, roughness, random), fist));

  // Index dressé, très légèrement fuselé vers la pointe.
  const index = loft([
    { y: -0.06, halfWidth: 0.13, front: 0.13, back: -0.13, chamfer: 0.3 },
    { y: 0.34, halfWidth: 0.12, front: 0.12, back: -0.12, chamfer: 0.3 },
    { y: 0.6, halfWidth: 0.1, front: 0.1, back: -0.1, chamfer: 0.32 },
    { y: 0.7, halfWidth: 0.07, front: 0.07, back: -0.07, chamfer: 0.34 }
  ]);
  finger.add(mesh(chisel(index, roughness, random), skin, [-0.08, 0, 0.02]));

  // Ongle, simple plaque claire rapportée sur la pointe.
  const plate = loft([
    { y: 0.44, halfWidth: 0.07, front: 0.03, back: -0.03, chamfer: 0.3 },
    { y: 0.62, halfWidth: 0.06, front: 0.03, back: -0.03, chamfer: 0.32 }
  ]);
  finger.add(mesh(chisel(plate, 0, random), nail, [-0.08, 0, 0.12]));

  const bounds = new THREE.Box3().setFromObject(finger);
  const center = bounds.getCenter(new THREE.Vector3());
  finger.children.forEach(child => child.position.sub(center));

  return finger;
}

/** Règle l'opacité de tous les matériaux du geste, pour l'apparition et le fondu. */
export function setFingerOpacity(finger: THREE.Object3D, opacity: number): void {
  finger.traverse(child => {
    const asMesh = child as THREE.Mesh;
    if (!asMesh.isMesh) return;
    const material = asMesh.material as THREE.Material;
    material.opacity = opacity;
    material.transparent = true;
  });
}
