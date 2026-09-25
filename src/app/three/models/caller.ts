import * as THREE from 'three';
import { Ring, chisel, createRandom, loft, mesh } from '../geometry';
import type { CallerDefinition } from '../../../assets/static/callers';

/**
 * Ceux qui appellent pendant le doomscrolling, en low poly.
 *
 * Un **buste** suffit : ces trois-là n'apparaissent que dans une vignette
 * d'appel et, pour John Pork, derrière le comptoir du marchand. Des jambes ne
 * seraient jamais vues et coûteraient autant à tenir à jour que le reste.
 *
 * Les silhouettes suivent ce que les personnages sont réellement, sans quoi
 * aucun n'est reconnaissable :
 *
 * - **John Pork** : une tête de cochon parfaitement réaliste posée sur un
 *   corps humain habillé. Tout le gag tient à ce contraste — groin projeté,
 *   oreilles tombantes, et une chemise de tous les jours en dessous.
 * - **Colonel WhatsApp** : un officier en grande tenue — casquette à visière,
 *   lunettes noires, épaulettes et barrette de décorations. Sa vareuse est du
 *   **vert de WhatsApp**, seule chose qui rattache le personnage à son nom.
 * - **Larry** : un oriental shorthair **noir**. Sa tête est un triangle pointe
 *   en bas et ses oreilles sont démesurées : ce sont ces deux traits, et non
 *   la couleur, qui font qu'on le reconnaît. N'importe quel chat noir aux
 *   proportions ordinaires passerait pour un chat ordinaire.
 */

function material(color: number, roughness = 0.75): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness, metalness: 0 });
}

function part(
  color: number,
  rings: Ring[],
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0]
): THREE.Mesh {
  return mesh(loft(rings), material(color), position, rotation);
}

function box(
  color: number,
  w: number,
  h: number,
  d: number,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0]
): THREE.Mesh {
  return mesh(new THREE.BoxGeometry(w, h, d), material(color), position, rotation);
}

/**
 * Épaules et poitrine, communes aux trois. Le buste est coupé net sous la
 * poitrine, comme la tête de moyai l'est sous la mâchoire.
 */
function shoulders(color: number, halfWidth: number): THREE.Mesh {
  return part(color, [
    { y: -1.35, halfWidth: halfWidth * 1.02, front: 0.42, back: -0.38, chamfer: 0.3 },
    { y: -0.95, halfWidth, front: 0.4, back: -0.36, chamfer: 0.3 },
    { y: -0.62, halfWidth: halfWidth * 0.82, front: 0.34, back: -0.3, chamfer: 0.34 },
    { y: -0.5, halfWidth: halfWidth * 0.5, front: 0.26, back: -0.24, chamfer: 0.38 }
  ]);
}

function neck(color: number): THREE.Mesh {
  return part(color, [
    { y: -0.58, halfWidth: 0.2, front: 0.19, back: -0.17, chamfer: 0.38 },
    { y: -0.24, halfWidth: 0.18, front: 0.18, back: -0.16, chamfer: 0.38 }
  ]);
}

/** Œil sombre posé devant le visage, incliné vers le nez. */
function eye(x: number, y: number, z: number, size: number, color = 0x1a1a1c): THREE.Mesh {
  return box(color, size, size * 0.72, size * 0.5, [x, y, z], [0, 0, x > 0 ? -0.18 : 0.18]);
}

