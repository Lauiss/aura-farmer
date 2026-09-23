import * as THREE from 'three';
import { Ring, chisel, createRandom, loft, mesh } from '../geometry';
import type { CompanionDefinition } from '../../../assets/static/companions';

/**
 * Compagnons posés autour de la statue, en low poly.
 *
 * Comme les brainrots, un seul fichier paramétré par identifiant plutôt qu'un
 * fichier par objet : ils partagent les mêmes briques et ne diffèrent que par
 * leurs cotes. Tous sont ramenés au même gabarit par `createCompanion`, pour
 * qu'un paquet de cigarettes et une voiture de course tiennent la même place
 * au pied du moyai.
 */

function material(color: number, roughness = 0.7): THREE.MeshStandardMaterial {
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

/** Bloc simple, à partir de ses demi-cotes. */
function box(color: number, w: number, h: number, d: number, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  return mesh(new THREE.BoxGeometry(w, h, d), material(color), position, rotation);
}

/** Roue couchée, pour tout ce qui roule. */
function wheel(x: number, y: number, z: number, radius: number): THREE.Mesh {
  const tyre = mesh(
    new THREE.CylinderGeometry(radius, radius, radius * 0.5, 7),
    material(0x1a1c1f, 0.9),
    [x, y, z]
  );
  // Couchée sur le côté : le cylindre naît debout.
  tyre.rotation.z = Math.PI / 2;
  return tyre;
}

function shapeOf(definition: CompanionDefinition): THREE.Group {
  const group = new THREE.Group();
  const { color, accent } = definition;

  switch (definition.id) {
    /**
     * Vermouth : un **corgi**. Tout le personnage tient à trois traits — un
     * corps long posé très bas, des pattes minuscules, et des oreilles
     * dressées démesurées. Un chien assis aux proportions ordinaires n'en
     * serait pas un.
     */
    case 'vermouth': {
      // Corps allongé, couché à l'horizontale : le `loft` empile selon Y, on
      // le bascule d'un quart de tour pour obtenir la longueur.
      const trunk = loft([
        { y: -0.85, halfWidth: 0.34, front: 0.34, back: -0.34, chamfer: 0.36 },
        { y: -0.2, halfWidth: 0.42, front: 0.42, back: -0.42, chamfer: 0.34 },
        { y: 0.5, halfWidth: 0.4, front: 0.4, back: -0.4, chamfer: 0.34 },
        { y: 0.95, halfWidth: 0.3, front: 0.3, back: -0.3, chamfer: 0.36 }
      ]);
      trunk.rotateX(Math.PI / 2);
      group.add(mesh(chisel(trunk, 0.03, createRandom(1)), material(color), [0, -0.05, 0]));

      // Ventre et poitrail blancs, la marque du corgi.
      const belly = loft([
        { y: -0.7, halfWidth: 0.24, front: 0.2, back: -0.2, chamfer: 0.36 },
        { y: 0.8, halfWidth: 0.26, front: 0.22, back: -0.22, chamfer: 0.36 }
      ]);
      belly.rotateX(Math.PI / 2);
      group.add(mesh(belly, material(0xf0e6d6), [0, -0.3, 0]));

      // Pattes ridicules : c'est leur brièveté qui fait le corgi.
      for (const side of [-1, 1]) {
        for (const z of [0.6, -0.55]) {
          group.add(part(0xf0e6d6, [
            { y: -0.82, halfWidth: 0.12, front: 0.14, back: -0.12, chamfer: 0.34 },
            { y: -0.42, halfWidth: 0.13, front: 0.15, back: -0.12, chamfer: 0.34 }
          ], [side * 0.28, 0, z]));
        }
      }

      // Tête, posée haut et en avant du corps.
      group.add(part(color, [
        { y: 0.05, halfWidth: 0.3, front: 0.3, back: -0.28, chamfer: 0.36 },
        { y: 0.48, halfWidth: 0.34, front: 0.34, back: -0.3, chamfer: 0.36 },
        { y: 0.66, halfWidth: 0.26, front: 0.28, back: -0.24, chamfer: 0.38 }
      ], [0, 0, 0.95]));
      // Museau clair et truffe.
      group.add(part(0xf0e6d6, [
        { y: 0.08, halfWidth: 0.17, front: 0.42, back: 0.14, chamfer: 0.36 },
        { y: 0.3, halfWidth: 0.18, front: 0.38, back: 0.14, chamfer: 0.36 }
      ], [0, 0, 0.95]));
      group.add(mesh(new THREE.SphereGeometry(0.075, 5, 4), material(0x1c1a17), [0, 0.22, 1.42]));
      for (const side of [-1, 1]) {
        group.add(
          mesh(new THREE.SphereGeometry(0.055, 5, 4), new THREE.MeshBasicMaterial({ color: 0x14120f }),
            [side * 0.15, 0.42, 1.22])
        );
      }
      // Les grandes oreilles dressées, triangulaires et bien écartées.
      for (const side of [-1, 1]) {
        group.add(part(color, [
          { y: 0.5, halfWidth: 0.19, front: 0.13, back: -0.11, chamfer: 0.26 },
          { y: 1.05, halfWidth: 0.03, front: 0.04, back: -0.04, chamfer: 0.34 }
        ], [side * 0.24, 0, 0.9], [0, 0, side * 0.22]));
      }
      // Queue courte, à peine un moignon.
      group.add(part(color, [
        { y: 0.35, halfWidth: 0.13, front: 0.12, back: -0.12, chamfer: 0.36 },
        { y: 0.62, halfWidth: 0.1, front: 0.1, back: -0.1, chamfer: 0.38 }
      ], [0, 0, -1.0], [0.5, 0, 0]));
      break;
    }

    /** Couteau papillon, entrouvert : lame en biais, deux châsses. */
    case 'butterfly': {
      group.add(part(color, [
        { y: -0.6, halfWidth: 0.07, front: 0.05, back: -0.05, chamfer: 0.3 },
        { y: 0.15, halfWidth: 0.1, front: 0.06, back: -0.06, chamfer: 0.28 },
        { y: 0.95, halfWidth: 0.03, front: 0.03, back: -0.03, chamfer: 0.35 }
      ], [0, 0, 0], [0, 0, -0.2]));
      // Les deux manches, écartés en V.
      for (const side of [-1, 1]) {
        group.add(part(accent, [
          { y: -0.95, halfWidth: 0.08, front: 0.09, back: -0.09, chamfer: 0.26 },
          { y: -0.05, halfWidth: 0.09, front: 0.1, back: -0.1, chamfer: 0.26 }
        ], [side * 0.16, -0.05, 0], [0, 0, side * 0.42]));
      }
      group.add(box(0xd8b04a, 0.1, 0.1, 0.24, [0.04, -0.12, 0]));
      break;
    }

    /**
     * Moto : réservoir galbé, moteur apparent, échappement, fourche inclinée
     * et phare rond. Réduite à trois boîtes, elle ne se lisait pas comme une
     * moto mais comme un jouet.
     */
    case 'moto': {
      group.add(wheel(-0.72, -0.48, 0, 0.44));
      group.add(wheel(0.76, -0.48, 0, 0.44));
      // Jantes claires, qui creusent les roues.
      for (const x of [-0.72, 0.76]) {
        const rim = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 7), material(0x9aa0a8), [x, -0.48, 0]);
        rim.rotation.z = Math.PI / 2;
        group.add(rim);
      }

      // Cadre : deux tubes, un bas et un oblique.
      group.add(box(0x6c737c, 1.3, 0.1, 0.14, [0.02, -0.42, 0]));
      group.add(box(0x6c737c, 0.66, 0.1, 0.14, [-0.28, -0.12, 0], [0, 0, 0.55]));

      // Moteur, bloc massif au centre bas.
      group.add(box(0x3c4149, 0.46, 0.34, 0.34, [0.12, -0.34, 0]));
      for (const y of [-0.24, -0.36, -0.48]) {
        group.add(box(0x8d949c, 0.4, 0.045, 0.38, [0.12, y, 0]));
      }

      // Réservoir galbé, la pièce qui donne sa ligne à la moto.
      group.add(part(color, [
        { y: -0.12, halfWidth: 0.3, front: 0.17, back: -0.17, chamfer: 0.36 },
        { y: 0.04, halfWidth: 0.34, front: 0.22, back: -0.22, chamfer: 0.34 },
        { y: 0.18, halfWidth: 0.24, front: 0.16, back: -0.16, chamfer: 0.38 }
      ], [-0.12, 0, 0]));

      // Selle, puis la coque arrière relevée.
      group.add(box(0x1c1f24, 0.44, 0.12, 0.3, [0.34, 0.06, 0]));
      group.add(box(accent, 0.3, 0.2, 0.26, [0.62, 0.1, 0], [0, 0, -0.3]));

      // Échappement, le long du flanc.
      group.add(
        mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.9, 7), material(0xb0b6bd),
          [0.3, -0.56, 0.2], [0, 0, Math.PI / 2 + 0.08])
      );

      // Fourche inclinée, guidon et phare.
      group.add(box(0x9aa0a8, 0.09, 0.78, 0.09, [-0.66, -0.1, 0.1], [0, 0, 0.3]));
      group.add(box(0x9aa0a8, 0.09, 0.78, 0.09, [-0.66, -0.1, -0.1], [0, 0, 0.3]));
      group.add(box(0x2f343b, 0.62, 0.07, 0.07, [-0.82, 0.28, 0]));
      for (const side of [-1, 1]) {
        group.add(box(0x1c1f24, 0.12, 0.09, 0.09, [-0.82 + side * 0.26, 0.28, 0]));
      }
      group.add(
        mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 8), material(0xf2e6b0),
          [-0.92, 0.12, 0], [0, 0, Math.PI / 2])
      );
      break;
    }

    /** Paquet de cigarettes, couvercle relevé, deux tiges qui dépassent. */
    case 'cigarettes': {
      group.add(box(color, 0.62, 1.0, 0.3, [0, -0.15, 0]));
      group.add(box(accent, 0.63, 0.26, 0.31, [0, -0.5, 0]));
      // Couvercle basculé vers l'arrière.
      group.add(box(color, 0.62, 0.3, 0.3, [0, 0.45, -0.12], [-0.5, 0, 0]));
      for (const offset of [-0.14, 0.02, 0.16]) {
        group.add(
          mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), material(0xf4f1e6),
            [offset, 0.55, 0.04], [0.1, 0, offset * 0.6])
        );
      }
      break;
    }

    /**
     * Voiture de course : museau plongeant, cockpit ouvert, pontons latéraux,
     * aileron à deux plans et échappement. Trois boîtes empilées ne faisaient
     * pas une voiture.
     */
    case 'racecar': {
      // Plancher, puis la coque. Elle est bâtie en volumes explicites et non
      // en `loft` : celui-ci n'empile que selon Y, et le basculer pour suivre
      // la longueur dressait la caisse à la verticale.
      group.add(box(0x1c1f24, 2.0, 0.12, 0.7, [0, -0.44, 0]));
      // Tub central, large, qui porte le pilote.
      group.add(box(color, 0.9, 0.34, 0.6, [-0.2, -0.22, 0]));
      // Capot avant, plus étroit et plus bas, en deux marches.
      group.add(box(color, 0.5, 0.26, 0.48, [0.42, -0.3, 0]));
      group.add(box(color, 0.45, 0.18, 0.34, [0.82, -0.38, 0]));
      // Capot moteur arrière.
      group.add(box(color, 0.55, 0.3, 0.52, [-0.75, -0.26, 0]));

      // Museau plongeant et aileron avant.
      group.add(box(color, 0.5, 0.14, 0.4, [1.02, -0.4, 0], [0, 0, -0.12]));
      group.add(box(accent, 0.24, 0.05, 0.92, [1.22, -0.5, 0]));

      // Pontons latéraux et écopes.
      for (const z of [-0.46, 0.46]) {
        group.add(box(color, 0.8, 0.26, 0.22, [-0.05, -0.3, z]));
        group.add(box(0x1c1f24, 0.12, 0.2, 0.2, [0.32, -0.28, z]));
      }

      // Cockpit ouvert : un creux sombre, un arceau, un casque.
      group.add(box(0x14161a, 0.52, 0.2, 0.42, [-0.18, -0.06, 0]));
      group.add(box(accent, 0.12, 0.26, 0.4, [-0.46, 0.06, 0]));
      group.add(mesh(new THREE.SphereGeometry(0.17, 6, 5), material(0xf0e4d0), [-0.16, 0.02, 0]));

      // Aileron arrière à deux plans, la signature de la silhouette.
      group.add(box(accent, 0.1, 0.34, 0.26, [-0.98, 0.0, 0.3]));
      group.add(box(accent, 0.1, 0.34, 0.26, [-0.98, 0.0, -0.3]));
      group.add(box(accent, 0.34, 0.06, 0.96, [-1.0, 0.2, 0]));
      group.add(box(color, 0.26, 0.05, 0.9, [-0.98, 0.04, 0], [0, 0, 0.18]));

      // Échappement, au centre de l'arrière.
      group.add(
        mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 7), material(0x8d949c),
          [-1.14, -0.24, 0], [0, 0, Math.PI / 2])
      );

      for (const x of [-0.66, 0.7]) {
        for (const z of [-0.54, 0.54]) {
          group.add(wheel(x, -0.5, z, 0.32));
          const rim = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 7), material(0xb0b6bd), [x, -0.5, z]);
          rim.rotation.z = Math.PI / 2;
          group.add(rim);
        }
      }
      break;
    }

    /** Skibidi toilet : une cuvette d'où sort une tête. */
    case 'skibidi': {
      // Cuvette et réservoir.
      group.add(part(color, [
        { y: -0.95, halfWidth: 0.34, front: 0.4, back: -0.34, chamfer: 0.36 },
        { y: -0.45, halfWidth: 0.42, front: 0.5, back: -0.38, chamfer: 0.36 },
        { y: -0.1, halfWidth: 0.46, front: 0.56, back: -0.4, chamfer: 0.36 }
      ]));
      group.add(box(color, 0.72, 0.62, 0.3, [0, 0.1, -0.44]));
      // Lunette relevée.
      group.add(part(color, [
        { y: -0.08, halfWidth: 0.48, front: 0.58, back: -0.42, chamfer: 0.36 },
        { y: 0.02, halfWidth: 0.48, front: 0.58, back: -0.42, chamfer: 0.36 }
      ]));
      // La tête qui en sort, et son visage.
      group.add(part(accent, [
        { y: 0.0, halfWidth: 0.28, front: 0.3, back: -0.28, chamfer: 0.38 },
        { y: 0.42, halfWidth: 0.32, front: 0.34, back: -0.3, chamfer: 0.4 },
        { y: 0.66, halfWidth: 0.24, front: 0.26, back: -0.24, chamfer: 0.4 }
      ]));
      const white = new THREE.MeshBasicMaterial({ color: 0xf4f1e8 });
      const pupil = new THREE.MeshBasicMaterial({ color: 0x14120f });
      for (const side of [-1, 1]) {
        group.add(mesh(new THREE.SphereGeometry(0.09, 5, 4), white, [side * 0.13, 0.46, 0.3]));
        group.add(mesh(new THREE.SphereGeometry(0.045, 4, 3), pupil, [side * 0.13, 0.46, 0.37]));
      }
      // Bouche grande ouverte : il chante.
      group.add(mesh(new THREE.SphereGeometry(0.1, 5, 4), pupil, [0, 0.24, 0.3]));
      break;
    }

    /**
     * Ivank le tank : caisse basse, chenilles, tourelle et long canon. Le
     * canon est ce qui le distingue de n'importe quelle boîte sur chenilles.
     */
    case 'ivank': {
      // Chenilles, de part et d'autre.
      for (const z of [-0.52, 0.52]) {
        group.add(box(accent, 1.9, 0.44, 0.3, [0, -0.5, z]));
        for (const x of [-0.72, -0.24, 0.24, 0.72]) {
          const roller = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.34, 7), material(0x2a2e26), [x, -0.5, z]);
          roller.rotation.z = Math.PI / 2;
          group.add(roller);
        }
      }
      // Caisse, avec un glacis incliné à l'avant.
      group.add(box(color, 1.7, 0.36, 0.86, [0, -0.16, 0]));
      group.add(box(color, 0.5, 0.3, 0.84, [0.92, -0.24, 0], [0, 0, -0.45]));
      // Tourelle et trappe.
      group.add(part(color, [
        { y: 0.02, halfWidth: 0.46, front: 0.46, back: -0.5, chamfer: 0.32 },
        { y: 0.34, halfWidth: 0.4, front: 0.4, back: -0.44, chamfer: 0.32 }
      ], [-0.12, 0, 0]));
      group.add(
        mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 8), material(accent), [-0.28, 0.38, 0])
      );
      // Le canon, long et net.
      group.add(
        mesh(new THREE.CylinderGeometry(0.085, 0.1, 1.5, 8), material(accent),
          [0.72, 0.16, 0], [0, 0, Math.PI / 2])
      );
      group.add(
        mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8), material(accent),
          [1.42, 0.16, 0], [0, 0, Math.PI / 2])
      );
      // Étoile peinte sur le flanc.
      group.add(box(0xc4352f, 0.26, 0.26, 0.04, [-0.3, -0.16, 0.44]));
      break;
    }

    /**
     * Braulo et Makouille : deux chats tigrés, mêmes cotes. Seules les teintes
     * changent, plus un noeud sur la tête pour Makouille — un second modèle
     * complet pour la même silhouette n'apporterait rien à tenir à jour.
     */
    default: {
      const bow = definition.id === 'makouille';
      group.add(
        mesh(chisel(loft([
          { y: -0.75, halfWidth: 0.36, front: 0.4, back: -0.4, chamfer: 0.36 },
          { y: -0.1, halfWidth: 0.34, front: 0.34, back: -0.4, chamfer: 0.34 },
          { y: 0.4, halfWidth: 0.26, front: 0.26, back: -0.34, chamfer: 0.36 }
        ]), 0.03, createRandom(7)), material(color))
      );
      // Les rayures : des anneaux sombres à peine plus larges que le corps.
      // C'est elles qui font le tigré, la silhouette étant celle de tout chat.
      const stripe = material(bow ? 0x8a6b4f : 0x4a443d);
      for (const y of [-0.62, -0.34, -0.06, 0.2]) {
        group.add(
          mesh(
            loft([
              { y: y - 0.055, halfWidth: 0.37, front: 0.4, back: -0.41, chamfer: 0.35 },
              { y: y + 0.055, halfWidth: 0.37, front: 0.4, back: -0.41, chamfer: 0.35 }
            ]),
            stripe
          )
        );
      }
      // Cou étroit puis tête ronde : sans ce rétrécissement, le chat n'était
      // qu'une silhouette continue où l'on ne distinguait rien.
      group.add(part(color, [
        { y: 0.3, halfWidth: 0.15, front: 0.16, back: -0.14, chamfer: 0.38 },
        { y: 0.6, halfWidth: 0.18, front: 0.2, back: -0.16, chamfer: 0.38 }
      ], [0, 0, 0.06]));
      const head = bow ? 0xdcc4a6 : 0x9a938a;
      group.add(part(head, [
        { y: 0.58, halfWidth: 0.3, front: 0.32, back: -0.26, chamfer: 0.4 },
        { y: 0.95, halfWidth: 0.33, front: 0.35, back: -0.28, chamfer: 0.4 },
        { y: 1.1, halfWidth: 0.24, front: 0.27, back: -0.22, chamfer: 0.4 }
      ], [0, 0, 0.06]));
      // Oreilles pointues, plus larges et plus hautes pour se détacher.
      for (const side of [-1, 1]) {
        group.add(part(head, [
          { y: 1.0, halfWidth: 0.19, front: 0.14, back: -0.12, chamfer: 0.28 },
          { y: 1.48, halfWidth: 0.03, front: 0.04, back: -0.04, chamfer: 0.35 }
        ], [side * 0.22, 0, 0.02], [0, 0, side * 0.26]));
      }
      // Museau clair et truffe, comme pour le chien.
      group.add(part(0xd8d0c4, [
        { y: 0.68, halfWidth: 0.15, front: 0.42, back: 0.2, chamfer: 0.38 },
        { y: 0.84, halfWidth: 0.16, front: 0.4, back: 0.2, chamfer: 0.38 }
      ], [0, 0, 0.06]));
      group.add(mesh(new THREE.SphereGeometry(0.06, 5, 4), material(0xd88a9a), [0, 0.8, 0.5]));
      // Yeux verts, la marque de Braulo.
      const eye = new THREE.MeshBasicMaterial({ color: accent });
      for (const side of [-1, 1]) {
        group.add(mesh(new THREE.SphereGeometry(0.085, 5, 4), eye, [side * 0.15, 0.92, 0.36]));
      }
      // Queue enroulée le long du flanc, annelée comme le reste.
      group.add(part(color, [
        { y: -0.78, halfWidth: 0.07, front: -0.3, back: -0.48, chamfer: 0.35 },
        { y: -0.2, halfWidth: 0.06, front: -0.42, back: -0.58, chamfer: 0.35 },
        { y: 0.3, halfWidth: 0.05, front: -0.24, back: -0.42, chamfer: 0.35 }
      ]));
      for (const y of [-0.55, -0.1, 0.2]) {
        group.add(mesh(new THREE.SphereGeometry(0.085, 5, 4), stripe, [0, y, -0.44 - y * 0.12]));
      }
      // Le noeud de Makouille, posé **sur le côté** de la tête. Entre les deux
      // oreilles, il les recouvrait toutes les deux et masquait le visage.
      if (bow) {
        for (const side of [-1, 1]) {
          group.add(
            mesh(new THREE.SphereGeometry(0.11, 5, 4), material(accent), [0.42, 1.02 + side * 0.11, 0.06])
          );
        }
        group.add(mesh(new THREE.SphereGeometry(0.055, 5, 4), material(0xe8859f), [0.44, 1.02, 0.12]));
      }

      // Le front porte aussi ses marques.
      for (const side of [-1, 1]) {
        group.add(
          mesh(
            loft([
              { y: 1.0, halfWidth: 0.045, front: 0.3, back: 0.1, chamfer: 0.3 },
              { y: 1.14, halfWidth: 0.045, front: 0.28, back: 0.1, chamfer: 0.3 }
            ]),
            stripe,
            [side * 0.1, 0, 0.06]
          )
        );
      }
      break;
    }
  }

  return group;
}

/** Plus grande dimension visée, pour que tous tiennent la même place. */
const TARGET_SIZE = 2;

export function createCompanion(definition: CompanionDefinition): THREE.Group {
  const group = shapeOf(definition);
  group.name = `companion-${definition.id}`;

  // Recentré puis ramené au gabarit commun : une voiture de course et un
  // paquet de cigarettes ne se dessinent pas à la même échelle.
  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  group.children.forEach(child => child.position.sub(center));

  const size = bounds.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z);
  if (largest > 0) group.scale.setScalar(TARGET_SIZE / largest);

  return group;
}
