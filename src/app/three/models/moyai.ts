import * as THREE from 'three';
import { mesh } from '../geometry';
import { MOYAI_MESH } from './moyai-mesh';

/**
 * Tête de moyai en low poly, modélisée dans Blender par
 * [tools/blender/moyai.py](../../../../tools/blender/moyai.py), qui écrit
 * `moyai-mesh.ts`. La forme reprend celle de How to Fish — des blocs simples
 * et gonflés, fondus en une seule pierre puis ramenés en facettes plates — sur
 * les traits des moai de Rapa Nui : arcade lourde en surplomb, orbites en
 * fentes sous elle, nez long qui s'évase, lèvres pincées projetées, menton
 * relevé, oreilles longues et rectangulaires.
 *
 * Seule la tête est modélisée, coupée net juste sous la mâchoire : c'est la
 * silhouette attendue pour un moyai.
 *
 * Elle était auparavant construite ici, section par section (`loft`). Ce qui
 * reste dans ce fichier : les matériaux nommés, le recentrage et les palettes.
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
  /** Matière de la statue ; la pierre grise d'origine par défaut. */
  palette?: MoyaiPalette;
}

/**
 * Les sommets du modèle, lus une fois. Chaque statue reçoit ses propres
 * géométries, que `disposeObject` libère avec elle : partager les mêmes
 * aurait laissé une statue démontée en emporter le tampon GPU pour toutes.
 */
let positions: THREE.Float32BufferAttribute | null = null;

/** Une géométrie par matériau, sur les mêmes sommets. */
function moyaiPart(indices: readonly number[]): THREE.BufferGeometry {
  positions ??= new THREE.Float32BufferAttribute(MOYAI_MESH.positions, 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', positions.clone());
  geometry.setIndex([...indices]);
  geometry.computeVertexNormals();
  return geometry;
}

export function createMoyai(options: MoyaiOptions = {}): THREE.Group {
  // Les matériaux sont nommés : `applyMoyaiPalette` les retrouve ainsi pour
  // changer la matière d'une statue déjà construite.
  const stone = new THREE.MeshStandardMaterial({
    name: 'stone',
    color: MOYAI_PALETTE.stone,
    flatShading: true,
    roughness: 0.95,
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

  // Deux pièces sur les mêmes sommets, une par matériau : la pierre et le
  // fond des orbites. Un seul maillage à deux matériaux échapperait à
  // `applyMoyaiPalette`, qui ne lit qu'un matériau par maillage.
  moyai.add(mesh(moyaiPart(MOYAI_MESH.stone), stone));
  moyai.add(mesh(moyaiPart(MOYAI_MESH.cavity), cavity));

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
