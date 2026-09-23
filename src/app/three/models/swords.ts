import * as THREE from 'three';
import { Ring, loft, mesh } from '../geometry';

/**
 * Deux épées croisées : l'enseigne des battles d'aura.
 *
 * Un brainrot faisait office d'icône, ce qui annonçait un personnage et non un
 * combat. Le croisement se lit à toutes les tailles, là où deux bras en train
 * de faire un bras de fer demandent des mains — impossible à rendre net dans
 * une vignette de vingt-quatre pixels.
 */

function blade(color: number, guard: number): THREE.Group {
  const group = new THREE.Group();

  // Lame : longue, plate, pointue.
  const rings: Ring[] = [
    { y: -0.2, halfWidth: 0.11, front: 0.04, back: -0.04, chamfer: 0.4 },
    { y: 1.5, halfWidth: 0.1, front: 0.035, back: -0.035, chamfer: 0.4 },
    { y: 1.9, halfWidth: 0.01, front: 0.01, back: -0.01, chamfer: 0.4 }
  ];
  group.add(
    mesh(
      loft(rings),
      new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 0.25,
        // Bas volontairement : sans carte d'environnement, un métal élevé rend
        // presque noir.
        metalness: 0.2
      })
    )
  );

  // Garde, poignée et pommeau.
  group.add(
    mesh(
      loft([
        { y: -0.3, halfWidth: 0.42, front: 0.07, back: -0.07, chamfer: 0.3 },
        { y: -0.18, halfWidth: 0.42, front: 0.07, back: -0.07, chamfer: 0.3 }
      ]),
      new THREE.MeshStandardMaterial({ color: guard, flatShading: true, roughness: 0.4, metalness: 0.15 })
    )
  );
  group.add(
    mesh(
      loft([
        { y: -0.95, halfWidth: 0.08, front: 0.06, back: -0.06, chamfer: 0.35 },
        { y: -0.3, halfWidth: 0.09, front: 0.07, back: -0.07, chamfer: 0.35 }
      ]),
      new THREE.MeshStandardMaterial({ color: 0x5c4326, flatShading: true, roughness: 0.8 })
    )
  );
  group.add(
    mesh(new THREE.SphereGeometry(0.15, 6, 5),
      new THREE.MeshStandardMaterial({ color: guard, flatShading: true, roughness: 0.4, metalness: 0.15 }),
      [0, -1.02, 0])
  );

  return group;
}

export function createSwords(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'swords';

  // Croisées en X, celle de droite devant : le léger décalage en profondeur
  // évite que les deux lames ne se battent pour le même plan.
  const left = blade(0xd8dce2, 0xe8b84b);
  left.rotation.z = 0.42;
  left.position.z = -0.06;
  group.add(left);

  const right = blade(0xc9ced6, 0xe8b84b);
  right.rotation.z = -0.42;
  right.position.z = 0.06;
  group.add(right);

  return group;
}
