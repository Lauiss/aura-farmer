import * as THREE from 'three';
import { Ring, loft, mesh } from '../geometry';

/**
 * La gemme, seconde monnaie du jeu. Taille de brillant simplifiée : une table
 * plate en haut, une couronne évasée, puis une pointe de pavillon — la
 * silhouette que tout le monde lit comme « gemme », même en icône de 24 px.
 */

const GEM_COLOR = 0x5fd4ff;
const GEM_GLOW = 0x1f6c94;

export function createGem(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'gem';

  const rings: Ring[] = [
    // Pointe basse du pavillon.
    { y: -1.15, halfWidth: 0.05, front: 0.05, back: -0.05, chamfer: 0.4 },
    // Rondiste : le plus large, juste sous la couronne.
    { y: -0.1, halfWidth: 0.85, front: 0.85, back: -0.85, chamfer: 0.4 },
    // Couronne, qui se resserre vers la table.
    { y: 0.32, halfWidth: 0.62, front: 0.62, back: -0.62, chamfer: 0.4 },
    // Table plate.
    { y: 0.45, halfWidth: 0.52, front: 0.52, back: -0.52, chamfer: 0.4 }
  ];

  const gem = mesh(
    loft(rings),
    new THREE.MeshStandardMaterial({
      color: GEM_COLOR,
      emissive: GEM_GLOW,
      emissiveIntensity: 0.55,
      flatShading: true,
      roughness: 0.25,
      // Bas volontairement : sans carte d'environnement, un métal élevé rend
      // presque noir.
      metalness: 0.1
    })
  );
  gem.name = 'stone';
  group.add(gem);

  return group;
}
