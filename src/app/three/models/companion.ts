import * as THREE from 'three';
import { Ring, chisel, createRandom, loft, mesh } from '../geometry';
import type { CompanionDefinition } from '../../../assets/static/companions';

/**
 * Compagnons posés autour de la statue, en low poly.
 *
 * Comme les brainrots, un seul fichier paramétré par identifiant plutôt qu'un
 * fichier par objet : ils partagent les mêmes briques et ne diffèrent que par
 * leurs cotes. Tous sont ramenés au même gabarit par `createCompanion`, pour
 * qu'un paquet de cigarettes et une voiture de course tiennent la même place
 * au pied du moyai.
 */

function material(color: number, roughness = 0.7): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness, metalness: 0 });
}

function part(
  color: number,
  rings: Ring[],
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0]
): THREE.Mesh {
  return mesh(loft(rings), material(color), position, rotation);
}

/** Bloc simple, à partir de ses demi-cotes. */
function box(color: number, w: number, h: number, d: number, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  return mesh(new THREE.BoxGeometry(w, h, d), material(color), position, rotation);
}

/** Roue couchée, pour tout ce qui roule. */
function wheel(x: number, y: number, z: number, radius: number): THREE.Mesh {
  const tyre = mesh(
    new THREE.CylinderGeometry(radius, radius, radius * 0.5, 7),
    material(0x1a1c1f, 0.9),
    [x, y, z]
  );
  // Couchée sur le côté : le cylindre naît debout.
  tyre.rotation.z = Math.PI / 2;
  return tyre;
}

