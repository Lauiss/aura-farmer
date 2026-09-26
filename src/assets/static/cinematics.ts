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

/**
 * Un embranchement : le plan attend une décision au lieu de s'enchaîner. Les
 * deux options mènent à des suites différentes, et le choix est **définitif** —
 * c'est ce qui en fait un choix.
 */
export interface Choice {
  id: string;
  /** Clé de traduction du libellé du bouton. */
  label: string;
}

export interface Shot {
  /** Décision demandée au joueur. Le plan ne s'enchaîne pas tant qu'elle tient. */
  choice?: readonly Choice[];
  /**
   * Texte encadré affiché au centre, pour ce qui se lit plutôt que se dit —
   * la lettre du père. Une réplique en bulle aurait fait parler un absent.
   */
  note?: string;
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
const FATHER: Actor = { kind: 'boss', id: 'father' };

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

/**
 * La fin : Chad à terre, et John Pork qui dit enfin d'où il vient. Elle
 * remplace la petite scène de victoire pour ce boss-là — on ne félicite pas
 * quelqu'un qui vient de reprendre sa succession, on lui explique.
 */
const FINALE: CinematicDefinition = {
  id: 'finale',
  shots: [
    { left: { actor: HERO, beat: 'power' }, right: { actor: CHAD, beat: 'fall' }, durationMs: 1900 },
    { left: { actor: HERO, beat: 'stand' }, right: { actor: CHAD, beat: 'down' },
      speaker: CHAD, line: 'CINE_FINALE_1', durationMs: 3200 },
    { left: { actor: HERO, beat: 'stand' }, right: { actor: JOHN, beat: 'enter-right' },
      speaker: JOHN, line: 'CINE_FINALE_2', durationMs: 3600 },
    { left: { actor: HERO, beat: 'stand' }, right: { actor: JOHN, beat: 'stand' },
      speaker: JOHN, line: 'CINE_FINALE_3', durationMs: 3600 },
    { left: { actor: HERO, beat: 'stand' }, right: { actor: JOHN, beat: 'stand' },
      speaker: JOHN, line: 'CINE_FINALE_4', durationMs: 4000 }
  ]
};

/**
 * La lettre, une fois le sceau brisé. Elle n'a qu'un plan : ce qui compte est
 * ce qui est écrit, pas ce qui bouge.
 */
const LETTER: CinematicDefinition = {
  id: 'letter',
  shots: [
    { left: { actor: HERO, beat: 'stand' }, note: 'CINE_LETTER_TEXT', durationMs: 7000 },
    { left: { actor: HERO, beat: 'stand' }, right: { actor: JOHN, beat: 'enter-right' },
      speaker: JOHN, line: 'CINE_LETTER_AFTER', durationMs: 4000 },
    // L'embranchement. Garder, c'est accepter ; brûler, c'est demander des
    // comptes à quelqu'un qui n'est plus là pour en rendre.
    {
      left: { actor: HERO, beat: 'stand' },
      speaker: JOHN,
      line: 'CINE_LETTER_CHOICE',
      choice: [
        { id: 'keep', label: 'CINE_LETTER_KEEP' },
        { id: 'burn', label: 'CINE_LETTER_BURN' }
      ],
      durationMs: 0
    }
  ]
};

/** Ce qu'on a fait de la lettre. `null` tant que la question ne s'est pas posée. */
export type Ending = 'keep' | 'burn';

/**
 * Ce qui suit le choix. Garder clôt l'histoire ; brûler la rouvre — la fumée
 * monte, et quelqu'un descend.
 */
const KEPT: CinematicDefinition = {
  id: 'ending-keep',
  shots: [
    { left: { actor: HERO, beat: 'stand' }, note: 'CINE_KEEP_NOTE', durationMs: 5200 },
    { left: { actor: HERO, beat: 'stand' }, right: { actor: JOHN, beat: 'stand' },
      speaker: JOHN, line: 'CINE_KEEP_END', durationMs: 4200 }
  ]
};

const BURNED: CinematicDefinition = {
  id: 'ending-burn',
  shots: [
    { left: { actor: HERO, beat: 'power' }, speaker: JOHN, line: 'CINE_BURN_1', durationMs: 3400 },
    { left: { actor: HERO, beat: 'stand' }, right: { actor: FATHER, beat: 'enter-right' },
      speaker: FATHER, line: 'CINE_BURN_2', durationMs: 4000 },
    { left: { actor: HERO, beat: 'stand' }, right: { actor: FATHER, beat: 'power' },
      speaker: FATHER, line: 'CINE_BURN_3', durationMs: 4200 }
  ]
};

export const CINEMATICS: readonly CinematicDefinition[] = [INTRO, FINALE, LETTER, KEPT, BURNED];

/**
 * Aura nécessaire pour briser le sceau de la lettre. Un quintillion : c'est
 * loin derrière le débit conseillé du dernier boss, donc atteignable, mais
 * pas le lendemain de sa victoire — la lettre se mérite une deuxième fois.
 */
export const LETTER_SEAL = 1e18;

/**
 * La victoire sur un boss, construite à la demande : vingt scènes écrites à la
 * main pour trois plans identiques n'auraient rien apporté, et chaque boss
 * ajouté aurait demandé la sienne.
 */
export function victoryScene(boss: BossId): CinematicDefinition {
  const fallen: Actor = { kind: 'boss', id: boss };
  return {
    id: `victory-${boss}`,
    shots: [
      { left: { actor: HERO, beat: 'power' }, right: { actor: fallen, beat: 'fall' }, durationMs: 1700 },
      { left: { actor: HERO, beat: 'stand' }, right: { actor: JOHN, beat: 'enter-right' },
        speaker: JOHN, line: 'CINE_VICTORY', durationMs: 2800 }
    ]
  };
}

export function cinematic(id: string): CinematicDefinition | undefined {
  return CINEMATICS.find(scene => scene.id === id);
}