function johnPork(definition: CallerDefinition): THREE.Group {
  const group = new THREE.Group();
  const { skin, accent } = definition;
  const shirt = 0x3c6ea5;

  group.add(shoulders(shirt, 0.82));
  // Col ouvert : deux pans clairs posés sur la chemise, qui donnent au buste
  // sa lecture de vêtement plutôt que de bloc de couleur.
  for (const side of [-1, 1]) {
    group.add(box(accent, 0.3, 0.26, 0.1, [side * 0.22, -0.58, 0.3], [0.2, 0, side * 0.5]));
  }
  group.add(neck(skin));

  // Crâne : large aux joues, aplati sur le dessus, comme une tête de cochon.
  const head = loft([
    { y: -0.26, halfWidth: 0.34, front: 0.3, back: -0.3, chamfer: 0.34 },
    { y: 0.02, halfWidth: 0.47, front: 0.4, back: -0.38, chamfer: 0.32 },
    { y: 0.3, halfWidth: 0.5, front: 0.42, back: -0.42, chamfer: 0.3 },
    { y: 0.6, halfWidth: 0.44, front: 0.36, back: -0.4, chamfer: 0.34 },
    { y: 0.76, halfWidth: 0.3, front: 0.24, back: -0.3, chamfer: 0.38 }
  ]);
  group.add(mesh(chisel(head, 0.02, createRandom(11)), material(skin)));

  // Groin : il part du visage et **avance**. Le `loft` n'empile que selon Y,
  // on le bascule d'un quart de tour pour qu'il pointe vers l'avant.
  const snout = loft([
    { y: 0, halfWidth: 0.24, front: 0.2, back: -0.2, chamfer: 0.36 },
    { y: 0.22, halfWidth: 0.21, front: 0.18, back: -0.18, chamfer: 0.36 },
    { y: 0.28, halfWidth: 0.23, front: 0.2, back: -0.2, chamfer: 0.4 }
  ]);
  snout.rotateX(Math.PI / 2);
  group.add(mesh(snout, material(0xd98d8c), [0, 0.02, 0.36]));
  // Le disque du groin, et ses deux narines.
  group.add(box(0xc9797c, 0.36, 0.3, 0.05, [0, 0.02, 0.66]));
  for (const side of [-1, 1]) {
    group.add(box(0x8d4f55, 0.07, 0.11, 0.04, [side * 0.09, 0.02, 0.69]));
  }

  // Oreilles : larges, plantées haut, la pointe **tombant vers l'avant**. Une
  // première version les faisait moitié moins hautes : elles se lisaient comme
  // deux cornes, et la tête cessait d'être celle d'un cochon.
  for (const side of [-1, 1]) {
    group.add(
      part(
        skin,
        [
          { y: 0, halfWidth: 0.3, front: 0.07, back: -0.07, chamfer: 0.28 },
          { y: 0.34, halfWidth: 0.22, front: 0.05, back: -0.05, chamfer: 0.3 },
          { y: 0.6, halfWidth: 0.03, front: 0.03, back: -0.03, chamfer: 0.3 }
        ],
        [side * 0.4, 0.5, -0.04],
        [0.95, 0, side * 0.5]
      )
    );
  }

  group.add(eye(-0.21, 0.3, 0.38, 0.13));
  group.add(eye(0.21, 0.3, 0.38, 0.13));

  return group;
}

function colonelWhatsapp(definition: CallerDefinition): THREE.Group {
  const group = new THREE.Group();
  const { skin, accent } = definition;
  const braid = 0xd7b14a;

  group.add(shoulders(accent, 0.86));
  // Épaulettes dorées : c'est ce qui dit « officier » avant même la casquette.
  for (const side of [-1, 1]) {
    group.add(box(braid, 0.3, 0.07, 0.34, [side * 0.6, -0.86, 0.02], [0, 0, side * -0.1]));
  }
  // Barrette de décorations, à gauche de la poitrine.
  for (const [index, color] of [0xc4352f, 0x3d6fb5, 0x3d8a55].entries()) {
    group.add(box(color, 0.14, 0.18, 0.04, [-0.36 + index * 0.16, -0.95, 0.4]));
  }
  // Boutonnière centrale.
  for (const y of [-1.2, -1.02, -0.84]) {
    group.add(box(braid, 0.06, 0.06, 0.04, [0, y, 0.42]));
  }
  group.add(neck(skin));

  const head = loft([
    { y: -0.26, halfWidth: 0.28, front: 0.27, back: -0.26, chamfer: 0.36 },
    { y: 0.05, halfWidth: 0.37, front: 0.35, back: -0.33, chamfer: 0.32 },
    { y: 0.42, halfWidth: 0.38, front: 0.34, back: -0.35, chamfer: 0.3 },
    { y: 0.62, halfWidth: 0.34, front: 0.3, back: -0.32, chamfer: 0.34 }
  ]);
  group.add(mesh(chisel(head, 0.015, createRandom(23)), material(skin)));

  group.add(box(skin, 0.14, 0.14, 0.12, [0, 0.06, 0.36]));
  // Lunettes noires : une barre franche, plus lisible qu'une paire de verres.
  group.add(box(0x141416, 0.68, 0.14, 0.08, [0, 0.24, 0.34]));
  // Moustache épaisse, sous le nez.
  group.add(box(0x2a2320, 0.34, 0.09, 0.08, [0, -0.06, 0.34]));

  // Casquette : calotte, plateau et visière. Le plateau déborde vers l'avant,
  // ce qui donne la silhouette de la casquette de grande tenue.
  // La calotte est montée d'un cran et la visière posée sur le bandeau : plus
  // bas, la visière et les lunettes formaient deux barres noires parallèles à
  // trois centimètres d'écart, et l'on ne savait plus laquelle était laquelle.
  group.add(
    part(accent, [
      { y: 0.72, halfWidth: 0.39, front: 0.35, back: -0.37, chamfer: 0.3 },
      { y: 0.98, halfWidth: 0.46, front: 0.46, back: -0.42, chamfer: 0.28 },
      { y: 1.06, halfWidth: 0.47, front: 0.48, back: -0.42, chamfer: 0.28 }
    ])
  );
  group.add(box(0x1c1e22, 0.92, 0.1, 0.88, [0, 0.72, 0.04]));
  group.add(box(0x141416, 0.66, 0.05, 0.4, [0, 0.66, 0.5], [-0.28, 0, 0]));
  group.add(box(braid, 0.17, 0.17, 0.05, [0, 0.92, 0.45]));

  return group;
}

