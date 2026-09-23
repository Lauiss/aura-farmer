import * as THREE from 'three';
import { chisel, createRandom, loft, mesh } from '../geometry';

/**
 * Téléphone en low poly, pour le doomscrolling. Le boîtier est un `loft`
 * couché : les sections sont empilées dans l'épaisseur, si bien que leurs
 * angles chanfreinés dessinent les coins du téléphone vu de face.
 *
 * L'écran reçoit une texture fournie par l'appelant, qui la redessine à chaque
 * défilement.
 */

export const PHONE_PALETTE = {
  body: 0x24262b,
  frame: 0x3b3f46,
  button: 0x55595f,
  notch: 0x0c0d0f
} as const;

/** Dimensions de l'écran, en unités de scène. Le ratio est celui de la texture. */
export const PHONE_SCREEN = { width: 0.82, height: 1.64 } as const;

function slab(halfWidth: number, halfHeight: number, halfDepth: number, bevel: number, chamfer: number) {
  const geometry = loft([
    { y: -halfDepth, halfWidth: halfWidth - bevel, front: halfHeight - bevel, back: -halfHeight + bevel, chamfer },
    { y: -halfDepth + bevel, halfWidth, front: halfHeight, back: -halfHeight, chamfer },
    { y: halfDepth - bevel, halfWidth, front: halfHeight, back: -halfHeight, chamfer },
    { y: halfDepth, halfWidth: halfWidth - bevel, front: halfHeight - bevel, back: -halfHeight + bevel, chamfer }
  ]);
  // L'épaisseur passe de Y à Z : la face avant regarde vers la caméra.
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

export function createPhone(screen: THREE.Texture, seed = 4242): THREE.Group {
  const random = createRandom(seed);
  const material = (color: number, roughness = 0.6) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness, metalness: 0.15 });

  const phone = new THREE.Group();
  phone.name = 'phone';

  phone.add(mesh(chisel(slab(0.47, 0.92, 0.055, 0.02, 0.14), 0.004, random), material(PHONE_PALETTE.body)));
  // Liseré autour de l'écran, légèrement en retrait du boîtier.
  phone.add(mesh(slab(0.45, 0.9, 0.05, 0.012, 0.13), material(PHONE_PALETTE.frame, 0.4), [0, 0, 0.006]));

  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(PHONE_SCREEN.width, PHONE_SCREEN.height),
    new THREE.MeshBasicMaterial({ map: screen })
  );
  display.name = 'screen';
  display.position.z = 0.058;
  phone.add(display);

  // Encoche et boutons latéraux.
  phone.add(mesh(new THREE.BoxGeometry(0.2, 0.04, 0.01), material(PHONE_PALETTE.notch), [0, 0.77, 0.062]));
  phone.add(mesh(new THREE.BoxGeometry(0.03, 0.2, 0.05), material(PHONE_PALETTE.button), [0.48, 0.35, 0]));
  phone.add(mesh(new THREE.BoxGeometry(0.03, 0.12, 0.05), material(PHONE_PALETTE.button), [-0.48, 0.42, 0]));
  phone.add(mesh(new THREE.BoxGeometry(0.03, 0.12, 0.05), material(PHONE_PALETTE.button), [-0.48, 0.26, 0]));

  return phone;
}
