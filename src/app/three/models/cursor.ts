import * as THREE from 'three';
import { chisel, createRandom } from '../geometry';

/**
 * Curseur de souris en low poly : la flèche blanche cernée de noir, extrudée.
 *
 * C'est lui qui joue le geste du mewing — il se pose devant la bouche puis file
 * le long de la mâchoire.
 */

export const CURSOR_PALETTE = {
  fill: 0xf6f6f4,
  outline: 0x141416
} as const;

export interface CursorOptions {
  seed?: number;
}

/** Silhouette de la flèche, pointe à l'origine et corps vers le bas. */
const ARROW_POINTS: [number, number][] = [
  [0, 0],
  [0, -1.0],
  [0.25, -0.73],
  [0.44, -1.1],
  [0.63, -1.02],
  [0.44, -0.66],
  [0.74, -0.66]
];

function arrowShape(scale: number): THREE.Shape {
  const shape = new THREE.Shape();
  ARROW_POINTS.forEach(([x, y], index) => {
    const point = [x * scale, y * scale] as const;
    if (index === 0) shape.moveTo(point[0], point[1]);
    else shape.lineTo(point[0], point[1]);
  });
  shape.closePath();
  return shape;
}

export function createCursor({ seed = 606 }: CursorOptions = {}): THREE.Group {
  const random = createRandom(seed);

  const fill = new THREE.MeshStandardMaterial({
    color: CURSOR_PALETTE.fill,
    flatShading: true,
    roughness: 0.55,
    metalness: 0,
    transparent: true
  });
  const outline = new THREE.MeshStandardMaterial({
    color: CURSOR_PALETTE.outline,
    flatShading: true,
    roughness: 0.8,
    metalness: 0,
    transparent: true
  });

  const cursor = new THREE.Group();
  cursor.name = 'cursor';

  // Le cerne est la même flèche, légèrement agrandie et placée derrière : plus
  // simple qu'un contour véritable, et suffisant en low poly.
  const border = new THREE.ExtrudeGeometry(arrowShape(1.12), {
    depth: 0.12,
    bevelEnabled: false,
    curveSegments: 1
  });
  border.translate(-0.05, 0.06, -0.06);
  cursor.add(new THREE.Mesh(chisel(border, 0, random), outline));

  const body = new THREE.ExtrudeGeometry(arrowShape(1), {
    depth: 0.14,
    bevelEnabled: false,
    curveSegments: 1
  });
  body.translate(0, 0, -0.02);
  cursor.add(new THREE.Mesh(chisel(body, 0, random), fill));

  const bounds = new THREE.Box3().setFromObject(cursor);
  const center = bounds.getCenter(new THREE.Vector3());
  cursor.children.forEach(child => child.position.sub(center));

  return cursor;
}

/** Règle l'opacité du curseur, pour son apparition et son effacement. */
export function setCursorOpacity(cursor: THREE.Object3D, opacity: number): void {
  cursor.traverse(child => {
    const asMesh = child as THREE.Mesh;
    if (!asMesh.isMesh) return;
    const material = asMesh.material as THREE.Material;
    material.opacity = opacity;
    material.transparent = true;
  });
}
