import * as THREE from 'three';
import { Ring, loft, mesh } from '../geometry';
import type { RelicDefinition } from '../../../assets/static/collectibles';

/**
 * Reliques, en low poly : les trophées des boss — la basket de Tralalero, la
 * batte de Sahur… — posés sur un socle sombre, sous un anneau qui flotte.
 *
 * L'objet garde un matériau **éclairé** en `flatShading`, avec une légère
 * émission de la teinte `glow` : il se détache du socle sans perdre ses
 * facettes, ce qui arrivait avec un `MeshBasicMaterial`.
 */

function lit(color: number, glow: number, emissive = 0.25): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: glow,
    emissiveIntensity: emissive,
    flatShading: true,
    roughness: 0.55,
    metalness: 0
  });
}

function plain(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.7, metalness: 0 });
}

function round(y: number, radius: number, chamfer = 0.34): Ring {
  return { y, halfWidth: radius, front: radius, back: -radius, chamfer };
}

/** Socle commun : la relique repose toujours sur la pierre. */
function pedestal(): THREE.Mesh {
  const rings: Ring[] = [
    round(-1.5, 0.78, 0.32),
    round(-1.24, 0.72, 0.32),
    round(-1.16, 0.5, 0.32),
    round(-1.02, 0.46, 0.32)
  ];
  return mesh(loft(rings), plain(0x2f2d29));
}

/** Anneau qui flotte au-dessus de l'objet, signe qu'il s'agit d'une relique. */
function halo(color: number): THREE.Mesh {
  // Peu de segments : l'anneau doit se lire comme un polygone, pas comme un
  // cercle lisse. Incliné, sans quoi il se réduit à un trait vu de face.
  const ring = mesh(
    new THREE.TorusGeometry(0.7, 0.09, 3, 9),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.9,
      flatShading: true,
      roughness: 0.4,
      metalness: 0
    }),
    [0, 1.55, 0],
    [Math.PI / 2 - 0.35, 0, 0]
  );
  ring.name = 'halo';
  return ring;
}

/**
 * Chaussure vue de profil : semelle, empeigne qui monte vers la cheville.
 * Sert à la basket, à la sandale et au chausson de danse, qui ne diffèrent
 * que par leurs proportions et leurs détails.
 */
function shoe(upper: THREE.Material, sole: THREE.Material, height: number, length = 1.3): THREE.Group {
  const group = new THREE.Group();
  const half = length / 2;
  group.add(
    mesh(
      loft([
        { y: -1.02, halfWidth: 0.3, front: half + 0.05, back: -half, chamfer: 0.3 },
        { y: -0.9, halfWidth: 0.31, front: half + 0.05, back: -half, chamfer: 0.3 }
      ]),
      sole
    )
  );
  group.add(
    mesh(
      loft([
        { y: -0.9, halfWidth: 0.28, front: half, back: -half + 0.02, chamfer: 0.32 },
        { y: -0.9 + height * 0.5, halfWidth: 0.26, front: half * 0.45, back: -half + 0.05, chamfer: 0.34 },
        { y: -0.9 + height, halfWidth: 0.22, front: -half * 0.1, back: -half + 0.1, chamfer: 0.36 }
      ]),
      upper
    )
  );
  // Posée de profil, et agrandie : de face, la chaussure se réduisait à un
  // gobelet. Le relèvement compense l'agrandissement, pour qu'elle reste sur
  // le socle.
  group.rotation.y = -1.25;
  group.scale.setScalar(1.35);
  group.position.y = 1.02 * 0.35;
  return group;
}

