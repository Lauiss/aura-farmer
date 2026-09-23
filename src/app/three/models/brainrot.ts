import * as THREE from 'three';
import { Ring, chisel, createRandom, loft, mesh } from '../geometry';
import type { BossDefinition } from '../../../assets/static/bosses';

/**
 * Boss des battles d'aura, en low poly.
 *
 * Les brainrots sont des collages absurdes — un requin en baskets, un arbre à
 * gros nez, un cactus-éléphant. Plutôt qu'un fichier par créature, un même
 * squelette (corps lissé + traits rapportés) est paramétré par la forme
 * demandée : les silhouettes se distinguent, et une créature de plus ne coûte
 * qu'une branche.
 *
 * Toutes tiennent dans le même gabarit que la tête de moyai, à peu près deux
 * unités et demie de haut, pour qu'on puisse les porter à sa place sans
 * retoucher le cadrage.
 */

function body(color: number, rings: Ring[], seed: number): THREE.Mesh {
  return mesh(
    chisel(loft(rings), 0.04, createRandom(seed)),
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.75, metalness: 0 })
  );
}

function part(
  color: number,
  rings: Ring[],
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0]
): THREE.Mesh {
  return mesh(
    loft(rings),
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.7, metalness: 0 }),
    position,
    rotation
  );
}

/** Deux yeux ronds, posés devant la face : c'est ce qui rend la chose vivante. */
function eyes(y: number, z: number, spread: number, scale = 1): THREE.Group {
  const group = new THREE.Group();
  const white = new THREE.MeshBasicMaterial({ color: 0xf4f1e8 });
  const pupil = new THREE.MeshBasicMaterial({ color: 0x14120f });
  for (const side of [-1, 1]) {
    group.add(mesh(new THREE.SphereGeometry(0.2 * scale, 6, 5), white, [side * spread, y, z]));
    group.add(mesh(new THREE.SphereGeometry(0.1 * scale, 5, 4), pupil, [side * spread, y, z + 0.14 * scale]));
  }
  return group;
}

/** Jambes en baskets, la signature du requin. */
function sneakers(color: number): THREE.Group {
  const group = new THREE.Group();
  for (const x of [-0.55, 0, 0.55]) {
    group.add(
      part(0xd8d2c4, [
        { y: -1.3, halfWidth: 0.12, front: 0.12, back: -0.12, chamfer: 0.3 },
        { y: -0.6, halfWidth: 0.14, front: 0.14, back: -0.14, chamfer: 0.3 }
      ], [x, 0, 0])
    );
    group.add(
      part(color, [
        { y: -1.62, halfWidth: 0.24, front: 0.42, back: -0.2, chamfer: 0.32 },
        { y: -1.3, halfWidth: 0.22, front: 0.3, back: -0.2, chamfer: 0.32 }
      ], [x, 0, 0.06])
    );
  }
  return group;
}

/** Bras tendus de part et d'autre, pour les créatures qui en ont. */
function arms(color: number, y: number, length: number): THREE.Group {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    group.add(
      part(color, [
        { y: -length, halfWidth: 0.11, front: 0.11, back: -0.11, chamfer: 0.3 },
        { y: 0, halfWidth: 0.15, front: 0.15, back: -0.15, chamfer: 0.3 }
      ], [side * 0.72, y, 0], [0, 0, side * -0.55])
    );
  }
  return group;
}

/** Antennes de Namek. */
function antennae(color: number): THREE.Group {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    group.add(
      part(color, [
        { y: 0, halfWidth: 0.07, front: 0.07, back: -0.07, chamfer: 0.35 },
        { y: 0.55, halfWidth: 0.03, front: 0.03, back: -0.03, chamfer: 0.35 }
      ], [side * 0.2, 1.55, 0.14], [0.2, 0, side * 0.25])
    );
  }
  return group;
}

