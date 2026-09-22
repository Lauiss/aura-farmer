import * as THREE from 'three';
import { chisel, createRandom, loft, mesh } from '../geometry';

/**
 * Petit bâtiment de boutique en low poly : un corps de façade, un toit à deux
 * pans, un auvent au-dessus de la porte et deux vitrines.
 */

export const BUILDING_PALETTE = {
  wall: 0xd8cfbe,
  wallDark: 0xb3a892,
  roof: 0x8c5a43,
  awning: 0xc4703f,
  glass: 0x4a6b78,
  door: 0x6b5236
} as const;

export interface BuildingOptions {
  seed?: number;
}

export function createBuilding({ seed = 731 }: BuildingOptions = {}): THREE.Group {
  const random = createRandom(seed);
  const roughness = 0.012;

  const material = (color: number, rough = 0.85) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: rough, metalness: 0.05 });

  const wall = material(BUILDING_PALETTE.wall);
  const base = material(BUILDING_PALETTE.wallDark);
  const roof = material(BUILDING_PALETTE.roof, 0.9);
  const awning = material(BUILDING_PALETTE.awning, 0.8);
  const glass = material(BUILDING_PALETTE.glass, 0.35);
  const door = material(BUILDING_PALETTE.door, 0.9);

  const building = new THREE.Group();
  building.name = 'building';

  // Corps : une façade un peu plus large que profonde.
  const body = loft([
    { y: -0.9, halfWidth: 0.86, front: 0.58, back: -0.58, chamfer: 0.06 },
    { y: 0.42, halfWidth: 0.86, front: 0.58, back: -0.58, chamfer: 0.06 }
  ]);
  building.add(mesh(chisel(body, roughness, random), wall));

  // Soubassement, pour que le bâtiment ne flotte pas.
  const plinth = loft([
    { y: -1.02, halfWidth: 0.94, front: 0.64, back: -0.64, chamfer: 0.08 },
    { y: -0.82, halfWidth: 0.9, front: 0.61, back: -0.61, chamfer: 0.08 }
  ]);
  building.add(mesh(chisel(plinth, roughness, random), base));

  // Toit à deux pans : la section supérieure se réduit à une arête.
  const roofGeometry = loft([
    { y: 0.42, halfWidth: 0.98, front: 0.68, back: -0.68, chamfer: 0.05 },
    { y: 1.08, halfWidth: 0.06, front: 0.68, back: -0.68, chamfer: 0 }
  ]);
  building.add(mesh(chisel(roofGeometry, roughness, random), roof));

  // Porte, légèrement en saillie.
  const doorway = loft([
    { y: -0.86, halfWidth: 0.2, front: 0.62, back: 0.5, chamfer: 0.1 },
    { y: -0.14, halfWidth: 0.2, front: 0.62, back: 0.5, chamfer: 0.1 }
  ]);
  building.add(mesh(chisel(doorway, 0, random), door));

  // Vitrines de part et d'autre.
  const window = (side: number) =>
    mesh(
      chisel(
        loft([
          { y: -0.62, halfWidth: 0.19, front: 0.61, back: 0.52, chamfer: 0.12 },
          { y: -0.18, halfWidth: 0.19, front: 0.61, back: 0.52, chamfer: 0.12 }
        ]),
        0,
        random
      ),
      glass,
      [side * 0.48, 0, 0]
    );
  building.add(window(-1));
  building.add(window(1));

  // Auvent rayé, en avancée au-dessus de la devanture.
  const canopy = loft([
    { y: -0.02, halfWidth: 0.9, front: 0.6, back: 0.54, chamfer: 0.06 },
    { y: 0.2, halfWidth: 0.9, front: 0.86, back: 0.54, chamfer: 0.06 }
  ]);
  building.add(mesh(chisel(canopy, roughness, random), awning));

  const bounds = new THREE.Box3().setFromObject(building);
  const center = bounds.getCenter(new THREE.Vector3());
  building.children.forEach(child => child.position.sub(center));

  return building;
}
