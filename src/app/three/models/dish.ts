import * as THREE from 'three';
import { Ring, loft, mesh } from '../geometry';
import type { ConsumableDefinition } from '../../../assets/static/consumables';

/**
 * Plats du marchand, en low poly : une assiette ou un bol, et ce qu'on y a
 * servi. Chaque plat est reconnaissable à sa silhouette — le kebab debout dans
 * son pain, le burger en étages, le bol de ramen et ses baguettes — et non à
 * sa seule couleur : l'icône ne fait que quelques dizaines de pixels.
 */

function material(color: number, roughness = 0.7): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness, metalness: 0 });
}

function part(color: number, rings: Ring[], position: [number, number, number] = [0, 0, 0], rotation: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  return mesh(loft(rings), material(color), position, rotation);
}

/** Disque plat, pour les étages d'un burger ou le bouillon d'un bol. */
function disc(color: number, y: number, radius: number, height: number): THREE.Mesh {
  return part(color, [
    { y, halfWidth: radius, front: radius, back: -radius, chamfer: 0.3 },
    { y: y + height, halfWidth: radius, front: radius, back: -radius, chamfer: 0.3 }
  ]);
}

function plate(): THREE.Mesh {
  return part(0xeeeae2, [
    { y: -0.75, halfWidth: 0.7, front: 0.7, back: -0.7, chamfer: 0.3 },
    { y: -0.68, halfWidth: 1.05, front: 1.05, back: -1.05, chamfer: 0.3 },
    { y: -0.6, halfWidth: 1.12, front: 1.12, back: -1.12, chamfer: 0.3 }
  ]);
}

function bowl(color: number): THREE.Mesh {
  return part(color, [
    { y: -0.8, halfWidth: 0.5, front: 0.5, back: -0.5, chamfer: 0.3 },
    { y: -0.5, halfWidth: 0.85, front: 0.85, back: -0.85, chamfer: 0.3 },
    { y: 0.1, halfWidth: 1.05, front: 1.05, back: -1.05, chamfer: 0.3 }
  ]);
}

/** Petit morceau posé dans un bol ou sur une assiette. */
function bit(color: number, position: [number, number, number], size = 0.18): THREE.Mesh {
  return mesh(new THREE.DodecahedronGeometry(size, 0), material(color), position);
}

export function createDish(definition: ConsumableDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = `dish-${definition.id}`;
  const { color, accent } = definition;

  switch (definition.id) {
    // Kebab : le pain roulé debout, la viande et la salade qui débordent.
    case 'kebab': {
      group.add(plate());
      group.add(
        part(color, [
          { y: -0.6, halfWidth: 0.12, front: 0.12, back: -0.12, chamfer: 0.35 },
          { y: 0.3, halfWidth: 0.45, front: 0.4, back: -0.4, chamfer: 0.35 },
          { y: 0.9, halfWidth: 0.55, front: 0.48, back: -0.48, chamfer: 0.35 }
        ], [0, 0, 0], [0, 0, 0.15])
      );
      group.add(
        part(accent, [
          { y: 0.8, halfWidth: 0.48, front: 0.4, back: -0.4, chamfer: 0.35 },
          { y: 1.12, halfWidth: 0.34, front: 0.3, back: -0.3, chamfer: 0.4 }
        ], [0.12, 0, 0], [0, 0, 0.15])
      );
      group.add(bit(0x6fae4f, [-0.25, 1.1, 0.2], 0.14));
      group.add(bit(0xc4352f, [0.3, 1.12, -0.1], 0.12));
      group.add(bit(0x6fae4f, [0.1, 1.2, 0.25], 0.12));
      break;
    }

    // French tacos : la galette pliée en carré, dorée et marquée du grill.
    case 'tacos': {
      group.add(plate());
      group.add(
        part(color, [
          { y: -0.6, halfWidth: 0.78, front: 0.62, back: -0.62, chamfer: 0.18 },
          { y: -0.05, halfWidth: 0.8, front: 0.64, back: -0.64, chamfer: 0.18 },
          { y: 0.1, halfWidth: 0.7, front: 0.56, back: -0.56, chamfer: 0.24 }
        ])
      );
      for (const x of [-0.4, 0, 0.4]) {
        group.add(mesh(new THREE.BoxGeometry(0.08, 0.03, 1.02), material(accent), [x, 0.11, 0], [0, 0.35, 0]));
      }
      break;
    }

    // Burger : les étages lisibles d'un coup d'œil.
    case 'burger': {
      group.add(plate());
      group.add(disc(color, -0.6, 0.72, 0.22));
      group.add(disc(accent, -0.38, 0.78, 0.22));
      group.add(
        part(0xf2c230, [
          { y: -0.16, halfWidth: 0.8, front: 0.8, back: -0.8, chamfer: 0.05 },
          { y: -0.11, halfWidth: 0.8, front: 0.8, back: -0.8, chamfer: 0.05 }
        ], [0, 0, 0], [0, 0.4, 0])
      );
      group.add(disc(0x6fae4f, -0.11, 0.82, 0.08));
      group.add(
        part(color, [
          { y: -0.03, halfWidth: 0.76, front: 0.76, back: -0.76, chamfer: 0.3 },
          { y: 0.35, halfWidth: 0.66, front: 0.66, back: -0.66, chamfer: 0.34 },
          { y: 0.6, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.4 }
        ])
      );
      // Graines de sésame.
      for (const [x, z] of [[-0.25, 0.3], [0.2, 0.35], [0, -0.05], [0.35, -0.1], [-0.3, -0.15]]) {
        group.add(mesh(new THREE.OctahedronGeometry(0.05, 0), material(0xf4ecd6), [x, 0.5, z]));
      }
      break;
    }

    // Ramen : bol rouge, bouillon, œuf coupé, et les baguettes en travers.
    case 'ramen': {
      group.add(bowl(accent));
      group.add(disc(color, -0.02, 0.95, 0.06));
      group.add(bit(0xf4ecd6, [-0.35, 0.08, 0.2], 0.2));
      group.add(bit(0xf2b53c, [-0.35, 0.14, 0.26], 0.1));
      group.add(bit(0x2f5a3a, [0.3, 0.08, -0.3], 0.16));
      group.add(bit(0xd98a8a, [0.35, 0.08, 0.3], 0.18));
      for (const z of [-0.08, 0.08]) {
        group.add(mesh(new THREE.BoxGeometry(2.2, 0.05, 0.05), material(0x8a5a32), [0.1, 0.2, z], [0, 0.3, 0.12]));
      }
      break;
    }

    // Plat végan : un bol plein de couleurs, rangées par petits tas.
    default: {
      group.add(bowl(0xeeeae2));
      group.add(disc(0xe8dcc0, -0.02, 0.95, 0.06));
      const toppings: [number, [number, number, number]][] = [
        [color, [-0.35, 0.12, -0.3]],
        [color, [-0.45, 0.1, 0]],
        [accent, [0.35, 0.12, -0.3]],
        [accent, [0.45, 0.1, 0.05]],
        [0x7b3f8c, [0, 0.12, 0.45]],
        [0x7b3f8c, [-0.2, 0.1, 0.4]],
        [0xa6c96a, [0.25, 0.14, 0.35]],
        [0xf4ecd6, [0, 0.16, -0.05]]
      ];
      for (const [tint, position] of toppings) group.add(bit(tint, position, 0.2));
      break;
    }
  }

  return group;
}
