import * as THREE from 'three';
import { chisel, createRandom, loft, mesh } from '../geometry';

/**
 * Tête de moyai en low poly, construite d'après les proportions relevées sur
 * les moai de Rapa Nui : arcade sourcilière en surplomb, nez allongé dépassant
 * le plan du visage, lèvres pincées projetées, menton saillant et oreilles
 * oblongues descendant jusqu'à la mâchoire.
 *
 * Seule la tête est modélisée, coupée net juste sous la mâchoire : c'est la
 * silhouette attendue pour un moyai.
 */

export const MOYAI_PALETTE = {
  stone: 0x9a968d,
  stoneDark: 0x77746c,
  cavity: 0x2b2a27
} as const;

/** Couleurs d'une matière, une par matériau du moyai. */
export interface MoyaiPalette {
  stone: number;
  stoneDark: number;
  cavity: number;
  /** Lueur propre des creux (yeux, bouche), pour les matières magiques. */
  glow?: number;
  /** Lueur propre de la pierre, discrète : l'or et le diamant scintillent. */
  sheen?: number;
}

export interface MoyaiOptions {
  /** Amplitude du bruit appliqué aux sommets pour l'aspect taillé au burin. */
  roughness?: number;
  /** Graine du bruit : une même graine redonne exactement la même tête. */
  seed?: number;
  /** Matière de la statue ; la pierre grise d'origine par défaut. */
  palette?: MoyaiPalette;
}

