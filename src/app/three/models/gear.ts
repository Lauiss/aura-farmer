import * as THREE from 'three';
import { chisel, createRandom } from '../geometry';

/**
 * Engrenage en low poly, pour le bouton des options. Le profil denté est
 * dessiné point par point puis extrudé : chaque dent est un trapèze, ce qui
 * donne une silhouette franchement facettée plutôt qu'une roue lisse.
 */

export const GEAR_PALETTE = {
  steel: 0x9aa0a6,
  steelDark: 0x63686d
} as const;

export interface GearOptions {
  /** Nombre de dents. En rester à une poignée garde la silhouette lisible. */
  teeth?: number;
  seed?: number;
}

export function createGear({ teeth = 8, seed = 77 }: GearOptions = {}): THREE.Group {
  const random = createRandom(seed);

  const rootRadius = 0.76;
  const tipRadius = 1;
  const boreRadius = 0.34;
  const depth = 0.26;

  const profile = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;

  // Une dent = pied, flanc montant, sommet, flanc descendant. Le sommet doit
  // rester large devant les flancs, sinon la dent s'effile en pointe et la roue
  // ressemble à une étoile.
  for (let i = 0; i < teeth; i++) {
    const base = i * step;
    const corners: [number, number][] = [
      [base, rootRadius],
      [base + step * 0.12, tipRadius],
      [base + step * 0.38, tipRadius],
      [base + step * 0.5, rootRadius]
    ];
    for (const [angle, radius] of corners) {
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0 && angle === base) profile.moveTo(x, y);
      else profile.lineTo(x, y);
    }
  }
  profile.closePath();

  // Alésage central, en polygone plutôt qu'en cercle pour rester facetté.
  const bore = new THREE.Path();
  const boreSides = 8;
  for (let i = 0; i < boreSides; i++) {
    const angle = (i / boreSides) * Math.PI * 2;
    const x = Math.cos(angle) * boreRadius;
    const y = Math.sin(angle) * boreRadius;
    if (i === 0) bore.moveTo(x, y);
    else bore.lineTo(x, y);
  }
  bore.closePath();
  profile.holes.push(bore);

  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth,
    bevelEnabled: false,
    curveSegments: 1
  });
  geometry.translate(0, 0, -depth / 2);

  const body = new THREE.MeshStandardMaterial({
    color: GEAR_PALETTE.steel,
    flatShading: true,
    roughness: 0.6,
    // Bas volontairement : sans carte d'environnement, un métal vire au noir.
    metalness: 0.15
  });

  const gear = new THREE.Group();
  gear.name = 'gear';
  gear.add(new THREE.Mesh(chisel(geometry, 0.01, random), body));

  // Moyeu, pour que le centre ne soit pas un simple trou.
  const hub = new THREE.CylinderGeometry(boreRadius + 0.12, boreRadius + 0.12, depth * 0.6, 8);
  hub.rotateX(Math.PI / 2);
  gear.add(
    new THREE.Mesh(
      hub,
      new THREE.MeshStandardMaterial({
        color: GEAR_PALETTE.steelDark,
        flatShading: true,
        roughness: 0.75,
        metalness: 0.1
      })
    )
  );

  return gear;
}
