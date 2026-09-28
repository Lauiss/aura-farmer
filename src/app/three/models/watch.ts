import * as THREE from 'three';
import { Ring, loft, mesh } from '../geometry';
import type { WatchDefinition } from '../../../assets/static/collectibles';

/**
 * Les dix montres de la collection, en low poly.
 *
 * Un seul fichier paramétré, comme les brainrots — mais les paramètres portent
 * ici des différences de **forme** et non de teinte : boîtier carré ou rond,
 * butées de chantier ou lunette cannelée, affichage numérique ou trois
 * compteurs. Dix boîtiers identiques recolorés auraient fait dix fois la même
 * montre, ce qui est précisément ce qu'on cherche à éviter.
 *
 * La montre est présentée **de trois quarts, bracelet ouvert** : à plat, un
 * bracelet fermé se lit comme un anneau, et de face on ne voit qu'un disque.
 */

function metal(color: number, roughness = 0.35): THREE.MeshStandardMaterial {
  // Métallisation basse et éclat porté par la couleur : sans carte
  // d'environnement, un `metalness` élevé rend presque noir.
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness, metalness: 0.25 });
}

function matte(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0 });
}

function glow(color: number, intensity = 0.55): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    flatShading: true,
    roughness: 0.4,
    metalness: 0
  });
}

/** Demi-largeur du boîtier à une hauteur donnée, selon sa forme. */
function caseRings(shape: WatchDefinition['case']): Ring[] {
  const ring = (y: number, half: number, chamfer: number): Ring =>
    ({ y, halfWidth: half, front: half, back: -half, chamfer });

  switch (shape) {
    // Le carré de la montre numérique : angles à peine cassés.
    case 'square':
      return [ring(-0.16, 0.62, 0.08), ring(0.1, 0.66, 0.08), ring(0.2, 0.6, 0.1)];
    // Coussin : carré aux angles largement arrondis, plus épais.
    case 'cushion':
      return [ring(-0.2, 0.62, 0.26), ring(0.12, 0.7, 0.28), ring(0.26, 0.62, 0.32)];
    // Tonneau : plus haut que large, flancs galbés.
    case 'tonneau':
      return [
        { y: -0.2, halfWidth: 0.46, front: 0.66, back: -0.66, chamfer: 0.3 },
        { y: 0.08, halfWidth: 0.54, front: 0.76, back: -0.76, chamfer: 0.32 },
        { y: 0.22, halfWidth: 0.46, front: 0.66, back: -0.66, chamfer: 0.36 }
      ];
    // Rond : un octogone bien chanfreiné se lit comme un cercle en low poly.
    default:
      return [ring(-0.18, 0.6, 0.41), ring(0.1, 0.66, 0.41), ring(0.22, 0.58, 0.41)];
  }
}

/** La lunette, posée sur le boîtier. C'est elle qui signe la marque. */
function bezel(definition: WatchDefinition): THREE.Object3D {
  const group = new THREE.Group();
  const body = metal(definition.metal, 0.3);

  switch (definition.bezel) {
    // Cannelures rayonnantes : la lunette qu'on reconnaît de loin.
    case 'fluted': {
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        group.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.17), body,
          [Math.sin(angle) * 0.62, 0.24, Math.cos(angle) * 0.62], [0, -angle, 0]));
      }
      break;
    }
    // Lunette tournante crantée d'une plongeuse, avec son repère à midi.
    case 'dive': {
      group.add(mesh(new THREE.TorusGeometry(0.62, 0.1, 4, 14), metal(definition.face, 0.45),
        [0, 0.24, 0], [Math.PI / 2, 0, 0]));
      group.add(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), glow(definition.accent), [0, 0.3, 0.62]));
      break;
    }
    // Vis apparentes : six têtes plantées dans la lunette.
    case 'screws': {
      group.add(mesh(new THREE.TorusGeometry(0.64, 0.11, 4, 12), body, [0, 0.24, 0], [Math.PI / 2, 0, 0]));
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + 0.3;
        group.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 6), metal(definition.accent, 0.25),
          [Math.sin(angle) * 0.64, 0.3, Math.cos(angle) * 0.64]));
      }
      break;
    }
    // Butées de protection : quatre blocs qui débordent du boîtier et le
    // protègent. C'est la silhouette entière qui change, pas un détail.
    case 'guard': {
      for (const [x, z] of [[0.74, 0], [-0.74, 0], [0, 0.74], [0, -0.74]]) {
        group.add(mesh(new THREE.BoxGeometry(x === 0 ? 0.5 : 0.24, 0.34, z === 0 ? 0.5 : 0.24),
          matte(definition.strap), [x, 0.14, z]));
      }
      group.add(mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), glow(definition.accent, 0.4), [0.76, 0.14, 0]));
      break;
    }
    default:
      group.add(mesh(new THREE.TorusGeometry(0.62, 0.075, 4, 14), body, [0, 0.24, 0], [Math.PI / 2, 0, 0]));
  }
  return group;
}

