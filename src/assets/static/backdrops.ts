import { createRandom } from '../../app/utils/random';
import type { BackgroundId } from './backgrounds';

/**
 * Les décors, en 2D.
 *
 * Ils étaient une **seconde scène Three.js**, peinte avant la statue puis la
 * profondeur remise à zéro. Ils n'y gagnaient rien : trois des cinq n'étaient
 * déjà que des silhouettes plates sur un aplat de ciel, et la 3D leur coûtait
 * une passe de rendu complète à chaque image, un plan de ciel qui ne couvrait
 * pas les écrans larges, et un éclairage à accorder avec celui de la statue.
 *
 * Décrits en SVG, ils gagnent ce que la 2D donne pour rien et que le low poly
 * rendait cher : autant de plans qu'on veut, et des silhouettes nettes.
 *
 * **Aplats francs, sans dégradé ni halo.** Un ciel dégradé et des lumières qui
 * rayonnent sont l'habillage par défaut de tout fond fabriqué à la va-vite ;
 * c'est aussi l'inverse de ce que fait le reste du jeu, qui est en facettes
 * plates et à arêtes dures. Chaque plan est donc une **seule couleur**, posée
 * bord à bord avec la suivante, comme une sérigraphie.
 *
 * Aucune image : que des formes et des couleurs, donc rien à régénérer si une
 * teinte change — la règle « plus aucune image 2D » du projet tient.
 *
 * Le repère est un `viewBox` de 100 × 60, cadré en `slice` : les décors sont
 * dessinés **larges**, la hauteur étant rognée avant la largeur sur un écran
 * de téléphone.
 */

export interface BackdropLayer {
  /** Polygone du plan, en coordonnées du `viewBox`. */
  points: string;
  fill: string;
  opacity?: number;
}

/** Petites taches : fenêtres éclairées, étoiles, écume. Jamais lumineuses. */
export interface BackdropDots {
  fill: string;
  radius: number;
  positions: readonly (readonly [number, number])[];
  /** Taches carrées pour les fenêtres, rondes pour les étoiles. */
  square?: boolean;
}

export interface Backdrop {
  /** Le ciel : **une** couleur, pas un dégradé. */
  sky: string;
  layers: readonly BackdropLayer[];
  dots?: readonly BackdropDots[];
  /** Astre, s'il y en a un : un disque plat, sans halo. */
  disc?: { cx: number; cy: number; r: number; fill: string };
}

const W = 100;
const H = 60;

/** Ferme un profil en polygone plein jusqu'au bas du cadre. */
function closed(points: readonly (readonly [number, number])[]): string {
  return [[0, H] as const, ...points, [W, H] as const]
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
}

/** Une ligne d'immeubles : des toits plats d'largeurs et hauteurs variées. */
function skyline(random: () => number, base: number, low: number, high: number): (readonly [number, number])[] {
  const points: (readonly [number, number])[] = [];
  let x = -4;
  while (x < W + 4) {
    const width = 4 + random() * 7;
    const top = base - (low + random() * (high - low));
    points.push([x, top], [x + width, top]);
    x += width;
    // Un intervalle de temps en temps : une ligne de toits sans creux se lit
    // comme un mur et non comme une ville.
    if (random() < 0.3) {
      const gap = 1 + random() * 2.5;
      points.push([x, base], [x + gap, base]);
      x += gap;
    }
  }
  return points;
}

/** Une chaîne de sommets, pour les montagnes et les dunes. */
function ridge(random: () => number, base: number, low: number, high: number, step: number): (readonly [number, number])[] {
  const points: (readonly [number, number])[] = [];
  for (let x = -6; x < W + 6; x += step) {
    points.push([x, base]);
    points.push([x + step / 2, base - (low + random() * (high - low))]);
  }
  points.push([W + 6, base]);
  return points;
}

function scatter(
  random: () => number,
  count: number,
  box: { x: number; y: number; w: number; h: number }
): (readonly [number, number])[] {
  return Array.from({ length: count }, () =>
    [box.x + random() * box.w, box.y + random() * box.h] as const
  );
}

/**
 * Fenêtres éclairées, par petits groupes.
 *
 * Un pas fixe en largeur les rangeait en **colonnes** parfaitement régulières
 * sur toute l'image, ce qui se lit comme une trame et non comme une ville. Les
 * immeubles sont donc tirés au sort en largeur, et chacun n'allume que
 * quelques étages sur une ou deux travées.
 */
