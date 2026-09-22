import * as THREE from 'three';
import { chisel, createRandom, loft, mesh } from '../geometry';

/**
 * Coupe de trophée en low poly : vasque évasée, col resserré, pied et socle,
 * plus deux anses. Même vocabulaire de formes que le moyai — des sections
 * lissées et des facettes franches.
 */

export const TROPHY_PALETTE = {
  /** Succès débloqué : l'ambre du menu. */
  gold: 0xe8b84b,
  goldDark: 0xb98d2c,
  /** Succès encore verrouillé. */
  grey: 0x54534e,
  greyDark: 0x3d3c38
} as const;

export interface TrophyOptions {
  /** `true` pour la version ambrée, `false` pour la version grise. */
  unlocked: boolean;
  seed?: number;
}

export function createTrophy({ unlocked, seed = 404 }: TrophyOptions): THREE.Group {
  const random = createRandom(seed);
  const roughness = 0.012;

  // `metalness` reste bas volontairement : un matériau très métallique ne
  // renvoie que son environnement, et la scène de rendu n'a pas de carte
  // d'environnement — l'or virerait au presque noir. L'éclat vient donc de la
  // couleur de base et des lumières.
  const body = new THREE.MeshStandardMaterial({
    color: unlocked ? TROPHY_PALETTE.gold : TROPHY_PALETTE.grey,
    flatShading: true,
    roughness: unlocked ? 0.45 : 0.85,
    metalness: unlocked ? 0.15 : 0.05
  });
  const accent = new THREE.MeshStandardMaterial({
    color: unlocked ? TROPHY_PALETTE.goldDark : TROPHY_PALETTE.greyDark,
    flatShading: true,
    roughness: unlocked ? 0.55 : 0.95,
    metalness: unlocked ? 0.12 : 0.05
  });

  const trophy = new THREE.Group();
  trophy.name = 'trophy';

  // Vasque : resserrée au fond, largement ouverte en haut.
  const cup = loft([
    { y: 0.25, halfWidth: 0.22, front: 0.22, back: -0.22, chamfer: 0.29 },
    { y: 0.45, halfWidth: 0.42, front: 0.42, back: -0.42, chamfer: 0.29 },
    { y: 0.95, halfWidth: 0.58, front: 0.58, back: -0.58, chamfer: 0.29 },
    { y: 1.15, halfWidth: 0.60, front: 0.60, back: -0.60, chamfer: 0.29 }
  ]);
  trophy.add(mesh(chisel(cup, roughness, random), body));

  // Anses : un profil en C extrudé. `loft` n'empile que selon Y, il ne sait
  // pas suivre une courbe — une extrusion à faible nombre de segments donne
  // l'arc tout en gardant des facettes franches.
  const handle = (side: number) => {
    const profile = new THREE.Shape();
    profile.absarc(0, 0, 0.34, -Math.PI / 2, Math.PI / 2, false);
    profile.absarc(0, 0, 0.21, Math.PI / 2, -Math.PI / 2, true);
    profile.closePath();

    const depth = 0.14;
    const geometry = new THREE.ExtrudeGeometry(profile, {
      depth,
      bevelEnabled: false,
      curveSegments: 3
    });
    geometry.translate(0, 0, -depth / 2);
    // L'ouverture du C regarde les -x : il faut retourner l'anse de gauche.
    geometry.scale(side, 1, 1);

    return mesh(chisel(geometry, roughness, random), accent, [side * 0.58, 0.82, 0]);
  };
  trophy.add(handle(-1));
  trophy.add(handle(1));

  // Pied et socle.
  const stem = loft([
    { y: -0.05, halfWidth: 0.16, front: 0.16, back: -0.16, chamfer: 0.29 },
    { y: 0.28, halfWidth: 0.14, front: 0.14, back: -0.14, chamfer: 0.29 }
  ]);
  trophy.add(mesh(chisel(stem, roughness, random), accent));

  const base = loft([
    { y: -0.45, halfWidth: 0.52, front: 0.52, back: -0.52, chamfer: 0.26 },
    { y: -0.22, halfWidth: 0.46, front: 0.46, back: -0.46, chamfer: 0.26 },
    { y: -0.04, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.28 }
  ]);
  trophy.add(mesh(chisel(base, roughness, random), accent));

  // Recentre pour que la coupe soit cadrée sur son propre milieu.
  const bounds = new THREE.Box3().setFromObject(trophy);
  const center = bounds.getCenter(new THREE.Vector3());
  trophy.children.forEach(child => child.position.sub(center));

  return trophy;
}