/** Le cadran : ce qu'on lit sur la montre. */
function dial(definition: WatchDefinition): THREE.Object3D {
  const group = new THREE.Group();
  const y = 0.27;

  group.add(mesh(new THREE.CircleGeometry(0.56, 12), matte(definition.face), [0, y, 0], [-Math.PI / 2, 0, 0]));

  switch (definition.dial) {
    // Affichage numérique : un pavé sombre traversé de segments clairs.
    case 'digital': {
      group.add(mesh(new THREE.BoxGeometry(0.78, 0.03, 0.42), matte(definition.face), [0, y + 0.02, 0]));
      for (let i = 0; i < 4; i++) {
        group.add(mesh(new THREE.BoxGeometry(0.1, 0.04, 0.22), glow(definition.accent, 0.8),
          [-0.27 + i * 0.18, y + 0.04, -0.02]));
      }
      break;
    }
    // Trois compteurs, comme un chronographe. Ils creusent le cadran : c'est
    // ce qui distingue un chronographe d'une montre à deux aiguilles.
    case 'chrono': {
      for (const [x, z] of [[-0.24, -0.06], [0.24, -0.06], [0, 0.26]]) {
        group.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 10), matte(definition.accent), [x, y + 0.02, z]));
      }
      group.add(mesh(new THREE.BoxGeometry(0.04, 0.03, 0.4), matte(0x1a1a1a), [0, y + 0.05, -0.14], [0, 0.5, 0]));
      break;
    }
    // Deux aiguilles et quatre index : le strict nécessaire pour lire l'heure.
    default: {
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        group.add(mesh(new THREE.BoxGeometry(0.05, 0.03, 0.12), glow(definition.accent, 0.35),
          [Math.sin(angle) * 0.42, y + 0.02, Math.cos(angle) * 0.42], [0, -angle, 0]));
      }
      group.add(mesh(new THREE.BoxGeometry(0.045, 0.03, 0.38), matte(definition.accent), [0, y + 0.04, -0.15], [0, 0.35, 0]));
      group.add(mesh(new THREE.BoxGeometry(0.04, 0.03, 0.26), matte(definition.accent), [0, y + 0.06, 0.1], [0, -1.4, 0]));
      group.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 6), metal(definition.metal), [0, y + 0.07, 0]));
    }
  }
  return group;
}

/**
 * Le bracelet, ouvert en arc de part et d'autre du boîtier. Fermé en anneau, il
 * se lisait comme le halo des reliques ; ouvert, on voit qu'il s'agit d'une
 * montre qu'on vient de poser.
 */
function band(definition: WatchDefinition): THREE.Object3D {
  const group = new THREE.Group();
  const steel = definition.band === 'steel';
  const material = steel ? metal(definition.strap, 0.4) : matte(definition.strap);

  for (const side of [-1, 1]) {
    // Un bracelet d'acier est fait de maillons ; le cuir et la résine sont
    // d'une pièce. La différence se voit sur la tranche, à taille de vignette.
    const links = steel ? 5 : 3;
    for (let i = 0; i < links; i++) {
      const t = (i + 0.7) / links;
      const width = definition.band === 'nato' ? 0.5 : 0.46 - t * 0.08;
      group.add(mesh(
        new THREE.BoxGeometry(width, steel ? 0.14 : 0.1, 0.72 / links),
        material,
        [0, 0.06 - t * t * 0.4, side * (0.55 + t * 0.62)],
        [side * t * 0.85, 0, 0]
      ));
    }
    // Les surpiqûres du cuir et les rayures de la toile, qui les séparent.
    if (definition.band === 'leather' || definition.band === 'nato') {
      group.add(mesh(
        new THREE.BoxGeometry(definition.band === 'nato' ? 0.12 : 0.36, 0.12, 0.56),
        matte(definition.band === 'nato' ? definition.accent : definition.face),
        [0, 0.02, side * 0.9],
        [side * 0.5, 0, 0]
      ));
    }
  }
  return group;
}

/**
 * Plus grande dimension visée, pour que les dix tiennent la même place.
 *
 * Le bracelet enfle la boîte englobante alors que c'est le **cadran** qu'on
 * reconnaît : à vignette de quarante pixels, un bracelet long réduisait la
 * montre à un point. Il est court, et la caméra s'est rapprochée.
 */
const TARGET_SIZE = 2.6;

export function createWatch(definition: WatchDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = `watch-${definition.id}`;

  group.add(mesh(loft(caseRings(definition.case)), metal(definition.metal)));
  group.add(bezel(definition));
  group.add(dial(definition));
  group.add(band(definition));

  // Couronne de remontoir, sur le flanc droit : elle dit le sens de l'objet.
  group.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 6), metal(definition.metal, 0.3),
    [0.68, 0.04, 0], [0, 0, Math.PI / 2]));

  // Recentré puis ramené au gabarit commun, comme les brainrots : une montre
  // de chantier à butées déborde de moitié sur une montre habillée.
  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.children.forEach(child => child.position.sub(center));
  const size = bounds.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z);
  if (largest > 0) group.scale.setScalar(TARGET_SIZE / largest);

  return group;
}