function windows(random: () => number, base: number): (readonly [number, number])[] {
  const list: (readonly [number, number])[] = [];
  let x = 1;
  while (x < W) {
    const width = 3.5 + random() * 5;
    const floors = 3 + Math.floor(random() * 6);
    const columns = 1 + Math.floor(random() * 2);
    for (let c = 0; c < columns; c++) {
      const cx = x + 0.8 + c * (width * 0.45);
      for (let f = 0; f < floors; f++) {
        // Un étage sur deux environ reste éteint : une façade entièrement
        // allumée n'a l'air ni habitée ni nocturne.
        if (random() < 0.45) continue;
        list.push([cx, base - 2 - f * 2.2]);
      }
    }
    x += width;
  }
  return list;
}

function build(id: BackgroundId): Backdrop {
  const random = createRandom(9001 + id.length * 37);

  switch (id) {
    /**
     * Ville de nuit. Deux plans d'immeubles, le plus proche nettement plus
     * sombre : c'est l'écart de valeur entre les deux qui creuse la rue, pas
     * un fondu.
     */
    case 'city':
      return {
        sky: '#2b3a57',
        layers: [
          { points: closed(skyline(random, 46, 6, 15)), fill: '#222c44' },
          { points: closed(skyline(random, 52, 8, 20)), fill: '#151b2c' }
        ],
        // Fenêtres éclairées, pas des néons : un beige éteint, à peine plus
        // clair que la façade, et peu nombreuses.
        dots: [{ fill: '#c9b98d', radius: 0.26, square: true, positions: windows(random, 52) }]
      };

    /**
     * Montagnes. Trois chaînes du plus clair au plus sombre : l'éloignement se
     * dit par **paliers** de valeur, chacun d'une seule teinte, et non par une
     * brume continue.
     */
    case 'mountains':
      return {
        sky: '#3b5068',
        layers: [
          { points: closed(ridge(random, 44, 8, 17, 16)), fill: '#4a5f73' },
          { points: closed(ridge(random, 50, 7, 15, 13)), fill: '#31424f' },
          { points: closed(ridge(random, 56, 5, 11, 10)), fill: '#1f2b34' }
        ]
      };

    /** Crépuscule : un ciel orangé sourd, le soleil bas, des dunes à contre-jour. */
    case 'dusk':
      return {
        sky: '#b5643f',
        // Décalé loin du centre : la statue occupe tout le milieu de l'écran,
        // et un soleil posé à 62 n'en montrait qu'un croissant derrière elle.
        disc: { cx: 79, cy: 43, r: 7, fill: '#e0a05c' },
        layers: [
          { points: closed(ridge(random, 47, 4, 9, 19)), fill: '#8a4a3c' },
          { points: closed(ridge(random, 52, 5, 12, 15)), fill: '#4a2a2a' },
          { points: closed(ridge(random, 57, 4, 9, 12)), fill: '#241719' }
        ]
      };

    /** Rivage : le ciel, la mer en trois bandes franches, le sable. */
    case 'shore':
      return {
        sky: '#7fa3b0',
        layers: [
          { points: closed([[0, 40], [W, 40]]), fill: '#2f5f70' },
          { points: closed([[0, 46], [W, 46]]), fill: '#3d7585' },
          { points: closed([[0, 51], [W, 51]]), fill: '#5b95a0' },
          { points: closed(ridge(random, 58, 1, 3, 26)), fill: '#c9b48a' }
        ],
        dots: [{ fill: '#d8e2e0', radius: 0.32, positions: scatter(random, 22, { x: 0, y: 42, w: W, h: 8 }) }]
      };

    /** Le vide : un noir bleuté, des étoiles blanches, une crête basse. */
    default:
      return {
        sky: '#0d0b16',
        layers: [
          { points: closed(ridge(random, 58, 1, 4, 22)), fill: '#1a1626' }
        ],
        // Une seule taille, un seul blanc éteint. Deux tailles et une teinte
        // colorée donnaient un ciel de fond d'écran.
        dots: [{ fill: '#b8b2c4', radius: 0.22, positions: scatter(random, 70, { x: 0, y: 0, w: W, h: 52 }) }]
      };
  }
}

/** Les décors sont construits une fois : leur tirage est déterministe. */
const CACHE = new Map<BackgroundId, Backdrop>();

export function backdrop(id: BackgroundId): Backdrop {
  let found = CACHE.get(id);
  if (!found) {
    found = build(id);
    CACHE.set(id, found);
  }
  return found;
}

export const BACKDROP_VIEWBOX = `0 0 ${W} ${H}`;