function object(relic: RelicDefinition): THREE.Group {
  const group = new THREE.Group();
  const main = lit(relic.color, relic.glow);

  switch (relic.id) {
    // Basket bleue de Tralalero, semelle blanche et lacets.
    case 'sneaker': {
      group.add(shoe(main, plain(0xf2efe6), 0.75));
      for (let i = 0; i < 3; i++) {
        const lace = mesh(new THREE.BoxGeometry(0.5, 0.05, 0.06), plain(0xf2efe6), [0, -0.3 + i * 0.13, 0.1 - i * 0.14]);
        lace.rotation.y = -1.25;
        group.add(lace);
      }
      break;
    }

    // Batte de Sahur, dressée : manche fin, tête large.
    case 'bat': {
      group.add(
        mesh(loft([round(-1.02, 0.1), round(-0.3, 0.12), round(0.6, 0.22), round(1.05, 0.2), round(1.15, 0.12)]), main)
      );
      group.add(mesh(loft([round(-1.02, 0.14), round(-0.94, 0.14)]), plain(0x5c4326)));
      group.rotation.z = 0.25;
      break;
    }

    // Plume du pigeon : une lame effilée, tuyau sombre au milieu.
    case 'feather': {
      group.add(
        mesh(
          loft([
            { y: -0.95, halfWidth: 0.04, front: 0.03, back: -0.03, chamfer: 0.3 },
            { y: -0.4, halfWidth: 0.3, front: 0.05, back: -0.05, chamfer: 0.3 },
            { y: 0.5, halfWidth: 0.34, front: 0.05, back: -0.05, chamfer: 0.3 },
            { y: 1.15, halfWidth: 0.03, front: 0.03, back: -0.03, chamfer: 0.3 }
          ]),
          main
        )
      );
      group.add(mesh(new THREE.BoxGeometry(0.04, 2.1, 0.12), plain(0x4a5566), [0, 0.1, 0]));
      group.rotation.set(0, 0.5, 0.3);
      break;
    }

    // Chapeau doré de Patapim : large bord, calotte haute, ruban.
    case 'hat': {
      group.add(mesh(loft([round(-0.95, 0.95, 0.4), round(-0.85, 0.92, 0.4)]), main));
      group.add(mesh(loft([round(-0.85, 0.5, 0.38), round(0.05, 0.44, 0.38), round(0.2, 0.3, 0.4)]), main));
      group.add(mesh(loft([round(-0.8, 0.52, 0.38), round(-0.6, 0.5, 0.38)]), plain(0x6b3a1f)));
      break;
    }

    // Sandale de Lirili : semelle épaisse, deux brides.
    case 'sandal': {
      const sole = new THREE.Group();
      sole.add(mesh(loft([{ y: -1.02, halfWidth: 0.34, front: 0.7, back: -0.65, chamfer: 0.34 }, { y: -0.82, halfWidth: 0.34, front: 0.7, back: -0.65, chamfer: 0.34 }]), main));
      for (const z of [0.3, -0.2]) {
        sole.add(mesh(new THREE.TorusGeometry(0.3, 0.07, 3, 8, Math.PI), plain(0x5c4326), [0, -0.82, z]));
      }
      // Le bouton de la bride centrale, qui en fait une sandale plutôt qu'une planche.
      sole.add(mesh(new THREE.OctahedronGeometry(0.08, 0), plain(0xd8c27a), [0, -0.52, 0.3]));
      sole.rotation.y = -1.25;
      sole.scale.setScalar(1.35);
      sole.position.y = 1.02 * 0.35;
      group.add(sole);
      break;
    }

    // Glaçon du frigo : un bloc facetté translucide.
    case 'ice': {
      const ice = new THREE.MeshStandardMaterial({
        color: relic.color,
        emissive: relic.glow,
        emissiveIntensity: 0.35,
        flatShading: true,
        roughness: 0.15,
        transparent: true,
        opacity: 0.85
      });
      const cube = mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), ice, [0, -0.2, 0]);
      cube.rotation.set(0.5, 0.6, 0.2);
      group.add(cube);
      break;
    }

    // Bombe du bombardier : ogive, ailettes, bout rouge.
    case 'bomb': {
      group.add(
        mesh(loft([round(-1.0, 0.1), round(-0.7, 0.42), round(0.2, 0.46), round(0.7, 0.3), round(0.95, 0.14)]), main)
      );
      group.add(mesh(loft([round(-1.02, 0.12), round(-0.9, 0.16)]), lit(relic.glow, relic.glow, 0.6)));
      for (let i = 0; i < 4; i++) {
        const fin = mesh(new THREE.BoxGeometry(0.04, 0.45, 0.5), plain(0x2a2d31), [0, 0.8, 0]);
        fin.rotation.y = (i * Math.PI) / 2;
        fin.position.x = Math.cos((i * Math.PI) / 2) * 0.22;
        fin.position.z = -Math.sin((i * Math.PI) / 2) * 0.22;
        group.add(fin);
      }
      group.rotation.z = 0.15;
      break;
    }

    // Grenade de l'oie : corps quadrillé, cuillère et goupille.
    case 'grenade': {
      group.add(mesh(loft([round(-1.0, 0.3, 0.2), round(-0.55, 0.5, 0.2), round(0.1, 0.48, 0.2), round(0.4, 0.26, 0.2)]), main));
      group.add(mesh(loft([round(0.4, 0.16), round(0.65, 0.16)]), plain(0x6b6f76)));
      group.add(mesh(new THREE.BoxGeometry(0.12, 0.9, 0.08), plain(0x6b6f76), [0.26, 0.2, 0]));
      group.add(mesh(new THREE.TorusGeometry(0.16, 0.035, 3, 8), plain(0xc9ced6), [-0.28, 0.6, 0], [0, 0.4, 0]));
      break;
    }

    /**
     * Pince de Trippi : deux mors qui s'écartent sur un bras segmenté. Une
     * queue de crevette aurait été plus juste, mais dans une vignette elle se
     * confond avec une feuille ; une pince, non.
     */
    case 'claw': {
      group.add(mesh(loft([round(-1.0, 0.16), round(-0.4, 0.22), round(-0.05, 0.2)]), main));
      // Les deux mors, ouverts en V.
      for (const side of [-1, 1]) {
        group.add(
          mesh(
            loft([round(-0.05, 0.18, 0.28), round(0.5, 0.14, 0.28), round(0.85, 0.05, 0.3)]),
            main,
            [side * 0.12, 0, 0],
            [0, 0, side * 0.42]
          )
        );
      }
      // Anneaux de carapace sur le bras.
      for (const y of [-0.8, -0.55, -0.3]) {
        group.add(mesh(new THREE.TorusGeometry(0.2, 0.05, 3, 9), plain(0xf4c9b0), [0, y, 0], [Math.PI / 2, 0, 0]));
      }
      group.rotation.z = 0.15;
      break;
    }

    /**
     * Pneu de Boneca : couché de trois quarts, jante claire au centre. Debout
     * et de face, il ne se distinguait pas du halo de la relique, qui est lui
     * aussi un anneau.
     */
    case 'tyre': {
      const wheel = new THREE.Group();
      wheel.add(mesh(new THREE.TorusGeometry(0.62, 0.26, 5, 14), main));
      wheel.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 8), plain(0x9aa0a8), [0, 0, 0], [Math.PI / 2, 0, 0]));
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        wheel.add(mesh(new THREE.BoxGeometry(0.1, 0.22, 0.18), plain(0x15171a),
          [Math.cos(angle) * 0.66, Math.sin(angle) * 0.66, 0], [0, 0, -angle]));
      }
      wheel.rotation.set(0.95, 0.35, 0);
      wheel.position.y = -0.2;
      group.add(wheel);
      break;
    }

    /**
     * Cloche de La Vacca : jupe évasée, anse et battant. C'est l'objet le plus
     * simple qui dise « vache » sans avoir à modéliser la bête.
     */
    case 'bell': {
      group.add(mesh(loft([round(-0.75, 0.6, 0.3), round(-0.4, 0.5, 0.32), round(0.15, 0.3, 0.34), round(0.4, 0.22, 0.36)]), main));
      // Anse, au sommet.
      group.add(mesh(new THREE.TorusGeometry(0.18, 0.06, 3, 9), plain(0x6b6f76), [0, 0.5, 0]));
      // Battant, qui dépasse sous la jupe.
      group.add(mesh(new THREE.SphereGeometry(0.14, 6, 5), plain(0x3a3f46), [0, -0.88, 0]));
      group.rotation.z = -0.14;
      break;
    }

    // Loupe de l'espion : cercle, verre bleuté, manche.
    case 'magnifier': {
      const lens = new THREE.Group();
      lens.add(mesh(new THREE.TorusGeometry(0.5, 0.09, 4, 10), main));
      lens.add(
        mesh(
          new THREE.CircleGeometry(0.46, 10),
          new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
        )
      );
      lens.position.y = 0.45;
      group.add(lens);
      group.add(mesh(new THREE.BoxGeometry(0.14, 1.0, 0.14), plain(0x3a2a1c), [0, -0.5, 0]));
      group.rotation.set(0, 0.5, 0.25);
      break;
    }

    // Turban de Piccolo : bourrelet enroulé, tissu qui retombe.
    case 'turban': {
      group.add(mesh(loft([round(-0.95, 0.6, 0.38), round(-0.45, 0.66, 0.38), round(0.05, 0.56, 0.38), round(0.35, 0.3, 0.4)]), main));
      group.add(mesh(new THREE.TorusGeometry(0.62, 0.1, 3, 10), lit(0xd6d0c0, relic.glow), [0, -0.45, 0], [Math.PI / 2, 0, 0]));
      group.add(mesh(new THREE.OctahedronGeometry(0.14, 0), lit(0xc4352f, 0xc4352f, 0.5), [0, -0.3, 0.64]));
      break;
    }

    // Banane de Chimpanzini : courbe, bouts sombres.
    case 'banana': {
      const banana = new THREE.Group();
      banana.add(
        mesh(
          loft([
            { y: -0.9, halfWidth: 0.08, front: 0.08, back: -0.08, chamfer: 0.3 },
            { y: -0.5, halfWidth: 0.24, front: 0.22, back: -0.22, chamfer: 0.3 },
            { y: 0.3, halfWidth: 0.26, front: 0.24, back: -0.24, chamfer: 0.3 },
            { y: 0.9, halfWidth: 0.1, front: 0.1, back: -0.1, chamfer: 0.3 }
          ]),
          main
        )
      );
      banana.add(mesh(loft([round(0.88, 0.06), round(1.05, 0.05)]), plain(0x4a3a22)));
      banana.rotation.z = -0.5;
      banana.position.x = 0.25;
      // Seconde banane, inclinée à l'inverse : la paire se lit mieux qu'un fruit seul.
      const second = banana.clone();
      second.rotation.z = 0.35;
      second.position.set(-0.2, -0.1, -0.2);
      group.add(banana, second);
      break;
    }

    // Katana du Cappuccino : lame, garde dorée, poignée noire.
    case 'katana': {
      group.add(mesh(new THREE.BoxGeometry(0.1, 1.7, 0.03), main, [0, 0.35, 0]));
      group.add(mesh(new THREE.BoxGeometry(0.4, 0.06, 0.2), plain(0xb59a6d), [0, -0.52, 0]));
      group.add(mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), plain(0x1c1c1f), [0, -0.78, 0]));
      group.rotation.set(0, 0.6, 0.35);
      break;
    }

    // Chausson de pointe de la ballerine, et son ruban.
    case 'slipper': {
      group.add(shoe(main, lit(0xe38fb0, relic.glow), 0.45, 1.1));
      group.add(mesh(new THREE.TorusGeometry(0.34, 0.045, 3, 10), lit(0xf7c6d8, relic.glow), [0, -0.2, 0], [0.3, 0, 0.9]));
      break;
    }

    // Couronne de l'héritage, reprise à Chad Moai.
    default: {
      group.add(mesh(loft([round(-0.95, 0.6, 0.2), round(-0.5, 0.62, 0.2)]), main));
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        group.add(
          mesh(new THREE.ConeGeometry(0.16, 0.5, 4), main, [Math.sin(angle) * 0.5, -0.25, Math.cos(angle) * 0.5])
        );
        group.add(
          mesh(new THREE.OctahedronGeometry(0.08, 0), lit(0xc4352f, 0xc4352f, 0.5), [Math.sin(angle) * 0.62, -0.72, Math.cos(angle) * 0.62])
        );
      }
      break;
    }
  }

  return group;
}

export function createRelic(relic: RelicDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = `relic-${relic.id}`;

  group.add(pedestal());
  const item = object(relic);
  item.name = 'stone';
  group.add(item);
  group.add(halo(relic.glow === 0x1c1c1f ? relic.color : relic.glow));
  return group;
}