function larry(definition: CallerDefinition): THREE.Group {
  const group = new THREE.Group();
  const { skin, accent } = definition;

  group.add(shoulders(skin, 0.56));
  group.add(neck(skin));

  // Tête en **triangle pointe en bas** : large entre les oreilles, effilée
  // jusqu'au museau. C'est la marque de l'oriental, et ce qui rend le
  // personnage inquiétant sans rien ajouter.
  const head = loft([
    { y: -0.3, halfWidth: 0.14, front: 0.16, back: -0.14, chamfer: 0.4 },
    { y: -0.05, halfWidth: 0.26, front: 0.26, back: -0.24, chamfer: 0.36 },
    { y: 0.26, halfWidth: 0.38, front: 0.32, back: -0.32, chamfer: 0.3 },
    { y: 0.48, halfWidth: 0.4, front: 0.3, back: -0.34, chamfer: 0.3 }
  ]);
  group.add(mesh(chisel(head, 0.015, createRandom(37)), material(skin, 0.85)));

  // Museau long et droit, dans le prolongement du front : un chat au museau
  // court se lit comme un chaton, l'inverse exact de l'effet cherché.
  const muzzle = loft([
    { y: 0, halfWidth: 0.13, front: 0.11, back: -0.11, chamfer: 0.4 },
    { y: 0.26, halfWidth: 0.1, front: 0.09, back: -0.09, chamfer: 0.4 }
  ]);
  muzzle.rotateX(Math.PI / 2);
  group.add(mesh(muzzle, material(0x34373f, 0.85), [0, -0.16, 0.14]));
  group.add(box(0x6b4550, 0.09, 0.07, 0.05, [0, -0.08, 0.3]));

  // Oreilles démesurées, plantées bas et largement écartées : elles font
  // presque la hauteur du crâne.
  for (const side of [-1, 1]) {
    group.add(
      part(
        skin,
        [
          { y: 0, halfWidth: 0.24, front: 0.05, back: -0.05, chamfer: 0.28 },
          { y: 0.58, halfWidth: 0.02, front: 0.02, back: -0.02, chamfer: 0.3 }
        ],
        [side * 0.3, 0.4, -0.04],
        [0.1, 0, side * 0.32]
      )
    );
    // Intérieur d'oreille, à peine plus clair.
    group.add(
      part(
        0x5c3d46,
        [
          { y: 0, halfWidth: 0.15, front: 0.02, back: -0.02, chamfer: 0.28 },
          { y: 0.4, halfWidth: 0.015, front: 0.01, back: -0.01, chamfer: 0.3 }
        ],
        [side * 0.3, 0.42, 0.02],
        [0.1, 0, side * 0.32]
      )
    );
  }

  // Yeux verts, immenses et fixes : c'est le regard qui fait le personnage.
  group.add(eye(-0.16, 0.16, 0.28, 0.17, accent));
  group.add(eye(0.16, 0.16, 0.28, 0.17, accent));
  group.add(box(0x101014, 0.05, 0.13, 0.03, [-0.16, 0.16, 0.34]));
  group.add(box(0x101014, 0.05, 0.13, 0.03, [0.16, 0.16, 0.34]));

  return group;
}

/** Plus grande dimension visée, pour que les trois tiennent la même place. */
const TARGET_SIZE = 2.6;

export function createCaller(definition: CallerDefinition): THREE.Group {
  const group =
    definition.id === 'john'
      ? johnPork(definition)
      : definition.id === 'colonel'
        ? colonelWhatsapp(definition)
        : larry(definition);
  group.name = `caller-${definition.id}`;

  // Recentrés puis ramenés au même gabarit, comme les brainrots : la casquette
  // du colonel et les oreilles de Larry n'ont pas le même encombrement, et
  // sans cela l'un sortirait du cadre de la vignette où l'autre flotterait.
  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.children.forEach(child => child.position.sub(center));

  const size = bounds.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z);
  if (largest > 0) group.scale.setScalar(TARGET_SIZE / largest);

  return group;
}
