import * as THREE from 'three';

/**
 * Point faible, à la manière de ceux qui apparaissent sur les rochers de
 * Fortnite : un disque lumineux posé à la surface de la statue. Le toucher
 * porte un coup critique.
 *
 * Tout est en `MeshBasicMaterial` : le point doit briller de lui-même, quel
 * que soit l'éclairage de la face où il tombe. Le disque regarde vers +Z ;
 * c'est à l'appelant de l'orienter selon la normale de la surface.
 */

export const WEAK_POINT_PALETTE = {
  core: 0xf4fbff,
  ring: 0x5fd4ff,
  halo: 0x2aa8ff
} as const;

/** Rayon de la zone cliquable, plus large que le dessin pour pardonner. */
export const WEAK_POINT_HIT_RADIUS = 0.2;

function glow(color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}

export function createWeakPoint(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'weak-point';

  // Cœur hexagonal : six segments suffisent, c'est le parti pris low poly.
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.075, 6), glow(WEAK_POINT_PALETTE.core, 1));
  core.name = 'core';
  core.position.z = 0.012;
  group.add(core);

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 6), glow(WEAK_POINT_PALETTE.ring, 0.95));
  ring.name = 'ring';
  ring.position.z = 0.01;
  ring.rotation.z = Math.PI / 6;
  group.add(ring);

  const halo = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.2, 6), glow(WEAK_POINT_PALETTE.halo, 0.35));
  halo.name = 'halo';
  halo.position.z = 0.008;
  group.add(halo);

  // Zone de clic invisible. Une opacité nulle plutôt que `visible = false` :
  // le lancer de rayon doit toujours la trouver.
  const hit = new THREE.Mesh(
    new THREE.IcosahedronGeometry(WEAK_POINT_HIT_RADIUS, 0),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hit.name = 'hit';
  group.add(hit);

  return group;
}

/**
 * Anime le point : il pulse tant qu'il est là, et la couronne tourne pour
 * attirer l'œil. `t` est en secondes depuis l'apparition, `fade` entre 0 et 1.
 */
export function animateWeakPoint(point: THREE.Group, t: number, fade: number): void {
  const pulse = 1 + Math.sin(t * 9) * 0.12;
  const ring = point.getObjectByName('ring');
  const halo = point.getObjectByName('halo');
  if (ring) ring.rotation.z = Math.PI / 6 + t * 1.8;
  if (halo) halo.scale.setScalar(pulse);

  point.traverse(child => {
    const asMesh = child as THREE.Mesh;
    if (!asMesh.isMesh || child.name === 'hit') return;
    const material = asMesh.material as THREE.MeshBasicMaterial;
    const base = child.name === 'halo' ? 0.35 : child.name === 'ring' ? 0.95 : 1;
    material.opacity = base * fade;
  });
}
