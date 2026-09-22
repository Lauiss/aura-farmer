import * as THREE from 'three';
import { chisel, createRandom, loft, mesh } from '../geometry';

/** Cintre en low poly, enseigne de la garde-robe. */

export const HANGER_PALETTE = {
  wood: 0xc79a5f,
  hook: 0xb9bcc2
} as const;

export function createHanger(seed = 8080): THREE.Group {
  const random = createRandom(seed);

  const wood = new THREE.MeshStandardMaterial({
    color: HANGER_PALETTE.wood,
    flatShading: true,
    roughness: 0.8,
    metalness: 0.05
  });
  const metal = new THREE.MeshStandardMaterial({
    color: HANGER_PALETTE.hook,
    flatShading: true,
    roughness: 0.4,
    metalness: 0.4
  });

  const hanger = new THREE.Group();
  hanger.name = 'hanger';

  const depth = 0.16;

  // Les deux épaules, deux barres inclinées qui se rejoignent au sommet.
  const shoulder = (side: number) => {
    const bar = loft([
      { y: -0.42, halfWidth: 0.07, front: depth / 2, back: -depth / 2, chamfer: 0.28 },
      { y: 0.42, halfWidth: 0.07, front: depth / 2, back: -depth / 2, chamfer: 0.28 }
    ]);
    return mesh(chisel(bar, 0.008, random), wood, [side * 0.42, 0.1, 0], [0, 0, side * 1.16]);
  };
  hanger.add(shoulder(-1));
  hanger.add(shoulder(1));

  // Barre inférieure, celle où l'on pose un pantalon.
  const bar = loft([
    { y: -0.05, halfWidth: 0.86, front: depth / 2, back: -depth / 2, chamfer: 0.06 },
    { y: 0.05, halfWidth: 0.86, front: depth / 2, back: -depth / 2, chamfer: 0.06 }
  ]);
  hanger.add(mesh(chisel(bar, 0.008, random), wood, [0, -0.28, 0]));

  // Crochet : un demi-anneau extrudé surmontant l'ensemble.
  const profile = new THREE.Shape();
  profile.absarc(0, 0, 0.24, Math.PI, -Math.PI * 0.15, true);
  profile.absarc(0, 0, 0.17, -Math.PI * 0.15, Math.PI, false);
  profile.closePath();

  const hook = new THREE.ExtrudeGeometry(profile, {
    depth: 0.1,
    bevelEnabled: false,
    curveSegments: 4
  });
  hook.translate(0, 0, -0.05);
  hanger.add(mesh(chisel(hook, 0.006, random), metal, [0, 0.7, 0]));

  const bounds = new THREE.Box3().setFromObject(hanger);
  const center = bounds.getCenter(new THREE.Vector3());
  hanger.children.forEach(child => child.position.sub(center));

  return hanger;
}
