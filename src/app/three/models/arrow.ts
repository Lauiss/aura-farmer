import * as THREE from 'three';
import { chisel, createRandom } from '../geometry';

/**
 * Flèche montante en low poly, pour les améliorations. Sept points extrudés :
 * une pointe triangulaire posée sur une hampe rectangulaire.
 */

export const ARROW_PALETTE = {
  green: 0x5fbf62,
  greenDark: 0x3d8c40
} as const;

export interface ArrowOptions {
  seed?: number;
}

export function createArrow({ seed = 3003 }: ArrowOptions = {}): THREE.Group {
  const random = createRandom(seed);
  const depth = 0.34;

  const tipWidth = 0.62;
  const stemWidth = 0.28;
  const tipBase = 0.1;

  const profile = new THREE.Shape();
  profile.moveTo(0, 0.85);
  profile.lineTo(tipWidth, tipBase);
  profile.lineTo(stemWidth, tipBase);
  profile.lineTo(stemWidth, -0.85);
  profile.lineTo(-stemWidth, -0.85);
  profile.lineTo(-stemWidth, tipBase);
  profile.lineTo(-tipWidth, tipBase);
  profile.closePath();

  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth,
    bevelEnabled: false,
    curveSegments: 1
  });
  geometry.translate(0, 0, -depth / 2);

  const arrow = new THREE.Group();
  arrow.name = 'arrow';
  arrow.add(
    new THREE.Mesh(
      chisel(geometry, 0.012, random),
      new THREE.MeshStandardMaterial({
        color: ARROW_PALETTE.green,
        flatShading: true,
        roughness: 0.65,
        metalness: 0.08
      })
    )
  );

  return arrow;
}