function shapeOf(definition: CompanionDefinition): THREE.Group {
  const group = new THREE.Group();
  const { color, accent } = definition;

  switch (definition.id) {
    /** Vermouth : un chien assis, museau en avant et queue dressée. */
    case 'vermouth': {
      group.add(
        mesh(chisel(loft([
          { y: -0.7, halfWidth: 0.34, front: 0.45, back: -0.45, chamfer: 0.34 },
          { y: 0, halfWidth: 0.38, front: 0.4, back: -0.5, chamfer: 0.3 },
          { y: 0.45, halfWidth: 0.3, front: 0.3, back: -0.42, chamfer: 0.34 }
        ]), 0.04, createRandom(1)), material(color))
      );
      // Cou puis tête, nettement au-dessus du corps : fondue dedans, on ne
      // distinguait qu'une masse brune.
      group.add(part(color, [
        { y: 0.35, halfWidth: 0.17, front: 0.22, back: -0.16, chamfer: 0.34 },
        { y: 0.7, halfWidth: 0.2, front: 0.26, back: -0.18, chamfer: 0.34 }
      ], [0, 0, 0.12]));
      group.add(part(0xc9925e, [
        { y: 0.68, halfWidth: 0.3, front: 0.36, back: -0.26, chamfer: 0.36 },
        { y: 1.1, halfWidth: 0.32, front: 0.38, back: -0.28, chamfer: 0.36 },
        { y: 1.28, halfWidth: 0.24, front: 0.3, back: -0.22, chamfer: 0.38 }
      ], [0, 0, 0.1]));
      // Museau clair, qui dépasse franchement.
      group.add(part(0xe8d2b0, [
        { y: 0.72, halfWidth: 0.15, front: 0.74, back: 0.3, chamfer: 0.34 },
        { y: 0.94, halfWidth: 0.16, front: 0.68, back: 0.3, chamfer: 0.34 }
      ], [0, 0, 0.1]));
      group.add(mesh(new THREE.SphereGeometry(0.08, 5, 4), material(0x1c1a17), [0, 0.88, 0.86]));
      // Yeux, sans lesquels la tête ne se lit pas comme une tête.
      for (const side of [-1, 1]) {
        group.add(
          mesh(new THREE.SphereGeometry(0.06, 5, 4), new THREE.MeshBasicMaterial({ color: 0x14120f }),
            [side * 0.14, 1.02, 0.44])
        );
      }
      // Oreilles tombantes, dans le brun sombre pour trancher sur le crâne.
      for (const side of [-1, 1]) {
        group.add(part(accent, [
          { y: 0.72, halfWidth: 0.1, front: 0.16, back: -0.12, chamfer: 0.36 },
          { y: 1.18, halfWidth: 0.12, front: 0.18, back: -0.12, chamfer: 0.36 }
        ], [side * 0.32, 0, 0.05], [0, 0, side * 0.3]));
      }
      // Pattes avant, et la queue.
      for (const side of [-1, 1]) {
        group.add(part(color, [
          { y: -0.75, halfWidth: 0.1, front: 0.16, back: -0.1, chamfer: 0.34 },
          { y: -0.1, halfWidth: 0.11, front: 0.14, back: -0.1, chamfer: 0.34 }
        ], [side * 0.2, 0, 0.36]));
      }
      group.add(part(color, [
        { y: 0, halfWidth: 0.08, front: -0.42, back: -0.62, chamfer: 0.35 },
        { y: 0.55, halfWidth: 0.06, front: -0.3, back: -0.5, chamfer: 0.35 }
      ]));
      break;
    }

    /** Couteau papillon, entrouvert : lame en biais, deux châsses. */
    case 'butterfly': {
      group.add(part(color, [
        { y: -0.6, halfWidth: 0.07, front: 0.05, back: -0.05, chamfer: 0.3 },
        { y: 0.15, halfWidth: 0.1, front: 0.06, back: -0.06, chamfer: 0.28 },
        { y: 0.95, halfWidth: 0.03, front: 0.03, back: -0.03, chamfer: 0.35 }
      ], [0, 0, 0], [0, 0, -0.2]));
      // Les deux manches, écartés en V.
      for (const side of [-1, 1]) {
        group.add(part(accent, [
          { y: -0.95, halfWidth: 0.08, front: 0.09, back: -0.09, chamfer: 0.26 },
          { y: -0.05, halfWidth: 0.09, front: 0.1, back: -0.1, chamfer: 0.26 }
        ], [side * 0.16, -0.05, 0], [0, 0, side * 0.42]));
      }
      group.add(box(0xd8b04a, 0.1, 0.1, 0.24, [0.04, -0.12, 0]));
      break;
    }

    /** Moto : cadre bas, deux roues, guidon et selle. */
    case 'moto': {
      group.add(wheel(-0.62, -0.5, 0, 0.42));
      group.add(wheel(0.66, -0.5, 0, 0.42));
      group.add(box(color, 1.15, 0.3, 0.34, [0.02, -0.2, 0]));
      group.add(box(accent, 0.55, 0.32, 0.36, [-0.2, 0.08, 0], [0, 0, 0.12]));
      group.add(box(0x1c1f24, 0.5, 0.16, 0.36, [0.35, 0.06, 0]));
      // Fourche et guidon.
      group.add(box(0x9aa0a8, 0.1, 0.72, 0.1, [-0.6, -0.12, 0], [0, 0, 0.22]));
      group.add(box(0x9aa0a8, 0.62, 0.08, 0.08, [-0.68, 0.28, 0]));
      break;
    }

    /** Paquet de cigarettes, couvercle relevé, deux tiges qui dépassent. */
    case 'cigarettes': {
      group.add(box(color, 0.62, 1.0, 0.3, [0, -0.15, 0]));
      group.add(box(accent, 0.63, 0.26, 0.31, [0, -0.5, 0]));
      // Couvercle basculé vers l'arrière.
      group.add(box(color, 0.62, 0.3, 0.3, [0, 0.45, -0.12], [-0.5, 0, 0]));
      for (const offset of [-0.14, 0.02, 0.16]) {
        group.add(
          mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), material(0xf4f1e6),
            [offset, 0.55, 0.04], [0.1, 0, offset * 0.6])
        );
      }
      break;
    }

    /** Voiture de course : caisse basse, aileron, quatre roues. */
    case 'racecar': {
      group.add(box(color, 1.9, 0.3, 0.86, [0, -0.35, 0]));
      group.add(box(color, 1.0, 0.32, 0.72, [-0.1, -0.05, 0]));
      group.add(box(0x2b3a4a, 0.5, 0.26, 0.6, [0.12, 0.08, 0]));
      // Aileron arrière, la signature de la silhouette.
      group.add(box(accent, 0.12, 0.28, 0.8, [-0.82, 0.05, 0]));
      group.add(box(accent, 0.34, 0.08, 0.92, [-0.86, 0.22, 0]));
      // Museau plongeant.
      group.add(box(accent, 0.34, 0.12, 0.7, [0.94, -0.44, 0]));
      for (const x of [-0.62, 0.66]) {
        for (const z of [-0.5, 0.5]) {
          group.add(wheel(x, -0.52, z, 0.3));
        }
      }
      break;
    }

    /** Skibidi toilet : une cuvette d'où sort une tête. */
    case 'skibidi': {
      // Cuvette et réservoir.
      group.add(part(color, [
        { y: -0.95, halfWidth: 0.34, front: 0.4, back: -0.34, chamfer: 0.36 },
        { y: -0.45, halfWidth: 0.42, front: 0.5, back: -0.38, chamfer: 0.36 },
        { y: -0.1, halfWidth: 0.46, front: 0.56, back: -0.4, chamfer: 0.36 }
      ]));
      group.add(box(color, 0.72, 0.62, 0.3, [0, 0.1, -0.44]));
      // Lunette relevée.
      group.add(part(color, [
        { y: -0.08, halfWidth: 0.48, front: 0.58, back: -0.42, chamfer: 0.36 },
        { y: 0.02, halfWidth: 0.48, front: 0.58, back: -0.42, chamfer: 0.36 }
      ]));
      // La tête qui en sort, et son visage.
      group.add(part(accent, [
        { y: 0.0, halfWidth: 0.28, front: 0.3, back: -0.28, chamfer: 0.38 },
        { y: 0.42, halfWidth: 0.32, front: 0.34, back: -0.3, chamfer: 0.4 },
        { y: 0.66, halfWidth: 0.24, front: 0.26, back: -0.24, chamfer: 0.4 }
      ]));
      const white = new THREE.MeshBasicMaterial({ color: 0xf4f1e8 });
      const pupil = new THREE.MeshBasicMaterial({ color: 0x14120f });
      for (const side of [-1, 1]) {
        group.add(mesh(new THREE.SphereGeometry(0.09, 5, 4), white, [side * 0.13, 0.46, 0.3]));
        group.add(mesh(new THREE.SphereGeometry(0.045, 4, 3), pupil, [side * 0.13, 0.46, 0.37]));
      }
      // Bouche grande ouverte : il chante.
      group.add(mesh(new THREE.SphereGeometry(0.1, 5, 4), pupil, [0, 0.24, 0.3]));
      break;
    }

    /** Braulo : un chat assis, oreilles pointues et longue queue enroulée. */
    default: {
      group.add(
        mesh(chisel(loft([
          { y: -0.75, halfWidth: 0.36, front: 0.4, back: -0.4, chamfer: 0.36 },
          { y: -0.1, halfWidth: 0.34, front: 0.34, back: -0.4, chamfer: 0.34 },
          { y: 0.4, halfWidth: 0.26, front: 0.26, back: -0.34, chamfer: 0.36 }
        ]), 0.03, createRandom(7)), material(color))
      );
      // Cou étroit puis tête ronde : sans ce rétrécissement, le chat n'était
      // qu'une silhouette continue où l'on ne distinguait rien.
      group.add(part(color, [
        { y: 0.3, halfWidth: 0.15, front: 0.16, back: -0.14, chamfer: 0.38 },
        { y: 0.6, halfWidth: 0.18, front: 0.2, back: -0.16, chamfer: 0.38 }
      ], [0, 0, 0.06]));
      group.add(part(0x9a938a, [
        { y: 0.58, halfWidth: 0.3, front: 0.32, back: -0.26, chamfer: 0.4 },
        { y: 0.95, halfWidth: 0.33, front: 0.35, back: -0.28, chamfer: 0.4 },
        { y: 1.1, halfWidth: 0.24, front: 0.27, back: -0.22, chamfer: 0.4 }
      ], [0, 0, 0.06]));
      // Oreilles pointues, plus larges et plus hautes pour se détacher.
      for (const side of [-1, 1]) {
        group.add(part(0x9a938a, [
          { y: 1.0, halfWidth: 0.19, front: 0.14, back: -0.12, chamfer: 0.28 },
          { y: 1.48, halfWidth: 0.03, front: 0.04, back: -0.04, chamfer: 0.35 }
        ], [side * 0.22, 0, 0.02], [0, 0, side * 0.26]));
      }
      // Museau clair et truffe, comme pour le chien.
      group.add(part(0xd8d0c4, [
        { y: 0.68, halfWidth: 0.15, front: 0.42, back: 0.2, chamfer: 0.38 },
        { y: 0.84, halfWidth: 0.16, front: 0.4, back: 0.2, chamfer: 0.38 }
      ], [0, 0, 0.06]));
      group.add(mesh(new THREE.SphereGeometry(0.06, 5, 4), material(0xd88a9a), [0, 0.8, 0.5]));
      // Yeux verts, la marque de Braulo.
      const eye = new THREE.MeshBasicMaterial({ color: accent });
      for (const side of [-1, 1]) {
        group.add(mesh(new THREE.SphereGeometry(0.085, 5, 4), eye, [side * 0.15, 0.92, 0.36]));
      }
      // Queue enroulée le long du flanc.
      group.add(part(color, [
        { y: -0.78, halfWidth: 0.07, front: -0.3, back: -0.48, chamfer: 0.35 },
        { y: -0.2, halfWidth: 0.06, front: -0.42, back: -0.58, chamfer: 0.35 },
        { y: 0.3, halfWidth: 0.05, front: -0.24, back: -0.42, chamfer: 0.35 }
      ]));
      break;
    }
  }

  return group;
}

/** Plus grande dimension visée, pour que tous tiennent la même place. */
const TARGET_SIZE = 2;

export function createCompanion(definition: CompanionDefinition): THREE.Group {
  const group = shapeOf(definition);
  group.name = `companion-${definition.id}`;

  // Recentré puis ramené au gabarit commun : une voiture de course et un
  // paquet de cigarettes ne se dessinent pas à la même échelle.
  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.children.forEach(child => child.position.sub(center));

  const size = bounds.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z);
  if (largest > 0) group.scale.setScalar(TARGET_SIZE / largest);

  return group;
}
