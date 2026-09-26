import type { CallerId } from './callers';
import type { BossId } from './bosses';

/**
 * Cinématiques : de petites scènes jouées aux moments qui comptent.
 *
 * Le parti pris est qu'une cinématique n'est **pas** une animation sur mesure
 * mais une suite de plans décrits en données. Chaque plan dit qui est à
 * l'écran, ce qu'il fait, et ce qui se dit. C'est ce qui permet d'en ajouter
 * une sans écrire une ligne de rendu : l'intro ci-dessous et la chute de Chad
 * partagent exactement le même lecteur.
 *
 * Les dialogues passent par la **tête et la bulle** déjà utilisées partout
 * ailleurs dans le jeu : un personnage qui parle se présente de la même façon
 * qu'il s'agisse d'un appel, d'un conseil du mentor ou d'une cinématique.
 */

/** Qui occupe le plan. Le moyai du joueur n'a pas d'identifiant : c'est `hero`. */
export type Actor = { kind: 'hero' } | { kind: 'boss'; id: BossId } | { kind: 'caller'; id: CallerId };

/**
 * Ce que fait l'acteur pendant le plan. Volontairement peu de verbes : chacun
 * doit se lire sur une silhouette low poly de deux cents pixels, et une
 * pantomime plus fine ne se verrait pas.
 */
export type Beat =
  | 'stand'
  /** Entre par la gauche ou la droite. */
  | 'enter-left'
  | 'enter-right'
  /** S'effondre : bascule et descend. */
  | 'fall'
  /** Reste au sol. */
  | 'down'
  /** Se relève lentement. */
  | 'rise'
  /** Avance d'un coup sur l'autre acteur. */
  | 'strike'
  /** Grandit et s'illumine. */
  | 'power';

export interface Shot {
  /** Acteur de gauche, absent si le plan n'en a qu'un. */
  left?: { actor: Actor; beat: Beat };
  right?: { actor: Actor; beat: Beat };
  /** Qui parle, et ce qu'il dit — clé de traduction. */
  speaker?: Actor;
  line?: string;
  /** Durée du plan, en millisecondes. */
  durationMs: number;
}

export interface CinematicDefinition {
  id: string;
  shots: readonly Shot[];
}

const HERO: Actor = { kind: 'hero' };
const CHAD: Actor = { kind: 'boss', id: 'chad' };
const JOHN: Actor = { kind: 'caller', id: 'john' };

/**
 * L'introduction : la défaite qui met le jeu en route. On y voit ce que le
 * texte racontait jusqu'ici sans jamais le montrer — le frère qui gagne la
 * succession, et le cochon qui ramasse le perdant.
 */
const INTRO: CinematicDefinition = {
  id: 'intro',
  shots: [
    { left: { actor: HERO, beat: 'stand' }, right: { actor: CHAD, beat: 'enter-right' },
      speaker: CHAD, line: 'CINE_INTRO_1', durationMs: 3200 },
    { left: { actor: HERO, beat: 'stand' }, right: { actor: CHAD, beat: 'power' },
      speaker: CHAD, line: 'CINE_INTRO_2', durationMs: 3000 },
    { left: { actor: HERO, beat: 'fall' }, right: { actor: CHAD, beat: 'strike' },
      durationMs: 1800 },
    { left: { actor: HERO, beat: 'down' }, speaker: CHAD, line: 'CINE_INTRO_3', durationMs: 3000 },
    { left: { actor: HERO, beat: 'down' }, right: { actor: JOHN, beat: 'enter-right' },
      speaker: JOHN, line: 'CINE_INTRO_4', durationMs: 3200 },
    { left: { actor: HERO, beat: 'rise' }, right: { actor: JOHN, beat: 'stand' },
      speaker: JOHN, line: 'CINE_INTRO_5', durationMs: 3400 }
  ]
};

export const CINEMATICS: readonly CinematicDefinition[] = [INTRO];

export function cinematic(id: string): CinematicDefinition | undefined {
  return CINEMATICS.find(scene => scene.id === id);
}
