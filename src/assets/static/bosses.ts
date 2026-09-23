/**
 * Boss des battles d'aura.
 *
 * Chaque boss indexe ses points de vie et ses dégâts sur la **production par
 * seconde** du joueur, jamais sur une valeur absolue : l'équilibrage suit donc
 * la partie au lieu de décrocher au bout de deux heures. `recommended` est le
 * débit d'aura conseillé pour l'affronter, affiché avant le combat.
 */

export type BossId =
  | 'tralalero'
  | 'sahur'
  | 'piccione'
  | 'patapim'
  | 'lirili'
  | 'frigo'
  | 'bombardiro'
  | 'gusini'
  | 'spioniro'
  | 'piccolo'
  | 'chad';

/** Allure générale d'un boss, qui commande son modèle low poly. */
export type BossShape =
  | 'shark'
  | 'club'
  | 'pigeon'
  | 'tree'
  | 'cactus'
  | 'fridge'
  | 'croc'
  | 'goose'
  | 'spy'
  | 'namek'
  | 'moai';

export interface BossDefinition {
  id: BossId;
  shape: BossShape;
  /** Débit d'aura conseillé, en aura par seconde. */
  recommended: number;
  /**
   * Points de vie, en secondes du **débit conseillé** et non du débit du
   * joueur : c'est ce qui fait du niveau conseillé une vraie indication.
   * Indexer la vie du boss sur la production du joueur aurait rendu tous les
   * combats identiques quelle que soit sa progression.
   */
  hpSeconds: number;
  /** Dégâts par coup porté, en secondes du débit conseillé. */
  damageSeconds: number;
  /** Gemmes rendues à la première victoire. */
  reward: number;
  /** Teintes du modèle. */
  color: number;
  accent: number;
}

/**
 * Les boss se suivent dans l'ordre : chacun se déverrouille en battant le
 * précédent. Piccolo est l'avant-dernier, le frère Chad Moai ferme la marche.
 */
export const BOSSES: readonly BossDefinition[] = [
  { id: 'tralalero', shape: 'shark', recommended: 500, hpSeconds: 25, damageSeconds: 4, reward: 15, color: 0x4a7fd4, accent: 0xf0f0f0 },
  { id: 'sahur', shape: 'club', recommended: 5000, hpSeconds: 31, damageSeconds: 4.5, reward: 20, color: 0xa9793f, accent: 0x5c4326 },
  { id: 'piccione', shape: 'pigeon', recommended: 40000, hpSeconds: 37, damageSeconds: 5, reward: 28, color: 0x6f7f93, accent: 0x9aa7b8 },
  { id: 'patapim', shape: 'tree', recommended: 300000, hpSeconds: 43, damageSeconds: 5.5, reward: 38, color: 0x6b8f4e, accent: 0x7a5a38 },
  { id: 'lirili', shape: 'cactus', recommended: 2.5e+06, hpSeconds: 49, damageSeconds: 6, reward: 50, color: 0x58a05e, accent: 0xd8c27a },
  { id: 'frigo', shape: 'fridge', recommended: 2e+07, hpSeconds: 55, damageSeconds: 6.5, reward: 65, color: 0xdfe3e6, accent: 0xc29a63 },
  { id: 'bombardiro', shape: 'croc', recommended: 1.5e+08, hpSeconds: 61, damageSeconds: 7, reward: 85, color: 0x6f9159, accent: 0x8fa3b8 },
  { id: 'gusini', shape: 'goose', recommended: 1.2e+09, hpSeconds: 68, damageSeconds: 7.5, reward: 110, color: 0xeeeae0, accent: 0x7d8796 },
  { id: 'spioniro', shape: 'spy', recommended: 1e+10, hpSeconds: 75, damageSeconds: 8, reward: 145, color: 0x6b7686, accent: 0xb59a6d },
  { id: 'piccolo', shape: 'namek', recommended: 8e+10, hpSeconds: 82, damageSeconds: 8.5, reward: 190, color: 0x7fb069, accent: 0xd6d0c0 },
  { id: 'chad', shape: 'moai', recommended: 1e+12, hpSeconds: 90, damageSeconds: 9, reward: 250, color: 0xb9b2a4, accent: 0xe8b84b }
];

/**
 * Débit d'aura à partir duquel les battles se découvrent : celui conseillé
 * pour le premier boss. Avant ce seuil, ni l'entrée de menu ni les
 * améliorations de dé n'existent pour le joueur.
 */
export const BATTLE_UNLOCK = BOSSES[0].recommended;

export function bossDefinition(id: BossId): BossDefinition {
  return BOSSES.find(boss => boss.id === id)!;
}

/** Points de vie du joueur, en secondes de sa propre production. */
export const PLAYER_HP_SECONDS = 100;

/**
 * Multiplicateur appliqué à la contribution d'un enseignement pour en tirer
 * des dégâts. Choisir l'enseignement qui rapporte le plus est donc toujours le
 * meilleur coup : c'est la production du joueur, et sa répartition, qui font sa
 * force au combat.
 */
export const DAMAGE_PER_CONTRIBUTION = 30;

/** Part de la récompense rendue quand on refait un boss déjà battu. */
export const FARM_REWARD_SHARE = 0.2;

/** Faces du dé lancé par les deux camps à chaque tour. */
export const DIE_FACES = 20;
