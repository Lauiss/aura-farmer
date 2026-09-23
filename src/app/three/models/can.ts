import * as THREE from 'three';
import { Ring, loft, mesh } from '../geometry';
import type { ConsumableDefinition } from '../../../assets/static/consumables';

/**
 * Canette d'energy drink, en low poly.
 *
 * Un cylindre facetté légèrement rentré en haut et en bas — le profil d'une
 * canette de soda —, ceinturé d'une bande claire qui tient lieu d'étiquette.
 * C'est la bande qui distingue les parfums, la silhouette étant la même pour
 * tous.
 */
export function createCan(definition: ConsumableDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = `can-${definition.id}`;

  const body: Ring[] = [
    { y: -1.15, halfWidth: 0.42, front: 0.42, back: -0.42, chamfer: 0.42 },
    { y: -1.0, halfWidth: 0.5, front: 0.5, back: -0.5, chamfer: 0.42 },
    { y: 0.95, halfWidth: 0.5, front: 0.5, back: -0.5, chamfer: 0.42 },
    { y: 1.12, halfWidth: 0.42, front: 0.42, back: -0.42, chamfer: 0.42 }
  ];
  group.add(
    mesh(
      loft(body),
      new THREE.MeshStandardMaterial({
        color: definition.color,
        flatShading: true,
        roughness: 0.35,
        // Bas volontairement : sans carte d'environnement, un métal élevé rend
        // presque noir.
        metalness: 0.15
      })
    )
  );

  // Étiquette, très légèrement plus large pour ne pas disparaître dans le
  // corps une fois les facettes calculées.
  group.add(
    mesh(
      loft([
        { y: -0.42, halfWidth: 0.52, front: 0.52, back: -0.52, chamfer: 0.42 },
        { y: 0.38, halfWidth: 0.52, front: 0.52, back: -0.52, chamfer: 0.42 }
      ]),
      new THREE.MeshStandardMaterial({
        color: definition.accent,
        flatShading: true,
        roughness: 0.5,
        metalness: 0
      })
    )
  );

  // Couvercle et languette.
  const lid = new THREE.MeshStandardMaterial({
    color: 0xb8bcc2,
    flatShading: true,
    roughness: 0.3,
    metalness: 0.2
  });
  group.add(
    mesh(
      loft([
        { y: 1.12, halfWidth: 0.4, front: 0.4, back: -0.4, chamfer: 0.42 },
        { y: 1.2, halfWidth: 0.36, front: 0.36, back: -0.36, chamfer: 0.42 }
      ]),
      lid
    )
  );
  group.add(mesh(new THREE.TorusGeometry(0.13, 0.03, 3, 7), lid, [0, 1.24, 0.08], [Math.PI / 2, 0, 0]));

  return group;
}
