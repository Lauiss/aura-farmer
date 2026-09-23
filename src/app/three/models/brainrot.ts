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
function rough(color: number, rings: Ring[], seed: number, amount = 0.04): THREE.Mesh {
  return mesh(chisel(loft(rings), amount, createRandom(seed)), material(color));
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
