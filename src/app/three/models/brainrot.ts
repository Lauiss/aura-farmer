import * as THREE from 'three';
import { Ring, chisel, createRandom, loft, mesh } from '../geometry';
import type { BossDefinition } from '../../../assets/static/bosses';

/**
 * Boss des battles d'aura, en low poly.
 *
 * Les brainrots sont des collages précis, pas des formes vagues : un requin
 * bleu **couché à l'horizontale sur trois pattes en baskets**, une bûche de
 * bois à la batte, un singe-arbre à chapeau doré, un cactus-éléphant en
 * sandales, un crocodile fondu dans un bombardier bimoteur. Chaque silhouette
 * suit la description du personnage, faute de quoi aucun n'est reconnaissable.
 *
 * Toutes tiennent dans le même gabarit que la tête de moyai, pour qu'on puisse
 * les porter à sa place sans retoucher le cadrage.
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

/** Volume taillé à la main, pour les corps qui doivent paraître organiques. */
function rough(
  color: number,
  rings: Ring[],
  seed: number,
  amount = 0.04,
  position: [number, number, number] = [0, 0, 0]
): THREE.Mesh {
  return mesh(chisel(loft(rings), amount, createRandom(seed)), material(color), position);
}

/**
 * Volume couché : `loft` n'empile que selon Y, on le bascule donc d'un quart
 * de tour pour obtenir un corps qui pointe vers l'avant. Même procédé que le
 * téléphone du doomscrolling.
 */
function lying(color: number, rings: Ring[], position: [number, number, number]): THREE.Mesh {
  const geometry = loft(rings);
  geometry.rotateX(Math.PI / 2);
  return mesh(geometry, material(color), position);
}

/** Deux yeux ronds : c'est ce qui rend la chose vivante. */
function eyes(position: [number, number, number], spread: number, scale = 1): THREE.Group {
  const group = new THREE.Group();
  const white = new THREE.MeshBasicMaterial({ color: 0xf4f1e8 });
  const pupil = new THREE.MeshBasicMaterial({ color: 0x14120f });
  const [x, y, z] = position;
  for (const side of [-1, 1]) {
    group.add(mesh(new THREE.SphereGeometry(0.19 * scale, 6, 5), white, [x + side * spread, y, z]));
    group.add(mesh(new THREE.SphereGeometry(0.095 * scale, 5, 4), pupil, [x + side * spread, y, z + 0.13 * scale]));
  }
  return group;
}

/** Une jambe terminée par une basket, pour le requin. */
function sneakerLeg(x: number, z: number, top: number, shoe: number): THREE.Group {
  const group = new THREE.Group();
  group.add(
    part(0x8a8f96, [
      { y: -1.0, halfWidth: 0.13, front: 0.13, back: -0.13, chamfer: 0.32 },
      { y: top, halfWidth: 0.17, front: 0.17, back: -0.17, chamfer: 0.32 }
    ], [x, 0, z])
  );
  // La basket : semelle claire sous une tige colorée, museau en avant.
  group.add(
    part(shoe, [
      { y: -1.28, halfWidth: 0.23, front: 0.42, back: -0.22, chamfer: 0.3 },
      { y: -1.06, halfWidth: 0.21, front: 0.3, back: -0.22, chamfer: 0.3 }
    ], [x, 0, z + 0.08])
  );
  group.add(
    part(0xf2efe6, [
      { y: -1.34, halfWidth: 0.24, front: 0.44, back: -0.24, chamfer: 0.3 },
      { y: -1.26, halfWidth: 0.24, front: 0.44, back: -0.24, chamfer: 0.3 }
    ], [x, 0, z + 0.08])
  );
  return group;
}

/** Teinte de peau, pour ce qui n'est pas censé être un membre d'animal. */
const SKIN = 0xe0b08a;

/**
 * Un pied humain vu de trois quarts : talon, voûte, avant-pied élargi et cinq
 * orteils. Assez de volumes pour qu'on lise un pied et pas une palme.
 */
function humanFoot(x: number, z: number, color: number): THREE.Group {
  const group = new THREE.Group();

  // Talon et cheville.
  group.add(
    part(color, [
      { y: -1.52, halfWidth: 0.24, front: -0.02, back: -0.34, chamfer: 0.34 },
      { y: -1.2, halfWidth: 0.23, front: 0.04, back: -0.32, chamfer: 0.34 }
    ], [x, 0, z])
  );
  // Corps du pied, qui s'élargit vers l'avant.
  group.add(
    part(color, [
      { y: -1.56, halfWidth: 0.3, front: 0.62, back: -0.34, chamfer: 0.22 },
      { y: -1.34, halfWidth: 0.28, front: 0.5, back: -0.34, chamfer: 0.26 },
      { y: -1.18, halfWidth: 0.24, front: 0.22, back: -0.3, chamfer: 0.3 }
    ], [x, 0, z])
  );
  // Cinq orteils, du plus gros au plus petit.
  const toes = [0.1, 0.075, 0.065, 0.055, 0.045];
  toes.forEach((radius, index) => {
    const offset = -0.2 + index * 0.105;
    group.add(
      mesh(
        new THREE.SphereGeometry(radius, 5, 4),
        material(color),
        [x + offset, -1.53 + radius * 0.4, z + 0.66 - index * 0.035]
      )
    );
  });
  return group;
}

/** Rangée de dents pointues le long d'une mâchoire. */
function teeth(y: number, zFront: number, zBack: number, halfWidth: number): THREE.Mesh {
  return part(0xf2efe6, [
    { y: y - 0.09, halfWidth: halfWidth * 0.94, front: zFront, back: zBack, chamfer: 0.24 },
    { y: y + 0.02, halfWidth, front: zFront + 0.03, back: zBack, chamfer: 0.24 }
  ]);
}

/** Hélice à trois pales, pour le bombardier. */
function propeller(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const blade = material(0x3d444d);
  for (let i = 0; i < 3; i++) {
    const shape = loft([
      { y: 0, halfWidth: 0.06, front: 0.04, back: -0.04, chamfer: 0.3 },
      { y: 0.62, halfWidth: 0.1, front: 0.03, back: -0.03, chamfer: 0.3 }
    ]);
    const arm = new THREE.Mesh(shape, blade);
    arm.rotation.z = (i * Math.PI * 2) / 3;
    arm.position.set(x, 0, z);
    group.add(arm);
  }
  group.add(mesh(new THREE.SphereGeometry(0.13, 6, 5), material(0x6a727c), [x, 0, z + 0.05]));
  return group;
}

/** Bec d'oiseau, pointé vers l'avant. */
function beak(color: number, y: number, z: number, length: number): THREE.Mesh {
  return part(color, [
    { y: y - 0.09, halfWidth: 0.16, front: z + length, back: z, chamfer: 0.34 },
    { y: y + 0.09, halfWidth: 0.18, front: z + length * 0.8, back: z, chamfer: 0.34 }
  ]);
}

/** Aile repliée le long du corps, pour les oiseaux. */
function folded(color: number, side: number, y: number): THREE.Mesh {
  return part(color, [
    { y: y - 0.7, halfWidth: 0.12, front: 0.34, back: -0.4, chamfer: 0.35 },
    { y: y, halfWidth: 0.2, front: 0.4, back: -0.46, chamfer: 0.32 },
    { y: y + 0.45, halfWidth: 0.16, front: 0.34, back: -0.4, chamfer: 0.35 }
  ], [side * 0.5, 0, 0], [0, 0, side * 0.12]);
}