function shapeOf(definition: BossDefinition): THREE.Group {
  const group = new THREE.Group();
  const { color, accent } = definition;

  switch (definition.shape) {
    // Requin bleu en baskets : museau pointu en avant, aileron dorsal.
    case 'shark': {
      group.add(
        body(color, [
          { y: -0.6, halfWidth: 0.42, front: 0.5, back: -0.5, chamfer: 0.34 },
          { y: 0.1, halfWidth: 0.62, front: 0.85, back: -0.7, chamfer: 0.3 },
          { y: 0.7, halfWidth: 0.5, front: 1.35, back: -0.6, chamfer: 0.28 },
          { y: 1.1, halfWidth: 0.16, front: 1.5, back: -0.35, chamfer: 0.35 }
        ], 11)
      );
      // Aileron dorsal, dressé derrière le crâne.
      group.add(
        part(color, [
          { y: 0.9, halfWidth: 0.28, front: -0.1, back: -0.62, chamfer: 0.2 },
          { y: 1.75, halfWidth: 0.05, front: -0.25, back: -0.5, chamfer: 0.3 }
        ])
      );
      // Ventre clair, qui casse le bleu massif.
      group.add(
        part(accent, [
          { y: -0.5, halfWidth: 0.3, front: 0.56, back: 0.2, chamfer: 0.34 },
          { y: 0.35, halfWidth: 0.38, front: 0.92, back: 0.3, chamfer: 0.3 }
        ])
      );
      group.add(sneakers(0xc4453c));
      group.add(eyes(0.72, 0.72, 0.34));
      break;
    }

    // Massue de bois : un fût épais qui s'évase vers le haut.
    case 'club': {
      group.add(
        body(color, [
          { y: -1.5, halfWidth: 0.26, front: 0.26, back: -0.26, chamfer: 0.25 },
          { y: -0.5, halfWidth: 0.34, front: 0.34, back: -0.34, chamfer: 0.25 },
          { y: 0.4, halfWidth: 0.72, front: 0.72, back: -0.72, chamfer: 0.22 },
          { y: 1.3, halfWidth: 0.66, front: 0.66, back: -0.66, chamfer: 0.24 }
        ], 22)
      );
      // Cerclages sombres, qui donnent l'échelle du fût.
      for (const y of [0.0, 0.7]) {
        group.add(
          part(accent, [
            { y: y - 0.08, halfWidth: 0.6, front: 0.6, back: -0.6, chamfer: 0.22 },
            { y: y + 0.08, halfWidth: 0.62, front: 0.62, back: -0.62, chamfer: 0.22 }
          ])
        );
      }
      group.add(arms(accent, 0.6, 0.7));
      group.add(eyes(0.85, 0.7, 0.28));
      break;
    }

    // Homme-arbre : tronc noueux, houppier en boule, gros nez.
    case 'tree': {
      group.add(
        body(accent, [
          { y: -1.6, halfWidth: 0.42, front: 0.42, back: -0.42, chamfer: 0.28 },
          { y: -0.4, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.28 },
          { y: 0.2, halfWidth: 0.34, front: 0.34, back: -0.34, chamfer: 0.28 }
        ], 33)
      );
      group.add(
        body(color, [
          { y: 0.1, halfWidth: 0.4, front: 0.4, back: -0.4, chamfer: 0.4 },
          { y: 0.6, halfWidth: 0.85, front: 0.85, back: -0.85, chamfer: 0.4 },
          { y: 1.3, halfWidth: 0.7, front: 0.7, back: -0.7, chamfer: 0.4 },
          { y: 1.7, halfWidth: 0.25, front: 0.25, back: -0.25, chamfer: 0.4 }
        ], 34)
      );
      // Le nez, disproportionné : c'est lui qu'on reconnaît.
      group.add(
        part(accent, [
          { y: 0.5, halfWidth: 0.16, front: 0.9, back: 0.3, chamfer: 0.34 },
          { y: 0.82, halfWidth: 0.2, front: 0.7, back: 0.3, chamfer: 0.34 }
        ])
      );
      group.add(arms(accent, 0.1, 0.8));
      group.add(eyes(0.95, 0.62, 0.3));
      break;
    }

    // Cactus : un fût côtelé et deux bras dressés.
    case 'cactus': {
      group.add(
        body(color, [
          { y: -1.6, halfWidth: 0.46, front: 0.46, back: -0.46, chamfer: 0.34 },
          { y: 0, halfWidth: 0.54, front: 0.54, back: -0.54, chamfer: 0.34 },
          { y: 1.2, halfWidth: 0.48, front: 0.48, back: -0.48, chamfer: 0.34 },
          { y: 1.55, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.36 }
        ], 44)
      );
      for (const side of [-1, 1]) {
        group.add(
          part(color, [
            { y: -0.3, halfWidth: 0.2, front: 0.2, back: -0.2, chamfer: 0.34 },
            { y: 0.75, halfWidth: 0.18, front: 0.18, back: -0.18, chamfer: 0.34 }
          ], [side * 0.72, 0, 0])
        );
        group.add(
          part(color, [
            { y: -0.4, halfWidth: 0.19, front: 0.19, back: -0.19, chamfer: 0.34 },
            { y: -0.25, halfWidth: 0.19, front: 0.19, back: -0.19, chamfer: 0.34 }
          ], [side * 0.46, 0, 0], [0, 0, side * -1.1])
        );
      }
      // Fleur au sommet, la seule touche claire.
      group.add(
        part(accent, [
          { y: 1.55, halfWidth: 0.12, front: 0.12, back: -0.12, chamfer: 0.4 },
          { y: 1.8, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.45 }
        ])
      );
      group.add(eyes(0.75, 0.56, 0.24));
      break;
    }

    // Crocodile-avion : fuselage vertical, museau qui dépasse en avant, ailes
    // franches de part et d'autre.
    case 'croc': {
      group.add(
        body(color, [
          { y: -1.1, halfWidth: 0.4, front: 0.4, back: -0.7, chamfer: 0.3 },
          { y: -0.2, halfWidth: 0.56, front: 0.5, back: -0.9, chamfer: 0.28 },
          { y: 0.7, halfWidth: 0.5, front: 0.5, back: -0.8, chamfer: 0.26 },
          { y: 1.25, halfWidth: 0.34, front: 0.45, back: -0.5, chamfer: 0.3 }
        ], 55)
      );
      // Museau : une mâchoire allongée, posée en avant de la tête. Il était
      // fondu dans le fuselage et ne se distinguait plus.
      group.add(
        part(color, [
          { y: 0.62, halfWidth: 0.26, front: 1.7, back: 0.3, chamfer: 0.22 },
          { y: 0.95, halfWidth: 0.3, front: 1.5, back: 0.3, chamfer: 0.22 }
        ])
      );
      // Dents, en liseré clair sous le museau.
      group.add(
        part(0xe8e2d4, [
          { y: 0.56, halfWidth: 0.24, front: 1.62, back: 0.35, chamfer: 0.22 },
          { y: 0.64, halfWidth: 0.26, front: 1.66, back: 0.35, chamfer: 0.22 }
        ])
      );
      // Ailes : assez épaisses pour ne pas se réduire à un trait vues de
      // biais, et assez claires pour se détacher du fuselage.
      for (const side of [-1, 1]) {
        group.add(
          part(accent, [
            { y: -0.16, halfWidth: 1.0, front: 0.42, back: -0.42, chamfer: 0.22 },
            { y: 0.14, halfWidth: 1.0, front: 0.36, back: -0.36, chamfer: 0.22 }
          ], [side * 1.15, 0, -0.1])
        );
      }
      // Dérive, derrière le fuselage.
      group.add(
        part(accent, [
          { y: 0.1, halfWidth: 0.12, front: -0.55, back: -1.1, chamfer: 0.2 },
          { y: 1.0, halfWidth: 0.08, front: -0.7, back: -1.0, chamfer: 0.25 }
        ])
      );
      group.add(eyes(1.0, 0.5, 0.3));
      break;
    }

    // Namek : silhouette humanoïde, antennes et col de cape.
    case 'namek': {
      group.add(
        body(color, [
          { y: -1.6, halfWidth: 0.4, front: 0.35, back: -0.35, chamfer: 0.3 },
          { y: -0.6, halfWidth: 0.56, front: 0.44, back: -0.44, chamfer: 0.28 },
          { y: 0.1, halfWidth: 0.42, front: 0.36, back: -0.36, chamfer: 0.3 },
          { y: 0.5, halfWidth: 0.52, front: 0.52, back: -0.5, chamfer: 0.26 },
          { y: 1.15, halfWidth: 0.5, front: 0.56, back: -0.5, chamfer: 0.26 },
          { y: 1.4, halfWidth: 0.34, front: 0.4, back: -0.4, chamfer: 0.32 }
        ], 66)
      );
      // Col de cape : il se perdait contre le corps, il monte maintenant plus
      // haut et déborde nettement sur les côtés.
      group.add(
        part(accent, [
          { y: 0.3, halfWidth: 0.92, front: 0.28, back: -0.75, chamfer: 0.22 },
          { y: 1.05, halfWidth: 0.8, front: 0.1, back: -0.7, chamfer: 0.22 }
        ])
      );
      // Turban, qui coiffe le crâne et laisse dépasser les antennes.
      group.add(
        part(accent, [
          { y: 1.42, halfWidth: 0.42, front: 0.48, back: -0.48, chamfer: 0.3 },
          { y: 1.62, halfWidth: 0.36, front: 0.42, back: -0.42, chamfer: 0.3 }
        ])
      );
      group.add(antennae(color));
      group.add(eyes(1.05, 0.46, 0.24));
      break;
    }

    // Chad Moai : la tête du frère, taillée plus carrée et coiffée d'ambre.
    default: {
      group.add(
        body(color, [
          { y: -1.5, halfWidth: 0.6, front: 0.42, back: -0.46, chamfer: 0.26 },
          { y: -0.4, halfWidth: 0.66, front: 0.56, back: -0.5, chamfer: 0.22 },
          { y: 0.6, halfWidth: 0.74, front: 0.5, back: -0.54, chamfer: 0.18 },
          { y: 1.3, halfWidth: 0.76, front: 0.62, back: -0.54, chamfer: 0.17 },
          { y: 1.7, halfWidth: 0.64, front: 0.3, back: -0.48, chamfer: 0.26 }
        ], 77)
      );
      // Nez massif et arcade, comme le moyai du joueur mais plus dure.
      group.add(
        part(color, [
          { y: 0.1, halfWidth: 0.24, front: 0.82, back: 0.3, chamfer: 0.3 },
          { y: 0.72, halfWidth: 0.18, front: 0.72, back: 0.3, chamfer: 0.32 }
        ])
      );
      group.add(
        part(accent, [
          { y: 1.26, halfWidth: 0.78, front: 0.66, back: -0.56, chamfer: 0.17 },
          { y: 1.38, halfWidth: 0.78, front: 0.66, back: -0.56, chamfer: 0.17 }
        ])
      );
      group.add(eyes(0.82, 0.56, 0.32, 0.9));
      break;
    }
  }

  return group;
}

export function createBrainrot(definition: BossDefinition): THREE.Group {
  const group = shapeOf(definition);
  group.name = `boss-${definition.id}`;

  // Recentré comme la tête de moyai : l'origine tombe au milieu du volume,
  // pour que la caméra du jeu cadre pareil quelle que soit la créature.
  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.children.forEach(child => child.position.sub(center));

  return group;
}
