/**
 * Ceux qui appellent pendant le doomscrolling.
 *
 * Le téléphone ne sert plus qu'à faire défiler : de loin en loin, quelqu'un
 * appelle, et il faut décider en quelques secondes. Deux des trois sont de
 * bonnes affaires, le troisième est un piège — et rien ne les distingue avant
 * d'avoir lu le nom à l'écran, ce qui est tout l'intérêt.
 */

export type CallerId = 'john' | 'colonel' | 'larry';

export interface CallerDefinition {
  id: CallerId;
  /**
   * Ce que **répondre** rapporte, compté en secondes de production. Négatif
   * pour ceux à qui il ne fallait pas répondre.
   */
  answerSeconds: number;
  /** Ce que **raccrocher** coûte, en secondes de production. 0 pour personne. */
  hangUpSeconds: number;
  /** Poids du tirage : Larry appelle moins souvent, sinon le piège lasse. */
  weight: number;
  /** Teintes du modèle. */
  skin: number;
  accent: number;
}

/**
 * Les montants sont en **secondes de production** et non en aura fixe : un
 * appel doit valoir la peine d'être décroché aussi bien à la première heure
 * qu'à la dixième. Un plancher (`CALL_FLOOR`) les rend sensibles avant que la
 * production ne décolle.
 */
export const CALLERS: readonly CallerDefinition[] = [
  { id: 'john', answerSeconds: 45, hangUpSeconds: 20, weight: 5, skin: 0xe9a7a4, accent: 0xf2efe6 },
  { id: 'colonel', answerSeconds: 60, hangUpSeconds: 25, weight: 3, skin: 0x8a6a4a, accent: 0x25d366 },
  // Répondre à Larry coûte davantage que raccrocher à n'importe qui ne
  // rapporte : le piège doit mordre, sinon autant décrocher à chaque fois.
  // Le noir de Larry est **à peine** éclairci : juste assez pour que ses
  // facettes se détachent du gris très sombre du thème, pas au point d'en
  // faire un chat gris.
  { id: 'larry', answerSeconds: -110, hangUpSeconds: 0, weight: 3, skin: 0x24262d, accent: 0x9ad94f }
];

export function callerDefinition(id: CallerId): CallerDefinition {
  return CALLERS.find(caller => caller.id === id)!;
}

/** Plancher d'un appel, pour qu'il compte avant que la production ne décolle. */
export const CALL_FLOOR = 250;

/** Durée de sonnerie, en secondes. Passé ce délai, l'appel est manqué. */
export const CALL_RING_SECONDS = 7;
