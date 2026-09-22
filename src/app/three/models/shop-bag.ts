import * as THREE from 'three';
import { chisel, createRandom, loft, mesh } from '../geometry';

/**
 * Sac de courses en low poly, pour le bouton de la boutique : un corps
 * légèrement évasé vers le haut, un rabat, et deux anses en arc.
 */

export const SHOP_BAG_PALETTE = {
  paper: 0xd7a15a,
  paperDark: 0xa9763a,
  handle: 0x6b5236
} as const;

export interface ShopBagOptions {
  seed?: number;
}

export function createShopBag({ seed = 512 }: ShopBagOptions = {}): THREE.Group {
  const random = createRandom(seed);
  const roughness = 0.012;

  const paper = new THREE.MeshStandardMaterial({
    color: SHOP_BAG_PALETTE.paper,
    flatShading: true,
    roughness: 0.8,
    metalness: 0.05
  });
  const flap = new THREE.MeshStandardMaterial({
    color: SHOP_BAG_PALETTE.paperDark,
    flatShading: true,
    roughness: 0.85,
    metalness: 0.05
  });
  const strap = new THREE.MeshStandardMaterial({
    color: SHOP_BAG_PALETTE.handle,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.05
  });

  const bag = new THREE.Group();
  bag.name = 'shop-bag';

  // Corps : la base est un peu plus étroite que l'ouverture, comme un sac
  // en papier dont le haut s'écarte.
  const body = loft([
    { y: -0.9, halfWidth: 0.56, front: 0.3, back: -0.3, chamfer: 0.1 },
    { y: 0.5, halfWidth: 0.62, front: 0.36, back: -0.36, chamfer: 0.1 }
  ]);
  bag.add(mesh(chisel(body, roughness, random), paper));

  // Rabat supérieur, plus sombre, qui referme l'ouverture.
  const top = loft([
    { y: 0.5, halfWidth: 0.64, front: 0.38, back: -0.38, chamfer: 0.1 },
    { y: 0.66, halfWidth: 0.63, front: 0.37, back: -0.37, chamfer: 0.1 }
  ]);
  bag.add(mesh(chisel(top, roughness, random), flap));

  // Anses : le même profil en C que le trophée, posé à plat sur le dessus.
  const handle = (side: number) => {
    const profile = new THREE.Shape();
    profile.absarc(0, 0, 0.3, 0, Math.PI, false);
    profile.absarc(0, 0, 0.21, Math.PI, 0, true);
    profile.closePath();

    const depth = 0.1;
    const geometry = new THREE.ExtrudeGeometry(profile, {
      depth,
      bevelEnabled: false,
      curveSegments: 3
    });
    geometry.translate(0, 0, -depth / 2);

    return mesh(chisel(geometry, roughness, random), strap, [0, 0.66, side * 0.2]);
  };
  bag.add(handle(-1));
  bag.add(handle(1));

  const bounds = new THREE.Box3().setFromObject(bag);
  const center = bounds.getCenter(new THREE.Vector3());
  bag.children.forEach(child => child.position.sub(center));

  return bag;
}
