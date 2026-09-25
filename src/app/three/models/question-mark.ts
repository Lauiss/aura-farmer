import * as THREE from 'three';
import { chisel, createRandom, loft, mesh } from '../geometry';

/**
 * Point d'interrogation en low poly, pour tout ce qui n'est pas encore
 * dévoilé. Assemblé en trois volumes — le crochet, la hampe et le point —
 * plutôt que dessiné d'un seul trait : un glyphe tracé en une courbe donnerait
 * une silhouette lisse, à rebours du reste.
 */

export const QUESTION_PALETTE = {
  body: 0x7d7a73,
  bodyDark: 0x5c5a55
} as const;

export interface QuestionMarkOptions {
  seed?: number;
}

export function createQuestionMark({ seed = 909 }: QuestionMarkOptions = {}): THREE.Group {
  const random = createRandom(seed);
  const roughness = 0.012;
  const depth = 0.3;

  const body = new THREE.MeshStandardMaterial({
    color: QUESTION_PALETTE.body,
    flatShading: true,
    roughness: 0.85,
    metalness: 0.05
  });
  const accent = new THREE.MeshStandardMaterial({
    color: QUESTION_PALETTE.bodyDark,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.05
  });

  const mark = new THREE.Group();
  mark.name = 'question-mark';

  // Crochet : un secteur d'anneau ouvert en bas à gauche.
  const hook = new THREE.Shape();
  hook.absarc(0, 0, 0.62, Math.PI * 0.95, -Math.PI * 0.35, true);
  hook.absarc(0, 0, 0.34, -Math.PI * 0.35, Math.PI * 0.95, false);
  hook.closePath();

  const hookGeometry = new THREE.ExtrudeGeometry(hook, {
    depth,
    bevelEnabled: false,
    curveSegments: 4
  });
  hookGeometry.translate(0, 0, -depth / 2);
  mark.add(mesh(chisel(hookGeometry, roughness, random), body, [0, 0.62, 0]));

  // Hampe, descendant de l'extrémité du crochet vers le point.
  const stem = loft([
    { y: -0.22, halfWidth: 0.14, front: depth / 2, back: -depth / 2, chamfer: 0.1 },
    { y: 0.38, halfWidth: 0.14, front: depth / 2, back: -depth / 2, chamfer: 0.1 }
  ]);
  mark.add(mesh(chisel(stem, roughness, random), body, [0.16, 0, 0]));

  // Point, détaché et légèrement plus sombre.
  const dot = loft([
    { y: -0.7, halfWidth: 0.17, front: depth / 2, back: -depth / 2, chamfer: 0.28 },
    { y: -0.4, halfWidth: 0.17, front: depth / 2, back: -depth / 2, chamfer: 0.28 }
  ]);
  mark.add(mesh(chisel(dot, roughness, random), accent, [0.16, 0, 0]));

  const bounds = new THREE.Box3().setFromObject(mark);
  const center = bounds.getCenter(new THREE.Vector3());
  mark.children.forEach(child => child.position.sub(center));

  return mark;
}

/**
 * Point d'exclamation, enseigne des quêtes. Il partage la matière et la
 * facture du point d'interrogation : les deux glyphes se répondent — l'un pour
 * ce qu'on ignore, l'autre pour ce qu'on a à faire — et il serait absurde
 * qu'ils ne soient pas du même atelier.
 */
export function createExclamation({ seed = 911 }: QuestionMarkOptions = {}): THREE.Group {
  const random = createRandom(seed);
  const roughness = 0.012;
  const depth = 0.3;

  const body = new THREE.MeshStandardMaterial({
    color: 0xe8b84b,
    flatShading: true,
    roughness: 0.8,
    metalness: 0.05
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0xb08a2c,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.05
  });

  const mark = new THREE.Group();
  mark.name = 'exclamation';

  // Hampe fuselée : large en haut, effilée vers le bas. C'est cette fuite qui
  // distingue un point d'exclamation d'une simple barre.
  const stem = loft([
    { y: -0.25, halfWidth: 0.12, front: depth / 2, back: -depth / 2, chamfer: 0.14 },
    { y: 0.45, halfWidth: 0.2, front: depth / 2, back: -depth / 2, chamfer: 0.12 },
    { y: 0.95, halfWidth: 0.22, front: depth / 2, back: -depth / 2, chamfer: 0.12 }
  ]);
  mark.add(mesh(chisel(stem, roughness, random), body));

  const dot = loft([
    { y: -0.75, halfWidth: 0.2, front: depth / 2, back: -depth / 2, chamfer: 0.28 },
    { y: -0.42, halfWidth: 0.2, front: depth / 2, back: -depth / 2, chamfer: 0.28 }
  ]);
  mark.add(mesh(chisel(dot, roughness, random), accent));

  const bounds = new THREE.Box3().setFromObject(mark);
  const center = bounds.getCenter(new THREE.Vector3());
  mark.children.forEach(child => child.position.sub(center));

  return mark;
}
