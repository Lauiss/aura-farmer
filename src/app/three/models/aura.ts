import * as THREE from 'three';

/**
 * L'aura elle-même : les éclats projetés à chaque clic, et le halo qui entoure
 * la statue une fois la fortune faite.
 *
 * Tout est en `flatShading` comme le reste du jeu, mais avec une émission
 * franche : l'aura doit se voir sur un décor sombre sans dépendre de
 * l'orientation des lumières.
 */

/** Ambre du jeu, repris de `menu-theme.scss`. */
const AURA_COLOR = 0xe8b84b;
const AURA_GLOW = 0xff9f45;

/**
 * Un éclat d'aura : un octaèdre minuscule, donc huit faces franches. Assez
 * gros pour se lire en vol, assez simple pour qu'on puisse en projeter
 * plusieurs dizaines sans y penser.
 */
export function createAuraShard(): THREE.Mesh {
  const geometry = new THREE.OctahedronGeometry(0.16, 0);
  const material = new THREE.MeshStandardMaterial({
    color: AURA_COLOR,
    emissive: AURA_GLOW,
    emissiveIntensity: 1.1,
    flatShading: true,
    transparent: true,
    roughness: 0.4,
    metalness: 0,
    // Les éclats se croisent en vol : sans cela, le plus proche découpe un
    // trou dans celui de derrière au lieu de s'y superposer.
    depthWrite: false
  });
  const shard = new THREE.Mesh(geometry, material);
  shard.visible = false;
  return shard;
}

/**
 * Halo qui entoure la tête, à partir d'un million d'aura. C'est une coque
 * peinte **par l'intérieur** en fondu additif : vue de l'extérieur, seules ses
 * arêtes rasantes s'illuminent, ce qui borde la statue d'une lueur au lieu de
 * la masquer derrière une boule opaque.
 *
 * `level` va de 1 à 3 et commande l'intensité, jamais la géométrie : changer
 * de palier ne doit pas reconstruire la coque.
 */
export function createAuraShell(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'aura-shell';

  // Deux coques de rayons proches, qui tourneront en sens inverse : leurs
  // facettes se croisent et l'ensemble scintille sans animation de matériau.
  // Rayons calés sur la tête, dont la demi-hauteur est d'environ 1,34 une fois
  // recentrée : plus large, la coque sortait du cadre par le haut et par le
  // bas et virait au voile plein écran au lieu du halo.
  // Subdivision 1 et non 0 : à vingt faces, la coque se lisait comme un grand
  // losange plat posé devant la scène — une vitre sale plutôt qu'un halo. À
  // quatre-vingts, sa silhouette est ronde et ne dessine plus d'arête franche.
  for (const [index, radius] of [1.62, 1.8].entries()) {
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 1),
      new THREE.MeshBasicMaterial({
        color: index === 0 ? AURA_COLOR : AURA_GLOW,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    shell.name = `shell-${index}`;
    group.add(shell);
  }

  return group;
}

/** Opacité de chaque coque selon le palier atteint. */
export function auraShellOpacity(level: number): [number, number] {
  switch (level) {
    case 1:
      return [0.07, 0.04];
    case 2:
      return [0.13, 0.07];
    case 3:
      return [0.2, 0.12];
    default:
      return [0, 0];
  }
}
