import * as THREE from 'three';
import { Ring, loft, mesh } from '../geometry';

/**
 * Sablier, enseigne de tout ce qui touche au temps passé hors du jeu.
 *
 * Deux plateaux de bois et un verre qui se pince en son milieu : le `loft`
 * empile des sections selon Y, ce qui donne la taille de guêpe sans autre
 * artifice. Le sable est un second volume, plus étroit, posé dans le bas.
 */

const WOOD = 0x6b5539;
const SAND = 0xe8b84b;

function plate(y: number): THREE.Mesh {
  const rings: Ring[] = [
    { y: y - 0.12, halfWidth: 0.86, front: 0.86, back: -0.86, chamfer: 0.3 },
    { y: y + 0.12, halfWidth: 0.8, front: 0.8, back: -0.8, chamfer: 0.3 }
  ];
  return mesh(loft(rings), new THREE.MeshStandardMaterial({ color: WOOD, flatShading: true }));
}

export function createHourglass(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'hourglass';

  group.add(plate(-1.35));
  group.add(plate(1.35));

  // Le verre : large en haut et en bas, pincé au centre.
  const glass: Ring[] = [
    { y: -1.22, halfWidth: 0.62, front: 0.62, back: -0.62, chamfer: 0.38 },
    { y: -0.7, halfWidth: 0.66, front: 0.66, back: -0.66, chamfer: 0.38 },
    { y: 0, halfWidth: 0.12, front: 0.12, back: -0.12, chamfer: 0.38 },
    { y: 0.7, halfWidth: 0.66, front: 0.66, back: -0.66, chamfer: 0.38 },
    { y: 1.22, halfWidth: 0.62, front: 0.62, back: -0.62, chamfer: 0.38 }
  ];
  group.add(
    mesh(
      loft(glass),
      new THREE.MeshStandardMaterial({
        color: 0xa9d8ee,
        flatShading: true,
        transparent: true,
        opacity: 0.35,
        roughness: 0.15,
        // Sans carte d'environnement, un métal élevé rendrait le verre noir.
        metalness: 0.1
      })
    )
  );

  // Le sable, tassé dans la moitié basse : c'est lui qui donne sa couleur au
  // sablier, le verre étant presque invisible sur fond sombre.
  const sand: Ring[] = [
    { y: -1.18, halfWidth: 0.54, front: 0.54, back: -0.54, chamfer: 0.38 },
    { y: -0.78, halfWidth: 0.56, front: 0.56, back: -0.56, chamfer: 0.38 },
    { y: -0.3, halfWidth: 0.2, front: 0.2, back: -0.2, chamfer: 0.38 }
  ];
  group.add(
    mesh(
      loft(sand),
      new THREE.MeshStandardMaterial({ color: SAND, flatShading: true, roughness: 0.8 })
    )
  );

  return group;
}
