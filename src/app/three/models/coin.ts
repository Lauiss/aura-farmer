import * as THREE from 'three';
import { mesh } from '../geometry';

/**
 * Pièce d'or, enseigne du marchand.
 *
 * Un cylindre à douze côtés, donc franchement facetté sur la tranche, avec un
 * disque en relief sur chaque face pour qu'elle ne soit pas un simple palet.
 * Elle est présentée de trois quarts : vue de face on ne verrait qu'un
 * cercle, vue de profil qu'un trait.
 */

const GOLD = 0xe8b84b;
const GOLD_DARK = 0xb8892c;

export function createCoin(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'coin';

  const face = new THREE.MeshStandardMaterial({
    color: GOLD,
    flatShading: true,
    roughness: 0.3,
    // Bas volontairement : sans carte d'environnement, un métal élevé rend
    // presque noir.
    metalness: 0.2
  });
  const rim = new THREE.MeshStandardMaterial({
    color: GOLD_DARK,
    flatShading: true,
    roughness: 0.45,
    metalness: 0.2
  });

  const body = mesh(new THREE.CylinderGeometry(1, 1, 0.26, 12), rim);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  // Disques en relief de part et d'autre, plus clairs que la tranche.
  for (const side of [-1, 1]) {
    const disc = mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.08, 12), face, [0, 0, side * 0.15]);
    disc.rotation.x = Math.PI / 2;
    group.add(disc);
  }

  // Marque centrale : un anneau et non un second disque. Empilé sur la face,
  // un disque ne se distinguait pas d'elle et son éventail de triangles se
  // voyait à travers.
  for (const side of [-1, 1]) {
    group.add(
      mesh(new THREE.TorusGeometry(0.42, 0.09, 3, 12), rim, [0, 0, side * 0.21])
    );
  }

  return group;
}