function shapeOf(definition: BossDefinition): THREE.Group {
  const group = new THREE.Group();
  const { color, accent } = definition;

  switch (definition.shape) {
    /**
     * Tralalero Tralala : requin bleu **couché à l'horizontale**, museau en
     * avant, dressé sur trois pattes chaussées de baskets bleues. Le corps
     * vertical de la première version ne ressemblait à rien.
     */
    case 'shark': {
      const body: Ring[] = [
        { y: -1.5, halfWidth: 0.1, front: 0.1, back: -0.1, chamfer: 0.34 },
        { y: -0.9, halfWidth: 0.34, front: 0.3, back: -0.3, chamfer: 0.32 },
        { y: 0, halfWidth: 0.56, front: 0.52, back: -0.52, chamfer: 0.3 },
        { y: 0.85, halfWidth: 0.5, front: 0.46, back: -0.46, chamfer: 0.3 },
        { y: 1.45, halfWidth: 0.24, front: 0.3, back: -0.26, chamfer: 0.34 }
      ];
      // Couché : la queue derrière, le museau devant.
      group.add(lying(color, body, [0, 0.35, 0]));

      // Ventre clair, tout le long du dessous.
      const belly = loft([
        { y: -0.85, halfWidth: 0.24, front: 0.16, back: -0.16, chamfer: 0.34 },
        { y: 0.9, halfWidth: 0.34, front: 0.18, back: -0.18, chamfer: 0.32 }
      ]);
      belly.rotateX(Math.PI / 2);
      group.add(mesh(belly, material(accent), [0, 0.02, 0]));

      // Aileron dorsal, dressé au milieu du dos.
      group.add(
        part(color, [
          { y: 0.72, halfWidth: 0.26, front: -0.05, back: -0.55, chamfer: 0.2 },
          { y: 1.45, halfWidth: 0.05, front: -0.18, back: -0.46, chamfer: 0.3 }
        ])
      );
      // Caudale, à l'arrière.
      group.add(
        part(color, [
          { y: -0.1, halfWidth: 0.06, front: -1.3, back: -1.62, chamfer: 0.25 },
          { y: 0.95, halfWidth: 0.05, front: -1.15, back: -1.7, chamfer: 0.3 }
        ])
      );

      // Mâchoire ouverte et dents, sous le museau.
      group.add(teeth(0.12, 1.42, 0.35, 0.34));

      // Les trois pattes en baskets bleues : deux devant, une derrière, comme
      // les deux nageoires latérales et la queue de l'image d'origine.
      group.add(sneakerLeg(-0.45, 0.45, -0.2, 0x2f6fd0));
      group.add(sneakerLeg(0.45, 0.45, -0.2, 0x2f6fd0));
      group.add(sneakerLeg(0, -0.85, -0.25, 0x2f6fd0));

      group.add(eyes([0, 0.58, 0.9], 0.36, 0.9));
      break;
    }

    /**
     * Tung Tung Tung Sahur : une bûche de bois anthropomorphe, debout sur deux
     * jambes, qui tient une batte. Le fût seul ne racontait rien.
     */
    case 'club': {
      group.add(
        rough(color, [
          { y: -0.55, halfWidth: 0.48, front: 0.48, back: -0.48, chamfer: 0.22 },
          { y: 0.5, halfWidth: 0.56, front: 0.56, back: -0.56, chamfer: 0.2 },
          { y: 1.45, halfWidth: 0.52, front: 0.52, back: -0.52, chamfer: 0.22 }
        ], 22, 0.05)
      );
      // Écorce plus sombre en haut et en bas : la bûche a été sciée.
      for (const y of [-0.55, 1.45]) {
        group.add(
          part(accent, [
            { y: y - 0.06, halfWidth: 0.5, front: 0.5, back: -0.5, chamfer: 0.22 },
            { y: y + 0.06, halfWidth: 0.53, front: 0.53, back: -0.53, chamfer: 0.22 }
          ])
        );
      }

      // Deux jambes courtes et deux pieds.
      for (const side of [-1, 1]) {
        group.add(
          part(accent, [
            { y: -1.25, halfWidth: 0.13, front: 0.13, back: -0.13, chamfer: 0.3 },
            { y: -0.5, halfWidth: 0.16, front: 0.16, back: -0.16, chamfer: 0.3 }
          ], [side * 0.26, 0, 0])
        );
        group.add(
          part(accent, [
            { y: -1.45, halfWidth: 0.2, front: 0.34, back: -0.16, chamfer: 0.3 },
            { y: -1.22, halfWidth: 0.18, front: 0.26, back: -0.16, chamfer: 0.3 }
          ], [side * 0.26, 0, 0.06])
        );
      }

      // Bras gauche tendu, et la batte au bout : c'est elle qu'on reconnaît.
      group.add(
        part(accent, [
          { y: -0.45, halfWidth: 0.1, front: 0.1, back: -0.1, chamfer: 0.3 },
          { y: 0.35, halfWidth: 0.12, front: 0.12, back: -0.12, chamfer: 0.3 }
        ], [-0.72, 0.2, 0.1], [0, 0, 0.5])
      );
      group.add(
        part(0xc9a26b, [
          { y: -0.6, halfWidth: 0.09, front: 0.09, back: -0.09, chamfer: 0.32 },
          { y: 0.2, halfWidth: 0.13, front: 0.13, back: -0.13, chamfer: 0.32 },
          { y: 0.95, halfWidth: 0.21, front: 0.21, back: -0.21, chamfer: 0.32 },
          { y: 1.15, halfWidth: 0.18, front: 0.18, back: -0.18, chamfer: 0.34 }
        ], [-1.18, 0.55, 0.18], [0, 0, 0.35])
      );

      group.add(eyes([0, 0.85, 0.6], 0.27));
      // Bouche large, taillée dans le bois.
      group.add(
        part(0x2e2016, [
          { y: 0.3, halfWidth: 0.3, front: 0.58, back: 0.4, chamfer: 0.3 },
          { y: 0.42, halfWidth: 0.32, front: 0.59, back: 0.4, chamfer: 0.3 }
        ])
      );
      break;
    }

    /**
     * Brr Brr Patapim : hybride de singe et d'arbre. Tronc couvert de
     * feuillage, très grands pieds pris dans les racines, long nez tombant, et
     * le chapeau doré qui le signe.
     */
    case 'tree': {
      // Tronc, en bois.
      group.add(
        rough(accent, [
          { y: -1.15, halfWidth: 0.44, front: 0.44, back: -0.44, chamfer: 0.26 },
          { y: -0.2, halfWidth: 0.38, front: 0.38, back: -0.38, chamfer: 0.26 },
          { y: 0.45, halfWidth: 0.44, front: 0.44, back: -0.44, chamfer: 0.26 }
        ], 33, 0.05)
      );
      // Feuillage, qui couvre tout sauf les pieds.
      group.add(
        rough(color, [
          { y: 0.2, halfWidth: 0.52, front: 0.52, back: -0.52, chamfer: 0.4 },
          { y: 0.75, halfWidth: 0.88, front: 0.84, back: -0.84, chamfer: 0.4 },
          { y: 1.3, halfWidth: 0.74, front: 0.7, back: -0.7, chamfer: 0.4 }
        ], 34, 0.07)
      );

      // Visage de singe, creusé en clair dans le feuillage.
      group.add(
        part(0xc9a884, [
          { y: 0.5, halfWidth: 0.34, front: 0.9, back: 0.4, chamfer: 0.34 },
          { y: 1.0, halfWidth: 0.38, front: 0.88, back: 0.4, chamfer: 0.34 }
        ])
      );
      // Le long nez tombant, disproportionné : c'est la marque du personnage.
      group.add(
        part(0xd8a07f, [
          { y: 0.12, halfWidth: 0.15, front: 1.0, back: 0.62, chamfer: 0.35 },
          { y: 0.55, halfWidth: 0.19, front: 1.06, back: 0.6, chamfer: 0.35 },
          { y: 0.86, halfWidth: 0.16, front: 0.92, back: 0.6, chamfer: 0.35 }
        ])
      );
      group.add(eyes([0, 0.96, 0.84], 0.26, 0.85));

      // Chapeau doré, posé sur le feuillage.
      group.add(
        part(0xe8b84b, [
          { y: 1.3, halfWidth: 0.86, front: 0.86, back: -0.86, chamfer: 0.4 },
          { y: 1.4, halfWidth: 0.78, front: 0.78, back: -0.78, chamfer: 0.4 },
          { y: 1.44, halfWidth: 0.44, front: 0.44, back: -0.44, chamfer: 0.4 },
          { y: 1.78, halfWidth: 0.4, front: 0.4, back: -0.4, chamfer: 0.4 }
        ])
      );

      // Petites mains, qui sortent de la tête et non des épaules.
      for (const side of [-1, 1]) {
        group.add(
          part(0xc9a884, [
            { y: 1.0, halfWidth: 0.12, front: 0.12, back: -0.12, chamfer: 0.34 },
            { y: 1.3, halfWidth: 0.15, front: 0.15, back: -0.15, chamfer: 0.34 }
          ], [side * 0.82, 0, 0.3], [0, 0, side * -0.4])
        );
      }

      // Très grands pieds, pris dans les racines.
      for (const side of [-1, 1]) {
        group.add(
          part(accent, [
            { y: -1.55, halfWidth: 0.38, front: 0.72, back: -0.3, chamfer: 0.3 },
            { y: -1.2, halfWidth: 0.34, front: 0.5, back: -0.3, chamfer: 0.3 }
          ], [side * 0.34, 0, 0.1])
        );
      }
      break;
    }

    /**
     * Lirili Larila : cactus-éléphant. Corps de cactus vert côtelé, trompe et
     * défenses d'éléphant, deux pieds en sandales, et l'horloge qui fait tic
     * tac dans la chanson.
     */
    case 'cactus': {
      group.add(
        rough(color, [
          { y: -1.0, halfWidth: 0.5, front: 0.5, back: -0.5, chamfer: 0.34 },
          { y: 0.1, halfWidth: 0.62, front: 0.62, back: -0.62, chamfer: 0.34 },
          { y: 1.0, halfWidth: 0.58, front: 0.58, back: -0.58, chamfer: 0.34 },
          { y: 1.35, halfWidth: 0.36, front: 0.36, back: -0.36, chamfer: 0.36 }
        ], 44, 0.05)
      );

      // Bras de cactus, dressés de part et d'autre.
      for (const side of [-1, 1]) {
        group.add(
          part(color, [
            { y: -0.15, halfWidth: 0.19, front: 0.19, back: -0.19, chamfer: 0.34 },
            { y: 0.7, halfWidth: 0.17, front: 0.17, back: -0.17, chamfer: 0.34 }
          ], [side * 0.78, 0, 0])
        );
        group.add(
          part(color, [
            { y: -0.3, halfWidth: 0.18, front: 0.18, back: -0.18, chamfer: 0.34 },
            { y: -0.15, halfWidth: 0.18, front: 0.18, back: -0.18, chamfer: 0.34 }
          ], [side * 0.5, 0, 0], [0, 0, side * -1.1])
        );
      }

      // Trompe d'éléphant, qui descend puis s'enroule vers l'avant.
      group.add(
        part(0x9ecb8f, [
          { y: -0.8, halfWidth: 0.13, front: 1.26, back: 0.9, chamfer: 0.34 },
          { y: -0.3, halfWidth: 0.16, front: 1.3, back: 0.78, chamfer: 0.34 },
          { y: 0.15, halfWidth: 0.2, front: 1.12, back: 0.62, chamfer: 0.34 },
          { y: 0.5, halfWidth: 0.24, front: 0.96, back: 0.55, chamfer: 0.34 }
        ])
      );
      // Défenses, de part et d'autre de la trompe.
      for (const side of [-1, 1]) {
        group.add(
          part(0xefe9d8, [
            { y: -0.62, halfWidth: 0.06, front: 1.0, back: 0.78, chamfer: 0.34 },
            { y: 0.12, halfWidth: 0.09, front: 0.94, back: 0.66, chamfer: 0.34 }
          ], [side * 0.34, 0, 0], [0, 0, side * 0.22])
        );
      }
      // Oreilles d'éléphant, larges et plates.
      for (const side of [-1, 1]) {
        group.add(
          part(0x6fa06f, [
            { y: 0.15, halfWidth: 0.34, front: 0.16, back: -0.16, chamfer: 0.4 },
            { y: 0.85, halfWidth: 0.3, front: 0.14, back: -0.14, chamfer: 0.4 }
          ], [side * 0.82, 0, 0.1], [0, side * 0.35, side * 0.15])
        );
      }
      group.add(eyes([0, 0.82, 0.66], 0.32, 0.85));

      // L'horloge, accrochée au flanc : « un orologio che fa tic tac ».
      group.add(
        part(accent, [
          { y: -0.42, halfWidth: 0.26, front: 0.66, back: 0.5, chamfer: 0.42 },
          { y: 0.02, halfWidth: 0.26, front: 0.68, back: 0.5, chamfer: 0.42 }
        ], [0.52, 0, 0])
      );
      group.add(
        mesh(new THREE.BoxGeometry(0.03, 0.17, 0.02), material(0x2e2a22), [0.52, -0.16, 0.7])
      );

      // Deux jambes, puis les sandales. Sans les jambes, les semelles
      // flottaient sous un corps qui s'arrête bien plus haut.
      for (const side of [-1, 1]) {
        group.add(
          part(color, [
            { y: -1.32, halfWidth: 0.19, front: 0.19, back: -0.19, chamfer: 0.32 },
            { y: -0.9, halfWidth: 0.23, front: 0.23, back: -0.23, chamfer: 0.32 }
          ], [side * 0.3, 0, 0])
        );
        group.add(
          part(0xc9a26b, [
            { y: -1.46, halfWidth: 0.28, front: 0.5, back: -0.26, chamfer: 0.32 },
            { y: -1.32, halfWidth: 0.28, front: 0.5, back: -0.26, chamfer: 0.32 }
          ], [side * 0.3, 0, 0.06])
        );
      }
      break;
    }

    /**
     * Bombardiro Crocodilo : tête de crocodile fondue dans le fuselage d'un
     * bombardier bimoteur, hélices sur chaque aile et bombe suspendue sous le
     * ventre. L'ancienne version, verticale et sans hélices, ne se lisait ni
     * comme un crocodile ni comme un avion.
     */
    case 'croc': {
      // Fuselage couché, museau en avant.
      const fuselage: Ring[] = [
        { y: -1.5, halfWidth: 0.16, front: 0.16, back: -0.16, chamfer: 0.34 },
        { y: -0.8, halfWidth: 0.36, front: 0.36, back: -0.36, chamfer: 0.32 },
        { y: 0.2, halfWidth: 0.5, front: 0.48, back: -0.48, chamfer: 0.3 },
        { y: 1.0, halfWidth: 0.42, front: 0.4, back: -0.4, chamfer: 0.3 },
        { y: 1.35, halfWidth: 0.34, front: 0.32, back: -0.34, chamfer: 0.32 }
      ];
      group.add(lying(accent, fuselage, [0, 0.3, 0]));

      // Tête et mâchoire de crocodile, à l'avant.
      group.add(
        part(color, [
          { y: 0.16, halfWidth: 0.4, front: 1.9, back: 0.6, chamfer: 0.22 },
          { y: 0.62, halfWidth: 0.46, front: 1.75, back: 0.55, chamfer: 0.22 }
        ])
      );
      group.add(teeth(0.1, 1.86, 0.65, 0.4));
      // Naseaux relevés au bout du museau.
      group.add(
        part(color, [
          { y: 0.6, halfWidth: 0.16, front: 1.82, back: 1.5, chamfer: 0.34 },
          { y: 0.76, halfWidth: 0.14, front: 1.78, back: 1.5, chamfer: 0.34 }
        ])
      );
      group.add(eyes([0, 0.78, 1.15], 0.28, 0.85));

      // Ailes, et une hélice au bout de chacune.
      for (const side of [-1, 1]) {
        group.add(
          part(accent, [
            { y: -0.12, halfWidth: 1.0, front: 0.44, back: -0.44, chamfer: 0.22 },
            { y: 0.16, halfWidth: 1.0, front: 0.38, back: -0.38, chamfer: 0.22 }
          ], [side * 1.1, 0.05, -0.15])
        );
        // Nacelle moteur, puis l'hélice devant elle.
        group.add(
          part(0x555d66, [
            { y: -0.14, halfWidth: 0.16, front: 0.6, back: -0.5, chamfer: 0.34 },
            { y: 0.16, halfWidth: 0.16, front: 0.55, back: -0.5, chamfer: 0.34 }
          ], [side * 1.35, 0.05, -0.1])
        );
        group.add(propeller(side * 1.35, 0.55));
      }

      // Dérive et empennage, à l'arrière.
      group.add(
        part(accent, [
          { y: 0.25, halfWidth: 0.1, front: -1.1, back: -1.55, chamfer: 0.2 },
          { y: 1.0, halfWidth: 0.07, front: -1.2, back: -1.5, chamfer: 0.25 }
        ])
      );
      group.add(
        part(accent, [
          { y: 0.2, halfWidth: 0.52, front: -1.15, back: -1.5, chamfer: 0.22 },
          { y: 0.32, halfWidth: 0.52, front: -1.15, back: -1.5, chamfer: 0.22 }
        ])
      );

      // La bombe, suspendue sous le ventre.
      group.add(
        part(0x3a3f47, [
          { y: -0.95, halfWidth: 0.1, front: 0.1, back: -0.1, chamfer: 0.36 },
          { y: -0.75, halfWidth: 0.22, front: 0.3, back: -0.3, chamfer: 0.36 },
          { y: -0.45, halfWidth: 0.2, front: 0.26, back: -0.34, chamfer: 0.36 },
          { y: -0.3, halfWidth: 0.12, front: 0.12, back: -0.3, chamfer: 0.36 }
        ], [0, 0, 0.1])
      );
      break;
    }

    /**
     * Le pigeon aux gros pieds : poitrail gonflé, toute petite tête, et des
     * pattes emplumées démesurées. Tout le gag tient dans la disproportion,
     * donc les pieds sont volontairement énormes.
     */
    case 'pigeon': {
      group.add(
        rough(color, [
          { y: -0.7, halfWidth: 0.42, front: 0.5, back: -0.42, chamfer: 0.36 },
          { y: 0, halfWidth: 0.62, front: 0.82, back: -0.5, chamfer: 0.34 },
          { y: 0.55, halfWidth: 0.5, front: 0.6, back: -0.46, chamfer: 0.36 },
          { y: 0.85, halfWidth: 0.3, front: 0.32, back: -0.3, chamfer: 0.38 }
        ], 88, 0.04)
      );
      // Petite tête, perchée sur un cou court.
      group.add(
        part(accent, [
          { y: 0.85, halfWidth: 0.26, front: 0.3, back: -0.28, chamfer: 0.38 },
          { y: 1.25, halfWidth: 0.3, front: 0.36, back: -0.3, chamfer: 0.4 },
          { y: 1.5, halfWidth: 0.22, front: 0.28, back: -0.24, chamfer: 0.4 }
        ])
      );
      group.add(beak(0xe4a03c, 1.18, 0.3, 0.3));
      group.add(eyes([0, 1.3, 0.24], 0.22, 0.75));

      // Gorge irisée, la tache claire du pigeon de ville.
      group.add(
        part(0x4f8f8a, [
          { y: 0.62, halfWidth: 0.26, front: 0.56, back: 0.3, chamfer: 0.38 },
          { y: 0.9, halfWidth: 0.24, front: 0.4, back: 0.28, chamfer: 0.38 }
        ])
      );
      group.add(folded(accent, -1, -0.05));
      group.add(folded(accent, 1, -0.05));

      // Les pattes, et surtout les pieds : ce sont des **pieds humains**, pas
      // des serres d'oiseau. C'est tout le gag du personnage, donc ils sont
      // volontairement démesurés par rapport au corps.
      for (const side of [-1, 1]) {
        // Jambe humaine : mollet puis cheville.
        group.add(
          part(SKIN, [
            { y: -1.32, halfWidth: 0.15, front: 0.15, back: -0.15, chamfer: 0.34 },
            { y: -0.95, halfWidth: 0.21, front: 0.21, back: -0.21, chamfer: 0.34 },
            { y: -0.5, halfWidth: 0.24, front: 0.24, back: -0.24, chamfer: 0.34 }
          ], [side * 0.3, 0, 0])
        );
        group.add(humanFoot(side * 0.32, 0.12, SKIN));
      }
      break;
    }

    /**
     * Frigo Camelo : tête et cou de chameau sortant d'un réfrigérateur, deux
     * pattes chaussées de grosses boots. Le frigo fait le corps, il est donc
     * franchement rectangulaire là où tout le reste est arrondi.
     */
    case 'fridge': {
      // Le frigo : un bloc net, chanfrein minimal.
      group.add(
        part(color, [
          { y: -0.95, halfWidth: 0.7, front: 0.52, back: -0.52, chamfer: 0.06 },
          { y: 1.15, halfWidth: 0.7, front: 0.52, back: -0.52, chamfer: 0.06 }
        ])
      );
      // Rainure entre les deux portes, et la poignée verticale.
      group.add(
        part(0x9aa0a4, [
          { y: 0.16, halfWidth: 0.71, front: 0.53, back: -0.53, chamfer: 0.06 },
          { y: 0.22, halfWidth: 0.71, front: 0.53, back: -0.53, chamfer: 0.06 }
        ])
      );
      group.add(
        mesh(new THREE.BoxGeometry(0.08, 0.62, 0.09), material(0x8d949a), [0.5, 0.62, 0.56])
      );
      group.add(
        mesh(new THREE.BoxGeometry(0.08, 0.62, 0.09), material(0x8d949a), [0.5, -0.36, 0.56])
      );

      // Cou et tête de chameau, qui sortent par le haut.
      group.add(
        part(accent, [
          { y: 1.0, halfWidth: 0.19, front: 0.3, back: -0.02, chamfer: 0.34 },
          { y: 1.6, halfWidth: 0.17, front: 0.46, back: 0.1, chamfer: 0.34 },
          { y: 1.95, halfWidth: 0.2, front: 0.6, back: 0.16, chamfer: 0.34 }
        ])
      );
      group.add(
        part(accent, [
          { y: 1.85, halfWidth: 0.23, front: 0.78, back: 0.1, chamfer: 0.34 },
          { y: 2.2, halfWidth: 0.25, front: 0.66, back: 0.05, chamfer: 0.34 }
        ])
      );
      // Museau allongé, la marque du chameau.
      group.add(
        part(0xd8b483, [
          { y: 1.72, halfWidth: 0.16, front: 0.96, back: 0.6, chamfer: 0.34 },
          { y: 1.98, halfWidth: 0.17, front: 0.92, back: 0.6, chamfer: 0.34 }
        ])
      );
      // Oreilles.
      for (const side of [-1, 1]) {
        group.add(
          part(accent, [
            { y: 2.16, halfWidth: 0.07, front: 0.14, back: -0.1, chamfer: 0.36 },
            { y: 2.38, halfWidth: 0.05, front: 0.1, back: -0.08, chamfer: 0.36 }
          ], [side * 0.2, 0, 0.18], [0, 0, side * -0.3])
        );
      }
      group.add(eyes([0, 2.1, 0.5], 0.2, 0.8));

      // Pattes, et les grosses boots.
      for (const side of [-1, 1]) {
        group.add(
          part(accent, [
            { y: -1.45, halfWidth: 0.15, front: 0.15, back: -0.15, chamfer: 0.34 },
            { y: -0.9, halfWidth: 0.18, front: 0.18, back: -0.18, chamfer: 0.34 }
          ], [side * 0.34, 0, 0])
        );
        group.add(
          part(0xb5741f, [
            { y: -1.85, halfWidth: 0.3, front: 0.58, back: -0.3, chamfer: 0.24 },
            { y: -1.4, halfWidth: 0.28, front: 0.34, back: -0.3, chamfer: 0.24 }
          ], [side * 0.34, 0, 0.08])
        );
      }
      break;
    }

    /**
     * Bombombini Gusini : oie blanche fondue dans un bombardier, long cou,
     * bec orange, moteurs sous les ailes et grenades en travers du poitrail.
     */
    case 'goose': {
      const fuselage: Ring[] = [
        { y: -1.4, halfWidth: 0.18, front: 0.18, back: -0.18, chamfer: 0.34 },
        { y: -0.7, halfWidth: 0.42, front: 0.42, back: -0.42, chamfer: 0.32 },
        { y: 0.3, halfWidth: 0.56, front: 0.54, back: -0.54, chamfer: 0.3 },
        { y: 1.1, halfWidth: 0.4, front: 0.4, back: -0.4, chamfer: 0.32 }
      ];
      group.add(lying(color, fuselage, [0, 0.1, 0]));

      // Long cou dressé, puis la tête et le bec orange.
      group.add(
        part(color, [
          { y: 0.3, halfWidth: 0.17, front: 0.95, back: 0.62, chamfer: 0.34 },
          { y: 1.05, halfWidth: 0.15, front: 1.0, back: 0.7, chamfer: 0.34 },
          { y: 1.45, halfWidth: 0.18, front: 1.12, back: 0.74, chamfer: 0.34 }
        ])
      );
      group.add(
        part(color, [
          { y: 1.4, halfWidth: 0.24, front: 1.26, back: 0.68, chamfer: 0.36 },
          { y: 1.72, halfWidth: 0.22, front: 1.16, back: 0.7, chamfer: 0.36 }
        ])
      );
      group.add(beak(0xe4832c, 1.5, 1.2, 0.42));
      group.add(eyes([0, 1.62, 1.04], 0.2, 0.75));

      // Ailes d'avion, moteur et hélice à chaque bout.
      for (const side of [-1, 1]) {
        group.add(
          part(accent, [
            { y: -0.1, halfWidth: 1.0, front: 0.46, back: -0.46, chamfer: 0.22 },
            { y: 0.16, halfWidth: 1.0, front: 0.4, back: -0.4, chamfer: 0.22 }
          ], [side * 1.05, 0, -0.2])
        );
        group.add(
          part(0x555d66, [
            { y: -0.12, halfWidth: 0.15, front: 0.55, back: -0.45, chamfer: 0.34 },
            { y: 0.16, halfWidth: 0.15, front: 0.5, back: -0.45, chamfer: 0.34 }
          ], [side * 1.3, 0, -0.15])
        );
        group.add(propeller(side * 1.3, 0.5));
      }

      // Grenades en bandoulière sur le poitrail : l'oie est armée.
      for (const i of [-1, 0, 1]) {
        group.add(
          part(0x4b5a3c, [
            { y: 0.28, halfWidth: 0.09, front: 0.82, back: 0.62, chamfer: 0.36 },
            { y: 0.5, halfWidth: 0.11, front: 0.84, back: 0.6, chamfer: 0.36 }
          ], [i * 0.26, -0.18, 0])
        );
      }

      // Dérive arrière.
      group.add(
        part(accent, [
          { y: 0.3, halfWidth: 0.09, front: -1.0, back: -1.4, chamfer: 0.2 },
          { y: 0.95, halfWidth: 0.06, front: -1.1, back: -1.35, chamfer: 0.25 }
        ])
      );
      break;
    }

    /**
     * Spioniro Golubiro : le pigeon espion. Trench-coat beige, col relevé et
     * chapeau mou — la panoplie du détective, sans quoi ce n'est qu'un pigeon.
     */
    case 'spy': {
      // Le corps disparaît sous le trench : c'est lui le volume principal.
      group.add(
        part(accent, [
          { y: -1.45, halfWidth: 0.56, front: 0.5, back: -0.5, chamfer: 0.3 },
          { y: -0.5, halfWidth: 0.6, front: 0.54, back: -0.54, chamfer: 0.28 },
          { y: 0.5, halfWidth: 0.52, front: 0.48, back: -0.48, chamfer: 0.3 },
          { y: 0.8, halfWidth: 0.44, front: 0.44, back: -0.44, chamfer: 0.32 }
        ])
      );
      // Boutonnage et ceinture, pour qu'on lise un manteau et pas un sac.
      group.add(
        part(0x8c7449, [
          { y: -0.34, halfWidth: 0.61, front: 0.55, back: -0.55, chamfer: 0.28 },
          { y: -0.16, halfWidth: 0.61, front: 0.55, back: -0.55, chamfer: 0.28 }
        ])
      );
      group.add(
        mesh(new THREE.BoxGeometry(0.06, 1.5, 0.05), material(0x8c7449), [0, -0.3, 0.55])
      );
      // Col relevé.
      group.add(
        part(0x8c7449, [
          { y: 0.62, halfWidth: 0.56, front: 0.5, back: -0.5, chamfer: 0.3 },
          { y: 1.0, halfWidth: 0.46, front: 0.42, back: -0.42, chamfer: 0.32 }
        ])
      );

      // Tête de pigeon, qui dépasse du col.
      group.add(
        part(color, [
          { y: 0.92, halfWidth: 0.28, front: 0.32, back: -0.3, chamfer: 0.38 },
          { y: 1.3, halfWidth: 0.32, front: 0.38, back: -0.32, chamfer: 0.4 },
          { y: 1.55, halfWidth: 0.24, front: 0.3, back: -0.26, chamfer: 0.4 }
        ])
      );
      group.add(beak(0x3f4854, 1.24, 0.32, 0.28));
      group.add(eyes([0, 1.36, 0.26], 0.22, 0.75));

      // Chapeau mou : calotte puis bord large.
      group.add(
        part(0x4a4033, [
          { y: 1.5, halfWidth: 0.62, front: 0.62, back: -0.62, chamfer: 0.4 },
          { y: 1.58, halfWidth: 0.6, front: 0.6, back: -0.6, chamfer: 0.4 },
          { y: 1.62, halfWidth: 0.34, front: 0.34, back: -0.34, chamfer: 0.4 },
          { y: 1.92, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.4 }
        ])
      );
      // Ruban du chapeau.
      group.add(
        part(0x2e2820, [
          { y: 1.66, halfWidth: 0.35, front: 0.35, back: -0.35, chamfer: 0.4 },
          { y: 1.76, halfWidth: 0.35, front: 0.35, back: -0.35, chamfer: 0.4 }
        ])
      );
      break;
    }

    /** Piccolo : silhouette namek, antennes, turban et col de cape rigide. */
    case 'namek': {
      group.add(
        rough(color, [
          { y: -1.6, halfWidth: 0.4, front: 0.35, back: -0.35, chamfer: 0.3 },
          { y: -0.6, halfWidth: 0.56, front: 0.44, back: -0.44, chamfer: 0.28 },
          { y: 0.1, halfWidth: 0.42, front: 0.36, back: -0.36, chamfer: 0.3 },
          { y: 0.5, halfWidth: 0.52, front: 0.52, back: -0.5, chamfer: 0.26 },
          { y: 1.15, halfWidth: 0.5, front: 0.56, back: -0.5, chamfer: 0.26 },
          { y: 1.4, halfWidth: 0.34, front: 0.4, back: -0.4, chamfer: 0.32 }
        ], 66)
      );
      group.add(
        part(accent, [
          { y: 0.3, halfWidth: 0.92, front: 0.28, back: -0.75, chamfer: 0.22 },
          { y: 1.05, halfWidth: 0.8, front: 0.1, back: -0.7, chamfer: 0.22 }
        ])
      );
      group.add(
        part(accent, [
          { y: 1.42, halfWidth: 0.42, front: 0.48, back: -0.48, chamfer: 0.3 },
          { y: 1.62, halfWidth: 0.36, front: 0.42, back: -0.42, chamfer: 0.3 }
        ])
      );
      for (const side of [-1, 1]) {
        group.add(
          part(color, [
            { y: 0, halfWidth: 0.07, front: 0.07, back: -0.07, chamfer: 0.35 },
            { y: 0.55, halfWidth: 0.03, front: 0.03, back: -0.03, chamfer: 0.35 }
          ], [side * 0.2, 1.55, 0.14], [0.2, 0, side * 0.25])
        );
      }
      group.add(eyes([0, 1.05, 0.46], 0.24));
      break;
    }

    /**
     * Chimpanzini Bananini : un chimpanzé qui sort d'une banane à moitié
     * épluchée. Les pans de peau rabattus vers l'extérieur font toute la
     * lecture — sans eux, ce n'est qu'un singe sur un pied jaune.
     */
    case 'banana': {
      // Le bas de la banane, encore dans sa peau, et son bout sombre.
      group.add(
        part(color, [
          { y: -1.55, halfWidth: 0.1, front: 0.1, back: -0.1, chamfer: 0.3 },
          { y: -1.1, halfWidth: 0.32, front: 0.3, back: -0.3, chamfer: 0.3 },
          { y: -0.3, halfWidth: 0.46, front: 0.44, back: -0.44, chamfer: 0.28 },
          { y: 0.15, halfWidth: 0.48, front: 0.46, back: -0.46, chamfer: 0.28 }
        ])
      );
      group.add(
        part(0x4a3a22, [
          { y: -1.72, halfWidth: 0.06, front: 0.06, back: -0.06, chamfer: 0.3 },
          { y: -1.5, halfWidth: 0.09, front: 0.09, back: -0.09, chamfer: 0.3 }
        ])
      );

      // Les pans de peau, rabattus vers l'extérieur. Chacun pivote à sa
      // base : les anneaux partent de zéro pour que la rotation s'y fasse.
      const flap: Ring[] = [
        { y: 0, halfWidth: 0.26, front: 0.07, back: -0.07, chamfer: 0.3 },
        { y: 0.55, halfWidth: 0.22, front: 0.06, back: -0.06, chamfer: 0.3 },
        { y: 1.0, halfWidth: 0.08, front: 0.04, back: -0.04, chamfer: 0.3 }
      ];
      group.add(part(color, flap, [0, 0.1, 0.4], [1.15, 0, 0]));
      group.add(part(color, flap, [0, 0.1, -0.4], [-0.95, 0, 0]));
      group.add(part(color, flap, [-0.4, 0.1, 0], [0, Math.PI / 2, 0.95]));
      group.add(part(color, flap, [0.4, 0.1, 0], [0, Math.PI / 2, -0.95]));

      // Le chimpanzé : buste, puis tête ronde.
      group.add(
        rough(accent, [
          { y: 0, halfWidth: 0.4, front: 0.36, back: -0.36, chamfer: 0.3 },
          { y: 0.75, halfWidth: 0.44, front: 0.38, back: -0.38, chamfer: 0.3 },
          { y: 0.95, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.34 }
        ], 91)
      );
      group.add(
        rough(accent, [
          { y: 0.9, halfWidth: 0.34, front: 0.34, back: -0.36, chamfer: 0.36 },
          { y: 1.35, halfWidth: 0.46, front: 0.44, back: -0.44, chamfer: 0.34 },
          { y: 1.8, halfWidth: 0.3, front: 0.3, back: -0.34, chamfer: 0.38 }
        ], 92)
      );
      // Masque facial clair et museau en avant : c'est ce qui dit « singe ».
      group.add(
        part(0xd9b48a, [
          { y: 1.0, halfWidth: 0.26, front: 0.62, back: 0.2, chamfer: 0.36 },
          { y: 1.25, halfWidth: 0.28, front: 0.6, back: 0.2, chamfer: 0.36 },
          { y: 1.6, halfWidth: 0.3, front: 0.46, back: 0.2, chamfer: 0.36 }
        ])
      );
      for (const side of [-1, 1]) {
        // Oreilles décollées.
        group.add(
          mesh(new THREE.SphereGeometry(0.15, 6, 4), material(0xd9b48a), [side * 0.48, 1.38, 0])
        );
        // Bras posés sur les pans de peau, comme accoudé au bord.
        group.add(
          part(accent, [
            { y: -0.5, halfWidth: 0.1, front: 0.1, back: -0.1, chamfer: 0.32 },
            { y: 0.25, halfWidth: 0.12, front: 0.12, back: -0.12, chamfer: 0.32 }
          ], [side * 0.5, 0.55, 0.1], [0, 0, side * 1.1])
        );
      }
      group.add(eyes([0, 1.44, 0.46], 0.17, 0.75));
      break;
    }

    /**
     * Cappuccino Assassino : une tasse de cappuccino en ninja. Bandeau noir,
     * deux katanas croisés dans le dos et des jambes pour courir.
     */
    case 'cup': {
      // La tasse, évasée vers le haut.
      group.add(
        part(color, [
          { y: -1.0, halfWidth: 0.5, front: 0.5, back: -0.5, chamfer: 0.3 },
          { y: -0.8, halfWidth: 0.56, front: 0.56, back: -0.56, chamfer: 0.3 },
          { y: 0.9, halfWidth: 0.72, front: 0.72, back: -0.72, chamfer: 0.3 }
        ])
      );
      // Le café et sa mousse, à ras bord.
      group.add(
        part(0x6b4226, [
          { y: 0.82, halfWidth: 0.66, front: 0.66, back: -0.66, chamfer: 0.3 },
          { y: 0.94, halfWidth: 0.66, front: 0.66, back: -0.66, chamfer: 0.3 }
        ])
      );
      group.add(
        part(0xe9dcc4, [
          { y: 0.94, halfWidth: 0.34, front: 0.34, back: -0.34, chamfer: 0.34 },
          { y: 0.99, halfWidth: 0.24, front: 0.24, back: -0.24, chamfer: 0.34 }
        ])
      );
      // Anse, sur le côté.
      group.add(mesh(new THREE.TorusGeometry(0.3, 0.08, 4, 8), material(color), [0.78, 0, 0]));

      // Le bandeau de ninja, et ses deux pans qui flottent derrière.
      group.add(
        part(accent, [
          { y: 0.22, halfWidth: 0.67, front: 0.67, back: -0.67, chamfer: 0.3 },
          { y: 0.62, halfWidth: 0.7, front: 0.7, back: -0.7, chamfer: 0.3 }
        ])
      );
      for (const side of [-1, 1]) {
        group.add(
          part(accent, [
            { y: 0, halfWidth: 0.09, front: 0.03, back: -0.03, chamfer: 0.2 },
            { y: 0.7, halfWidth: 0.06, front: 0.03, back: -0.03, chamfer: 0.2 }
          ], [side * 0.12, 0.42, -0.68], [-1.9, 0, side * 0.35])
        );
      }
      group.add(eyes([0, 0.42, 0.62], 0.24, 0.72));

      // Deux katanas croisés dans le dos : lame claire, garde dorée,
      // poignée noire.
      for (const side of [-1, 1]) {
        const katana = new THREE.Group();
        katana.add(mesh(new THREE.BoxGeometry(0.07, 1.9, 0.025), material(0xc9ced6, 0.4)));
        katana.add(mesh(new THREE.BoxGeometry(0.28, 0.05, 0.14), material(0xb59a6d), [0, 0.95, 0]));
        katana.add(mesh(new THREE.BoxGeometry(0.11, 0.5, 0.11), material(0x1c1c1f), [0, 1.18, 0]));
        katana.position.set(0, 0.2, -0.8);
        katana.rotation.z = side * 0.62;
        group.add(katana);
      }

      // Jambes courtes et pieds, sous la tasse.
      for (const side of [-1, 1]) {
        group.add(
          part(accent, [
            { y: -1.6, halfWidth: 0.1, front: 0.1, back: -0.1, chamfer: 0.3 },
            { y: -0.95, halfWidth: 0.12, front: 0.12, back: -0.12, chamfer: 0.3 }
          ], [side * 0.26, 0, 0])
        );
        group.add(
          part(accent, [
            { y: -1.78, halfWidth: 0.15, front: 0.3, back: -0.14, chamfer: 0.3 },
            { y: -1.58, halfWidth: 0.14, front: 0.22, back: -0.14, chamfer: 0.3 }
          ], [side * 0.26, 0, 0.04])
        );
      }
      break;
    }

    /**
     * Ballerina Cappuccina : une danseuse dont la tête est une tasse de
     * cappuccino. Tutu rose, pointes, bras levés en couronne.
     */
    case 'ballerina': {
      // Jambes fines sur pointes.
      for (const side of [-1, 1]) {
        group.add(
          part(SKIN, [
            { y: -1.55, halfWidth: 0.07, front: 0.07, back: -0.07, chamfer: 0.32 },
            { y: -0.4, halfWidth: 0.11, front: 0.11, back: -0.11, chamfer: 0.32 }
          ], [side * 0.14, 0, 0])
        );
        group.add(
          part(color, [
            { y: -1.8, halfWidth: 0.05, front: 0.05, back: -0.05, chamfer: 0.32 },
            { y: -1.52, halfWidth: 0.09, front: 0.1, back: -0.09, chamfer: 0.32 }
          ], [side * 0.14, 0, 0])
        );
      }

      // Tutu : un plateau large, deux étages de tulle.
      group.add(
        part(color, [
          { y: -0.42, halfWidth: 0.95, front: 0.95, back: -0.95, chamfer: 0.3 },
          { y: -0.3, halfWidth: 0.9, front: 0.9, back: -0.9, chamfer: 0.3 },
          { y: -0.2, halfWidth: 0.4, front: 0.4, back: -0.4, chamfer: 0.3 }
        ])
      );
      group.add(
        part(0xf7c6d8, [
          { y: -0.3, halfWidth: 0.75, front: 0.75, back: -0.75, chamfer: 0.3 },
          { y: -0.16, halfWidth: 0.38, front: 0.38, back: -0.38, chamfer: 0.3 }
        ])
      );
      // Bustier, puis le cou.
      group.add(
        part(color, [
          { y: -0.25, halfWidth: 0.26, front: 0.2, back: -0.2, chamfer: 0.3 },
          { y: 0.3, halfWidth: 0.3, front: 0.22, back: -0.22, chamfer: 0.3 },
          { y: 0.5, halfWidth: 0.24, front: 0.18, back: -0.18, chamfer: 0.32 }
        ])
      );
      group.add(
        part(SKIN, [
          { y: 0.45, halfWidth: 0.08, front: 0.08, back: -0.08, chamfer: 0.3 },
          { y: 0.72, halfWidth: 0.08, front: 0.08, back: -0.08, chamfer: 0.3 }
        ])
      );

      // Bras levés en couronne : le bras monte en s'écartant jusqu'à hauteur
      // de la tasse, l'avant-bras revient se joindre au-dessus de la mousse.
      // Coudes plus bas, les avant-bras traversaient la tasse.
      for (const side of [-1, 1]) {
        group.add(
          part(SKIN, [
            { y: 0, halfWidth: 0.06, front: 0.06, back: -0.06, chamfer: 0.32 },
            { y: 1.1, halfWidth: 0.05, front: 0.05, back: -0.05, chamfer: 0.32 }
          ], [side * 0.3, 0.42, 0], [0, 0, side * -0.5])
        );
        group.add(
          part(SKIN, [
            { y: 0, halfWidth: 0.05, front: 0.05, back: -0.05, chamfer: 0.32 },
            { y: 0.75, halfWidth: 0.045, front: 0.045, back: -0.045, chamfer: 0.32 }
          ], [side * 0.83, 1.39, 0], [0, 0, side * 1.15])
        );
      }

      // La tête : une tasse de cappuccino, café et mousse au sommet.
      group.add(
        part(accent, [
          { y: 0.7, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.3 },
          { y: 1.45, halfWidth: 0.44, front: 0.44, back: -0.44, chamfer: 0.3 }
        ])
      );
      group.add(
        part(0x6b4226, [
          { y: 1.4, halfWidth: 0.4, front: 0.4, back: -0.4, chamfer: 0.3 },
          { y: 1.49, halfWidth: 0.4, front: 0.4, back: -0.4, chamfer: 0.3 }
        ])
      );
      group.add(
        part(0xe9dcc4, [
          { y: 1.49, halfWidth: 0.28, front: 0.28, back: -0.28, chamfer: 0.34 },
          { y: 1.6, halfWidth: 0.14, front: 0.14, back: -0.14, chamfer: 0.34 }
        ])
      );
      group.add(mesh(new THREE.TorusGeometry(0.17, 0.05, 4, 8), material(accent), [0.48, 1.1, 0]));
      group.add(eyes([0, 1.12, 0.36], 0.15, 0.6));
      break;
    }

    /** Chad Moai : la tête du frère, plus carrée, coiffée d'ambre. */
    default: {
      group.add(
        rough(color, [
          { y: -1.5, halfWidth: 0.6, front: 0.42, back: -0.46, chamfer: 0.26 },
          { y: -0.4, halfWidth: 0.66, front: 0.56, back: -0.5, chamfer: 0.22 },
          { y: 0.6, halfWidth: 0.74, front: 0.5, back: -0.54, chamfer: 0.18 },
          { y: 1.3, halfWidth: 0.76, front: 0.62, back: -0.54, chamfer: 0.17 },
          { y: 1.7, halfWidth: 0.64, front: 0.3, back: -0.48, chamfer: 0.26 }
        ], 77)
      );
      group.add(
        part(color, [
          { y: 0.1, halfWidth: 0.24, front: 0.82, back: 0.3, chamfer: 0.3 },
          { y: 0.72, halfWidth: 0.18, front: 0.72, back: 0.3, chamfer: 0.32 }
        ])
      );
      group.add(
        part(accent, [
          { y: 1.26, halfWidth: 0.78, front: 0.66, back: -0.56, chamfer: 0.17 },
          { y: 1.38, halfWidth: 0.78, front: 0.66, back: -0.56, chamfer: 0.17 }
        ])
      );
      group.add(eyes([0, 0.82, 0.56], 0.32, 0.9));
      break;
    }

    /**
     * Trippi Troppi : une **tête de chat sur un corps de crevette**. Le corps
     * est donc couché et segmenté, en carapace orangée translucide, terminé
     * par un éventail de queue et deux antennes ; la tête garde ses oreilles à
     * l'intérieur rose, ses moustaches et son museau. Les pattes sont des
     * pattes de crevette, fines et nombreuses — un chat à quatre pattes
     * ordinaires n'aurait été qu'un chat.
     */
    case 'shrimp': {
      // Abdomen **couché en arrière** de la tête, et non dessous : empilés, le
      // chat paraissait assis sur une citrouille et la crevette disparaissait.
      group.add(
        lying(color, [
          { y: -1.15, halfWidth: 0.12, front: 0.14, back: -0.14, chamfer: 0.36 },
          { y: -0.55, halfWidth: 0.3, front: 0.32, back: -0.3, chamfer: 0.34 },
          { y: 0.1, halfWidth: 0.42, front: 0.44, back: -0.4, chamfer: 0.32 },
          { y: 0.55, halfWidth: 0.4, front: 0.42, back: -0.38, chamfer: 0.34 }
        ], [0, -0.25, -0.75])
      );
      // Anneaux de carapace, en travers du dos : ce sont eux qui font lire
      // « crevette » plutôt que « gros poisson ».
      for (const [index, z] of [-1.35, -1.0, -0.65, -0.3].entries()) {
        const half = 0.24 + index * 0.06;
        group.add(
          part(accent, [
            { y: -0.28 - index * 0.01, halfWidth: half, front: 0.07, back: -0.07, chamfer: 0.34 },
            { y: 0.2 + index * 0.02, halfWidth: half, front: 0.07, back: -0.07, chamfer: 0.34 }
          ], [0, -0.25, z])
        );
      }
      // Éventail de queue, redressé tout à l'arrière.
      for (const side of [-1, 0, 1]) {
        group.add(
          part(accent, [
            { y: -0.05, halfWidth: 0.05, front: 0.05, back: -0.05, chamfer: 0.3 },
            { y: 0.5, halfWidth: 0.2, front: 0.04, back: -0.04, chamfer: 0.3 }
          ], [side * 0.15, -0.25, -1.75], [-0.45, side * 0.4, 0])
        );
      }

      // Tête de chat, **à l'avant**, posée un peu plus haut que le dos.
      group.add(
        rough(0xe8834a, [
          { y: -0.2, halfWidth: 0.28, front: 0.3, back: -0.3, chamfer: 0.36 },
          { y: 0.16, halfWidth: 0.44, front: 0.46, back: -0.42, chamfer: 0.32 },
          { y: 0.52, halfWidth: 0.42, front: 0.42, back: -0.42, chamfer: 0.32 }
        ], 131, 0.03, [0, 0, 0.55])
      );
      // Museau clair, truffe rose et moustaches.
      group.add(mesh(loft([
        { y: -0.04, halfWidth: 0.17, front: 0.15, back: -0.15, chamfer: 0.38 },
        { y: 0.14, halfWidth: 0.14, front: 0.13, back: -0.13, chamfer: 0.38 }
      ]), material(0xf4c9b0), [0, 0, 1.0]));
      group.add(mesh(new THREE.BoxGeometry(0.13, 0.09, 0.08), material(0xe08a9a), [0, 0.08, 1.14]));
      for (const side of [-1, 1]) {
        for (const tilt of [-0.1, 0.08]) {
          group.add(mesh(new THREE.BoxGeometry(0.44, 0.025, 0.025), material(0xf4f1e8),
            [side * 0.32, 0.02 + tilt, 1.0], [0, 0, side * tilt * 2.4]));
        }
        // Oreilles de chat, intérieur rose.
        group.add(
          part(0xe8834a, [
            { y: 0.5, halfWidth: 0.16, front: 0.06, back: -0.06, chamfer: 0.3 },
            { y: 0.86, halfWidth: 0.02, front: 0.02, back: -0.02, chamfer: 0.3 }
          ], [side * 0.26, 0, 0.5], [0, 0, side * 0.25])
        );
        group.add(
          part(0xe08a9a, [
            { y: 0.52, halfWidth: 0.09, front: 0.02, back: -0.02, chamfer: 0.3 },
            { y: 0.76, halfWidth: 0.015, front: 0.01, back: -0.01, chamfer: 0.3 }
          ], [side * 0.26, 0, 0.56], [0, 0, side * 0.25])
        );
        // Antennes de crevette, longues, partant du front.
        group.add(
          part(accent, [
            { y: 0.5, halfWidth: 0.025, front: 0.025, back: -0.025, chamfer: 0.3 },
            { y: 1.4, halfWidth: 0.015, front: 0.015, back: -0.015, chamfer: 0.3 }
          ], [side * 0.14, 0, 0.85], [0.45, 0, side * 0.42])
        );
        // Pattes fines, en rang sous l'abdomen.
        for (const z of [-0.3, -0.7, -1.1]) {
          group.add(
            part(accent, [
              { y: -1.2, halfWidth: 0.045, front: 0.045, back: -0.045, chamfer: 0.32 },
              { y: -0.55, halfWidth: 0.065, front: 0.065, back: -0.065, chamfer: 0.32 }
            ], [side * 0.32, 0, z], [0, 0, side * -0.2])
          );
        }
      }
      group.add(eyes([0, 0.24, 0.9], 0.2, 0.75));
      break;
    }

    /**
     * Boneca Ambalabu : une **tête de grenouille posée sur un pneu**, le tout
     * marchant sur deux **jambes humaines**. Les trois éléments doivent rester
     * franchement distincts — c'est leur incompatibilité qui fait le
     * personnage, un mélange fondu n'aurait été qu'une créature de plus.
     */
    case 'tyre': {
      // Le pneu, couché : c'est le **torse**, donc il est plus large que la
      // tête. À l'inverse, la grenouille l'écrasait et il ne restait qu'un
      // bourrelet sous un gros crâne vert.
      // Le pneu est **debout**, son trou face au spectateur : c'est ainsi
      // qu'on le voit sur l'image d'origine. Couché à plat, il se lisait comme
      // une dalle noire sous la grenouille. Un tore naît déjà dans ce plan, il
      // n'y a donc rien à tourner — et les crampons ci-dessous, eux, étaient
      // déjà posés dans le bon plan.
      group.add(mesh(new THREE.TorusGeometry(0.82, 0.34, 5, 14), material(accent, 0.9), [0, 0.02, 0]));
      // Jante claire au centre, sinon le pneu se lit comme un simple anneau.
      group.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 8), material(0x9aa0a8, 0.5), [0, 0.02, 0],
        [Math.PI / 2, 0, 0]));
      // Crampons de bande de roulement, sur le pourtour.
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        group.add(mesh(new THREE.BoxGeometry(0.12, 0.3, 0.22), material(0x15171a),
          [Math.cos(angle) * 0.86, 0.02 + Math.sin(angle) * 0.86, 0], [0, 0, -angle]));
      }

      // Tête de grenouille : large, aplatie, les yeux **sur le dessus**.
      group.add(
        rough(color, [
          { y: 0.72, halfWidth: 0.3, front: 0.38, back: -0.3, chamfer: 0.36 },
          { y: 0.99, halfWidth: 0.44, front: 0.5, back: -0.38, chamfer: 0.32 },
          { y: 1.21, halfWidth: 0.39, front: 0.4, back: -0.34, chamfer: 0.36 }
        ], 137, 0.03)
      );
      // Bouche fendue, d'un bord à l'autre.
      group.add(mesh(new THREE.BoxGeometry(0.7, 0.05, 0.1), material(0x2c3a24), [0, 0.83, 0.42]));
      // Bourrelets oculaires saillants, surmontés des yeux.
      for (const side of [-1, 1]) {
        group.add(
          part(color, [
            { y: 1.17, halfWidth: 0.16, front: 0.16, back: -0.16, chamfer: 0.4 },
            { y: 1.33, halfWidth: 0.14, front: 0.14, back: -0.14, chamfer: 0.4 }
          ], [side * 0.21, 0, 0.04])
        );
      }
      group.add(eyes([0, 1.35, 0.08], 0.21, 0.66));

      // Les jambes humaines, qui sortent du pneu.
      for (const side of [-1, 1]) {
        group.add(
          part(SKIN, [
            { y: -1.3, halfWidth: 0.15, front: 0.15, back: -0.15, chamfer: 0.34 },
            { y: -0.9, halfWidth: 0.2, front: 0.2, back: -0.2, chamfer: 0.34 },
            { y: -0.35, halfWidth: 0.23, front: 0.23, back: -0.23, chamfer: 0.34 }
          ], [side * 0.28, 0, 0])
        );
        group.add(humanFoot(side * 0.3, 0.1, SKIN));
      }
      break;
    }

    /**
     * La Vacca Saturno Saturnita : tête de vache sur un corps de **planète
     * annelée**, debout sur des jambes humaines aux pieds nus démesurés. Les
     * anneaux sont la moitié du personnage : ils sont larges, inclinés, et
     * passent devant comme derrière le corps.
     */
    case 'cow': {
      // Le corps : une sphère, seule forme ronde de tout le bestiaire. Blanche
      // et tachée, comme la vache — en brun, elle se lisait comme un caillou.
      group.add(mesh(new THREE.SphereGeometry(0.78, 10, 8), material(color), [0, 0.1, 0]));
      // Taches, posées **contre** la surface et non plantées dedans.
      for (const [x, y, z] of [[0.36, 0.34, 0.58], [-0.46, 0.02, 0.56], [0.16, -0.36, 0.62], [-0.26, 0.42, -0.54]]) {
        group.add(mesh(new THREE.SphereGeometry(0.19, 5, 4), material(0x2b2926), [x, y + 0.1, z]));
      }
      // Les anneaux : deux tores inclinés. Huit segments radiaux et non trois —
      // en dessous, les facettes partaient en éclats au lieu de faire un
      // anneau, et la planète se retrouvait entourée de débris.
      for (const [radius, tube, tint] of [[1.55, 0.09, accent], [1.26, 0.06, 0xf2efe6]] as const) {
        const ring = mesh(new THREE.TorusGeometry(radius, tube, 8, 22), material(tint, 0.45), [0, 0.1, 0]);
        ring.rotation.set(Math.PI / 2 - 0.42, 0, 0.18);
        group.add(ring);
      }

      // Tête de vache : museau large et clair, cornes et oreilles écartées.
      group.add(
        rough(color, [
          { y: 0.85, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.36 },
          { y: 1.2, halfWidth: 0.42, front: 0.44, back: -0.4, chamfer: 0.32 },
          { y: 1.55, halfWidth: 0.36, front: 0.34, back: -0.36, chamfer: 0.36 }
        ], 149, 0.03)
      );
      group.add(
        part(0xe0a8a8, [
          { y: 0.95, halfWidth: 0.26, front: 0.2, back: -0.2, chamfer: 0.38 },
          { y: 1.18, halfWidth: 0.22, front: 0.18, back: -0.18, chamfer: 0.38 }
        ], [0, 0, 0.36])
      );
      for (const side of [-1, 1]) {
        group.add(mesh(new THREE.BoxGeometry(0.08, 0.1, 0.06), material(0x6b4550), [side * 0.11, 1.02, 0.56]));
        // Corne claire, recourbée vers le haut.
        group.add(
          part(0xe8dcc0, [
            { y: 1.5, halfWidth: 0.09, front: 0.09, back: -0.09, chamfer: 0.34 },
            { y: 1.82, halfWidth: 0.04, front: 0.04, back: -0.04, chamfer: 0.34 }
          ], [side * 0.3, 0, 0], [0, 0, side * 0.55])
        );
        // Oreille tombante.
        group.add(
          part(color, [
            { y: 1.34, halfWidth: 0.16, front: 0.06, back: -0.06, chamfer: 0.32 },
            { y: 1.5, halfWidth: 0.05, front: 0.04, back: -0.04, chamfer: 0.32 }
          ], [side * 0.44, 0, 0], [0, 0, side * 1.1])
        );
        // Jambes humaines, pieds nus démesurés.
        group.add(
          part(SKIN, [
            { y: -1.3, halfWidth: 0.16, front: 0.16, back: -0.16, chamfer: 0.34 },
            { y: -0.9, halfWidth: 0.22, front: 0.22, back: -0.22, chamfer: 0.34 },
            { y: -0.45, halfWidth: 0.25, front: 0.25, back: -0.25, chamfer: 0.34 }
          ], [side * 0.3, 0, 0])
        );
        group.add(humanFoot(side * 0.32, 0.12, SKIN));
      }
      group.add(eyes([0, 1.3, 0.34], 0.24, 0.8));
      break;
    }

    /**
     * Glorbo Fruttodrillo : un crocodile dont le **corps est une pastèque**.
     * La pastèque doit rester une pastèque — grosse, ronde, rayée — et la tête
     * un vrai museau de crocodile, long et denté. Fondre les deux en une seule
     * masse verte ne donnerait qu'un lézard bedonnant.
     */
    case 'melon': {
      group.add(mesh(new THREE.SphereGeometry(0.95, 11, 9), material(color), [0, 0.1, 0]));
      // Rayures : des fuseaux sombres plaqués sur la sphère, de pôle à pôle.
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        group.add(
          mesh(
            new THREE.SphereGeometry(0.97, 11, 9, angle, 0.16),
            material(0x2b5226),
            [0, 0.1, 0]
          )
        );
      }

      // Museau de crocodile : long, bas, mâchoire fendue et dents.
      const jaw = (y: number, height: number) =>
        lying(0x4f8a44, [
          { y: -0.1, halfWidth: 0.3, front: height, back: -height, chamfer: 0.3 },
          { y: 0.55, halfWidth: 0.26, front: height * 0.9, back: -height * 0.9, chamfer: 0.3 },
          { y: 1.0, halfWidth: 0.2, front: height * 0.8, back: -height * 0.8, chamfer: 0.32 }
        ], [0, y, 0.95]);
      group.add(jaw(1.05, 0.13));
      group.add(jaw(0.82, 0.1));
      for (const side of [-1, 1]) {
        for (const z of [0.9, 1.15, 1.4]) {
          group.add(mesh(new THREE.ConeGeometry(0.045, 0.14, 4), material(0xf4f1e8), [side * 0.2, 0.94, z], [Math.PI, 0, 0]));
        }
      }
      // Crâne, yeux rouges saillants sur le dessus, comme un vrai crocodile.
      group.add(
        rough(0x4f8a44, [
          { y: 0.85, halfWidth: 0.32, front: 0.35, back: -0.3, chamfer: 0.34 },
          { y: 1.2, halfWidth: 0.36, front: 0.38, back: -0.34, chamfer: 0.32 },
          { y: 1.4, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.36 }
        ], 163, 0.03, [0, 0, 0.55])
      );
      for (const side of [-1, 1]) {
        group.add(mesh(new THREE.SphereGeometry(0.13, 6, 5), material(accent), [side * 0.2, 1.48, 0.6]));
      }
      // Queue dentelée, à l'arrière.
      group.add(lying(0x4f8a44, [
        { y: -0.1, halfWidth: 0.24, front: 0.2, back: -0.2, chamfer: 0.32 },
        { y: 0.9, halfWidth: 0.06, front: 0.06, back: -0.06, chamfer: 0.34 }
      ], [0, -0.1, -1.6]));
      // Deux pattes solides : il marche debout.
      for (const side of [-1, 1]) {
        group.add(
          part(0x4f8a44, [
            { y: -1.45, halfWidth: 0.2, front: 0.34, back: -0.2, chamfer: 0.3 },
            { y: -0.95, halfWidth: 0.24, front: 0.24, back: -0.24, chamfer: 0.32 },
            { y: -0.5, halfWidth: 0.28, front: 0.28, back: -0.28, chamfer: 0.32 }
          ], [side * 0.36, 0, 0.05])
        );
      }
      break;
    }

    /**
     * Burbaloni Luliloli : un capybara **dans une coque de noix de coco**. La
     * coque est un bol brun et velu d'où ne dépassent que la tête placide et
     * les petites oreilles rondes ; c'est ce contraste entre le bol et la bête
     * qui fait le personnage.
     */
    case 'coconut': {
      // Le bol : une demi-sphère ouverte vers le haut.
      const shell = mesh(
        new THREE.SphereGeometry(1.0, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95, side: THREE.DoubleSide }),
        [0, -0.2, 0]
      );
      group.add(shell);
      // Bourre fibreuse : des touffes sombres sur le pourtour.
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        group.add(mesh(new THREE.BoxGeometry(0.14, 0.2, 0.1), material(0x5b4228),
          [Math.cos(angle) * 0.95, -0.45, Math.sin(angle) * 0.95], [0, -angle, 0.2]));
      }
      // Chair blanche au bord, la tranche de la coque.
      group.add(mesh(new THREE.TorusGeometry(0.98, 0.08, 4, 16), material(accent), [0, -0.2, 0], [Math.PI / 2, 0, 0]));

      // Le capybara : museau carré, yeux minuscules, oreilles rondes. Sa tête
      // est volontairement massive et son expression nulle.
      group.add(
        rough(0x8a6a4a, [
          { y: -0.25, halfWidth: 0.5, front: 0.48, back: -0.46, chamfer: 0.34 },
          { y: 0.3, halfWidth: 0.56, front: 0.56, back: -0.5, chamfer: 0.32 },
          { y: 0.7, halfWidth: 0.48, front: 0.5, back: -0.46, chamfer: 0.34 }
        ], 167, 0.03)
      );
      group.add(
        part(0x9c7b58, [
          { y: -0.05, halfWidth: 0.32, front: 0.3, back: -0.3, chamfer: 0.3 },
          { y: 0.35, halfWidth: 0.3, front: 0.28, back: -0.28, chamfer: 0.3 }
        ], [0, 0, 0.42])
      );
      group.add(mesh(new THREE.BoxGeometry(0.16, 0.1, 0.1), material(0x3a2a22), [0, 0.3, 0.74]));
      for (const side of [-1, 1]) {
        group.add(mesh(new THREE.SphereGeometry(0.15, 6, 5), material(0x6b4f36), [side * 0.42, 0.66, -0.05]));
      }
      group.add(eyes([0, 0.5, 0.42], 0.24, 0.5));
      break;
    }

    /**
     * Bananita Dolphinita : un dauphin dont l'arrière est une **banane
     * épluchée**. Le corps gris garde l'aileron et le rostre du dauphin, la
     * peau jaune s'ouvre en pelures derrière lui.
     */
    case 'dolphin': {
      // Corps de dauphin, couché, museau en avant.
      group.add(
        lying(color, [
          { y: -1.0, halfWidth: 0.1, front: 0.1, back: -0.1, chamfer: 0.36 },
          { y: -0.3, halfWidth: 0.38, front: 0.36, back: -0.36, chamfer: 0.34 },
          { y: 0.4, halfWidth: 0.44, front: 0.42, back: -0.42, chamfer: 0.32 },
          { y: 0.95, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.34 },
          { y: 1.3, halfWidth: 0.12, front: 0.14, back: -0.14, chamfer: 0.36 }
        ], [0, 0.1, -0.15])
      );
      // Ventre clair.
      group.add(lying(0xdfe3e6, [
        { y: -0.2, halfWidth: 0.24, front: 0.12, back: -0.12, chamfer: 0.34 },
        { y: 0.8, halfWidth: 0.26, front: 0.12, back: -0.12, chamfer: 0.34 }
      ], [0, -0.22, -0.1]));
      // Aileron dorsal et nageoires.
      group.add(
        part(color, [
          { y: 0.4, halfWidth: 0.07, front: 0.3, back: -0.26, chamfer: 0.3 },
          { y: 0.95, halfWidth: 0.04, front: 0.1, back: -0.2, chamfer: 0.3 }
        ], [0, 0, -0.1], [0.25, 0, 0])
      );
      for (const side of [-1, 1]) {
        group.add(
          part(color, [
            { y: -0.1, halfWidth: 0.06, front: 0.22, back: -0.16, chamfer: 0.3 },
            { y: 0.35, halfWidth: 0.03, front: 0.1, back: -0.12, chamfer: 0.3 }
          ], [side * 0.4, -0.35, 0.1], [0.2, 0, side * 1.25])
        );
      }
      group.add(eyes([0, 0.3, 0.7], 0.26, 0.7));

      // La banane prend **la moitié arrière** de la bête, pas un bout de
      // queue : à peine esquissée, on ne voyait qu'un dauphin avec une tache
      // jaune. Le tronçon d'abord, qui enveloppe le corps.
      group.add(lying(accent, [
        { y: -0.6, halfWidth: 0.46, front: 0.44, back: -0.44, chamfer: 0.3 },
        { y: 0.1, halfWidth: 0.5, front: 0.48, back: -0.48, chamfer: 0.3 },
        { y: 0.6, halfWidth: 0.44, front: 0.42, back: -0.42, chamfer: 0.32 }
      ], [0, 0.05, -1.15]));
      // Puis quatre pelures largement ouvertes vers l'arrière.
      for (const [index, angle] of [-1.4, -0.45, 0.45, 1.4].entries()) {
        group.add(
          part(accent, [
            { y: -0.1, halfWidth: 0.32, front: 0.16, back: -0.16, chamfer: 0.3 },
            { y: 0.85, halfWidth: 0.26, front: 0.12, back: -0.12, chamfer: 0.3 },
            { y: 1.45, halfWidth: 0.07, front: 0.06, back: -0.06, chamfer: 0.32 }
          ], [Math.sin(angle) * 0.42, -0.05 + Math.cos(angle) * 0.18, -1.55],
             [-1.25 - index * 0.03, 0, angle * 0.62])
        );
      }
      break;
    }
  }

  return group;
}

/**
 * Plus grande dimension visée, toutes créatures confondues — la tête de moyai
 * fait un peu moins de 2,7 dans sa plus grande.
 */
const TARGET_SIZE = 2.8;

export function createBrainrot(definition: BossDefinition): THREE.Group {
  const group = shapeOf(definition);
  group.name = `boss-${definition.id}`;

  // Recentré comme la tête de moyai : l'origine tombe au milieu du volume,
  // pour que la caméra du jeu cadre pareil quelle que soit la créature.
  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.children.forEach(child => child.position.sub(center));

  // Puis ramené au gabarit commun. Les proportions sont trop dissemblables
  // pour s'en passer : le frigo-chameau monte à 4,1 de haut et les deux
  // bombardiers à 4,2 de large, là où la statue fait 2,7. Sans mise à
  // l'échelle, porter l'un ou l'autre à la place du moyai le faisait sortir
  // du cadre. Le rapport est conservé, c'est la plus grande dimension qui est
  // calée.
  const size = bounds.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z);
  if (largest > 0) group.scale.setScalar(TARGET_SIZE / largest);

  return group;
}
