import * as THREE from 'three';
import { Ring, loft, mesh } from '../geometry';
import type { RelicDefinition } from '../../../assets/static/collectibles';

/**
 * Reliques sacrées de l'aura, en low poly.
 *
 * Chacune est une pierre posée sur un socle sombre, sous un anneau qui flotte
 * au-dessus. La pierre garde un matériau **éclairé** en `flatShading`, avec une
 * forte émission : en `MeshBasicMaterial`, elle brillait bien mais ses facettes
 * disparaissaient et la relique se réduisait à une silhouette plate. L'émission
 * lui donne sa lueur sans sacrifier le low poly.
 */

/** Socle commun aux trois formes : la relique repose toujours sur la pierre. */
function pedestal(): THREE.Mesh {
  const rings: Ring[] = [
    { y: -1.5, halfWidth: 0.78, front: 0.78, back: -0.78, chamfer: 0.32 },
    { y: -1.24, halfWidth: 0.72, front: 0.72, back: -0.72, chamfer: 0.32 },
    { y: -1.16, halfWidth: 0.5, front: 0.5, back: -0.5, chamfer: 0.32 },
    { y: -1.02, halfWidth: 0.46, front: 0.46, back: -0.46, chamfer: 0.32 }
  ];
  return mesh(loft(rings), new THREE.MeshStandardMaterial({ color: 0x2f2d29, flatShading: true }));
}

/** Sections de la pierre elle-même, selon la forme voulue. */
function stoneRings(shape: RelicDefinition['shape']): Ring[] {
  switch (shape) {
    // Cristal : une pointe basse, un renflement net, une pointe haute.
    case 'crystal':
      return [
        { y: -1.05, halfWidth: 0.06, front: 0.06, back: -0.06, chamfer: 0.4 },
        { y: -0.5, halfWidth: 0.44, front: 0.44, back: -0.44, chamfer: 0.4 },
        { y: 0.15, halfWidth: 0.5, front: 0.5, back: -0.5, chamfer: 0.4 },
        { y: 1.3, halfWidth: 0.05, front: 0.05, back: -0.05, chamfer: 0.4 }
      ];
    // Orbe : presque sphérique, mais facetté franc.
    case 'orb':
      return [
        { y: -0.95, halfWidth: 0.2, front: 0.2, back: -0.2, chamfer: 0.45 },
        { y: -0.55, halfWidth: 0.58, front: 0.58, back: -0.58, chamfer: 0.45 },
        { y: -0.05, halfWidth: 0.7, front: 0.7, back: -0.7, chamfer: 0.45 },
        { y: 0.45, halfWidth: 0.58, front: 0.58, back: -0.58, chamfer: 0.45 },
        { y: 0.85, halfWidth: 0.2, front: 0.2, back: -0.2, chamfer: 0.45 }
      ];
    // Obélisque : un fût droit qui se resserre, coiffé d'une pointe courte.
    default:
      return [
        { y: -1.0, halfWidth: 0.4, front: 0.4, back: -0.4, chamfer: 0.18 },
        { y: 0.5, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.18 },
        { y: 0.72, halfWidth: 0.32, front: 0.32, back: -0.32, chamfer: 0.18 },
        { y: 1.25, halfWidth: 0.04, front: 0.04, back: -0.04, chamfer: 0.18 }
      ];
  }
}

/** Anneau qui flotte au-dessus de la pierre, signe qu'elle est sacrée. */
function halo(color: number): THREE.Mesh {
  // Peu de segments : l'anneau doit se lire comme un polygone, pas comme un
  // cercle lisse.
  const geometry = new THREE.TorusGeometry(0.7, 0.09, 3, 9);
  // Légèrement incliné : vu strictement par la tranche, l'anneau se réduisait
  // à un trait et ne se lisait plus comme un cercle.
  const ring = mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.9,
      flatShading: true,
      roughness: 0.4,
      metalness: 0
    }),
    [0, 1.55, 0],
    [Math.PI / 2 - 0.35, 0, 0]
  );
  ring.name = 'halo';
  return ring;
}

export function createRelic(relic: RelicDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = `relic-${relic.id}`;

  group.add(pedestal());

  const stone = mesh(
    loft(stoneRings(relic.shape)),
    new THREE.MeshStandardMaterial({
      color: relic.color,
      emissive: relic.glow,
      emissiveIntensity: 0.8,
      flatShading: true,
      roughness: 0.35,
      metalness: 0.05
    })
  );
  stone.name = 'stone';
  group.add(stone);

  // Enveloppe légèrement plus large, peinte par l'intérieur : elle borde la
  // pierre d'un liseré coloré sans la masquer, ce qui donne la lueur sans
  // post-traitement.
  const aura = mesh(
    loft(stoneRings(relic.shape)),
    new THREE.MeshBasicMaterial({
      color: relic.glow,
      transparent: true,
      opacity: 0.55,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  aura.scale.setScalar(1.22);
  aura.name = 'glow';
  group.add(aura);

  group.add(halo(relic.color));
  return group;
}