export function createMoyai(options: MoyaiOptions = {}): THREE.Group {
  const { roughness = 0.035, seed = 1722 } = options;
  const random = createRandom(seed);

  // Les matériaux sont nommés : `applyMoyaiPalette` les retrouve ainsi pour
  // changer la matière d'une statue déjà construite.
  const stone = new THREE.MeshStandardMaterial({
    name: 'stone',
    color: MOYAI_PALETTE.stone,
    flatShading: true,
    roughness: 0.95,
    metalness: 0
  });
  const stoneDark = new THREE.MeshStandardMaterial({
    name: 'stoneDark',
    color: MOYAI_PALETTE.stoneDark,
    flatShading: true,
    roughness: 1,
    metalness: 0
  });
  const cavity = new THREE.MeshStandardMaterial({
    name: 'cavity',
    color: MOYAI_PALETTE.cavity,
    flatShading: true,
    roughness: 1,
    metalness: 0
  });

  const moyai = new THREE.Group();
  moyai.name = 'moyai';

  // --- Tête ---------------------------------------------------------------
  // Le profil se lit de bas en haut : base coupée net juste sous la mâchoire,
  // menton saillant, creux sous la lèvre, joue, ligne des yeux, arcade en
  // surplomb, puis front fuyant.
  const head = loft([
    { y: -0.58, halfWidth: 0.60, front: 0.30, back: -0.47, chamfer: 0.26 },
    { y: -0.30, halfWidth: 0.56, front: 0.31, back: -0.46, chamfer: 0.28 },
    { y: 0.00, halfWidth: 0.56, front: 0.44, back: -0.46, chamfer: 0.24 },
    { y: 0.18, halfWidth: 0.60, front: 0.56, back: -0.48, chamfer: 0.22 },
    { y: 0.40, halfWidth: 0.63, front: 0.46, back: -0.49, chamfer: 0.2 },
    { y: 0.72, halfWidth: 0.66, front: 0.48, back: -0.50, chamfer: 0.19 },
    { y: 1.05, halfWidth: 0.68, front: 0.44, back: -0.51, chamfer: 0.18 },
    { y: 1.44, halfWidth: 0.695, front: 0.43, back: -0.51, chamfer: 0.18 },
    // Deux sections très rapprochées : la marche entre elles forme le surplomb.
    { y: 1.50, halfWidth: 0.70, front: 0.59, back: -0.51, chamfer: 0.17 },
    { y: 1.68, halfWidth: 0.695, front: 0.57, back: -0.505, chamfer: 0.17 },
    { y: 1.86, halfWidth: 0.68, front: 0.44, back: -0.50, chamfer: 0.19 },
    { y: 2.10, halfWidth: 0.60, front: 0.26, back: -0.46, chamfer: 0.26 }
  ]);
  moyai.add(mesh(chisel(head, roughness, random), stone));

  // --- Orbites ------------------------------------------------------------
  // Cavités creusées sous l'arcade, en retrait du plan du visage.
  const socket = (side: number) =>
    chisel(
      loft([
        { y: 1.00, halfWidth: 0.24, front: 0.30, back: 0.04, chamfer: 0.3 },
        { y: 1.24, halfWidth: 0.28, front: 0.35, back: 0.02, chamfer: 0.24 },
        { y: 1.50, halfWidth: 0.23, front: 0.30, back: 0.04, chamfer: 0.32 }
      ]),
      roughness * 0.4,
      random
    ).translate(side * 0.35, 0, 0);
  moyai.add(mesh(socket(-1), cavity));
  moyai.add(mesh(socket(1), cavity));

  // --- Nez ----------------------------------------------------------------
  // Il part de sous l'arcade et descend en s'élargissant ; sa pointe est le
  // point le plus avancé de toute la tête.
  const nose = loft([
    { y: 0.68, halfWidth: 0.27, front: 0.72, back: 0.30, chamfer: 0.3 },
    { y: 0.82, halfWidth: 0.26, front: 0.77, back: 0.30, chamfer: 0.28 },
    { y: 1.08, halfWidth: 0.20, front: 0.68, back: 0.30, chamfer: 0.3 },
    { y: 1.32, halfWidth: 0.17, front: 0.60, back: 0.30, chamfer: 0.32 },
    { y: 1.52, halfWidth: 0.15, front: 0.54, back: 0.30, chamfer: 0.34 }
  ]);
  moyai.add(mesh(chisel(nose, roughness * 0.5, random), stone));

  // Ailes du nez : la volute des narines, réduite à deux petits volumes.
  const nostril = (side: number) =>
    chisel(
      loft([
        { y: 0.64, halfWidth: 0.10, front: 0.64, back: 0.40, chamfer: 0.35 },
        { y: 0.80, halfWidth: 0.09, front: 0.66, back: 0.40, chamfer: 0.35 }
      ]),
      roughness * 0.3,
      random
    ).translate(side * 0.31, 0, 0);
  moyai.add(mesh(nostril(-1), stone));
  moyai.add(mesh(nostril(1), stone));

  // --- Bouche -------------------------------------------------------------
  // Lèvres fines projetées en avant du plan du visage, légèrement tombantes.
  const lips = loft([
    { y: 0.44, halfWidth: 0.30, front: 0.50, back: 0.36, chamfer: 0.34 },
    { y: 0.53, halfWidth: 0.34, front: 0.57, back: 0.36, chamfer: 0.3 },
    { y: 0.62, halfWidth: 0.30, front: 0.50, back: 0.36, chamfer: 0.34 }
  ]);
  moyai.add(mesh(chisel(lips, roughness * 0.3, random), stoneDark));

  // --- Oreilles -----------------------------------------------------------
  // Oblongues, de la hauteur de l'arcade jusqu'à la mâchoire, plaquées aux
  // tempes et à peine détachées.
  const ear = (side: number) =>
    chisel(
      loft([
        { y: 0.22, halfWidth: 0.09, front: 0.20, back: -0.28, chamfer: 0.34 },
        { y: 0.60, halfWidth: 0.10, front: 0.30, back: -0.32, chamfer: 0.3 },
        { y: 1.20, halfWidth: 0.10, front: 0.32, back: -0.32, chamfer: 0.3 },
        { y: 1.54, halfWidth: 0.09, front: 0.24, back: -0.28, chamfer: 0.34 }
      ]),
      roughness * 0.4,
      random
    ).translate(side * 0.65, 0, 0);
  moyai.add(mesh(ear(-1), stone));
  moyai.add(mesh(ear(1), stone));

  // Recentre le groupe pour que toute rotation se fasse autour de la tête.
  const bounds = new THREE.Box3().setFromObject(moyai);
  const center = bounds.getCenter(new THREE.Vector3());
  moyai.children.forEach(child => child.position.sub(center));

  if (options.palette) applyMoyaiPalette(moyai, options.palette);
  return moyai;
}

/**
 * Change la matière d'une statue en place, sans la reconstruire. `null`
 * revient à la pierre d'origine. Les accessoires, qui ont leurs propres
 * matériaux, ne sont pas touchés.
 */
export function applyMoyaiPalette(moyai: THREE.Object3D, palette: MoyaiPalette | null): void {
  const colors: MoyaiPalette = palette ?? MOYAI_PALETTE;
  moyai.traverse(child => {
    const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!material || !('emissive' in material)) return;
    switch (material.name) {
      case 'stone':
        material.color.setHex(colors.stone);
        material.emissive.setHex(colors.sheen ?? 0);
        break;
      case 'stoneDark':
        material.color.setHex(colors.stoneDark);
        material.emissive.setHex(colors.sheen ?? 0);
        break;
      case 'cavity':
        material.color.setHex(colors.cavity);
        material.emissive.setHex(colors.glow ?? 0);
        break;
    }
  });
}
