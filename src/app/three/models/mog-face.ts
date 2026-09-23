import * as THREE from 'three';
import { Ring, loft, mesh } from '../geometry';

/**
 * La tête de mogger : l'expression que prend la statue au clic, une fois le
 * Mogging débloqué.
 *
 * Elle ne remplace pas la tête — on n'en modélise que ce qui change : des
 * sourcils rabattus en accent circonflexe inversé, des yeux plissés et un
 * rictus en coin. Posés devant la pierre, ils suffisent à faire basculer
 * l'expression, là où refaire le crâne entier coûterait un second modèle à
 * tenir à jour.
 */

/** Teintes de l'ombre creusée dans la pierre. */
const HOLLOW = 0x1b1a17;

function brow(side: number): THREE.Mesh {
  const rings: Ring[] = [
    { y: -0.05, halfWidth: 0.2, front: 0.06, back: -0.06, chamfer: 0.3 },
    { y: 0.05, halfWidth: 0.2, front: 0.06, back: -0.06, chamfer: 0.3 }
  ];
  // Incliné vers le centre : c'est cette convergence qui fait le regard dur.
  return mesh(loft(rings), new THREE.MeshStandardMaterial({ color: HOLLOW, flatShading: true }),
    [side * 0.3, 0.72, 0.52], [0, 0, side * 0.42]);
}

function eyeSlit(side: number): THREE.Mesh {
  const rings: Ring[] = [
    { y: -0.03, halfWidth: 0.16, front: 0.05, back: -0.05, chamfer: 0.35 },
    { y: 0.03, halfWidth: 0.16, front: 0.05, back: -0.05, chamfer: 0.35 }
  ];
  return mesh(loft(rings), new THREE.MeshBasicMaterial({ color: 0x0d0c0a }),
    [side * 0.3, 0.56, 0.54], [0, 0, side * 0.18]);
}

export function createMogFace(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mog-face';

  for (const side of [-1, 1]) {
    group.add(brow(side));
    group.add(eyeSlit(side));
  }

  // Le rictus : relevé d'un seul côté, ce qui suffit à lire le mépris.
  const smirk = mesh(
    loft([
      { y: -0.04, halfWidth: 0.26, front: 0.05, back: -0.05, chamfer: 0.4 },
      { y: 0.04, halfWidth: 0.26, front: 0.05, back: -0.05, chamfer: 0.4 }
    ]),
    new THREE.MeshStandardMaterial({ color: HOLLOW, flatShading: true }),
    [0.06, -0.22, 0.66],
    [0, 0, 0.3]
  );
  group.add(smirk);

  return group;
}

/** Fait apparaître puis disparaître l'expression. `t` va de 0 à 1. */
export function fadeMogFace(face: THREE.Group, t: number): void {
  // Apparition sèche, maintien, puis effacement : un mog se pose, il ne se
  // fond pas.
  const opacity = t < 0.15 ? t / 0.15 : t > 0.7 ? (1 - t) / 0.3 : 1;
  face.traverse(child => {
    const asMesh = child as THREE.Mesh;
    if (!asMesh.isMesh) return;
    const material = asMesh.material as THREE.Material;
    material.transparent = true;
    material.opacity = Math.max(0, Math.min(1, opacity));
  });
}
