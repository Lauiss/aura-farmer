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
  | 'trippi'
  | 'patapim'
  | 'lirili'
  | 'boneca'
  | 'frigo'
  | 'bombardiro'
  | 'vacca'
  | 'gusini'
  | 'spioniro'
  | 'piccolo'
  | 'chimpanzini'
  | 'cappuccino'
  | 'ballerina'
  | 'glorbo'
  | 'burbaloni'
  | 'bananita'
  | 'chad';

/** Allure générale d'un boss, qui commande son modèle low poly. */
export type BossShape =
  | 'shark'
  | 'club'
  | 'pigeon'
  | 'shrimp'
  | 'tree'
  | 'cactus'
  | 'tyre'
  | 'fridge'
  | 'croc'
  | 'cow'
  | 'goose'
  | 'spy'
  | 'namek'
  | 'banana'
  | 'cup'
  | 'ballerina'
  | 'melon'
  | 'coconut'
  | 'dolphin'
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
 * précédent. Le frère Chad Moai ferme toujours la marche.
 *
 * Trois brainrots sont d'abord venus s'intercaler entre Piccolo et Chad, qui a
 * reculé d'autant (1e12 → 1e13). Trois autres ont suivi — Trippi Troppi,
 * Boneca Ambalabu et La Vacca Saturno — mais **au milieu de l'échelle**, là où
 * deux boss voisins étaient séparés d'un facteur huit, et non à sa fin : Chad
 * n'a donc pas bougé une deuxième fois et la partie ne s'est pas allongée,
 * elle s'est densifiée.
 *
 * Les points de vie et les dégâts s'expriment en secondes du **débit
 * conseillé** : déplacer un `recommended` ne change donc rien à la difficulté
 * du combat lui-même, seulement au moment où on le rencontre. C'est ce qui
 * permet d'insérer un boss sans retoucher `COMBAT`, calé sur Chad.
 *
 * Les trois derniers venus — Glorbo Fruttodrillo, Burbaloni Luliloli et
 * Bananita Dolphinita — sont posés **en haut** de l'échelle et Chad a reculé
 * de 1e13 à 1,6e14. Le reproche auquel ils répondent était qu'on enchaînait
 * les boss trop vite : les intercaler au milieu aurait aggravé exactement cela
 * en rapprochant les combats. Étirer la fin les espace.
 */
export const BOSSES: readonly BossDefinition[] = [
  { id: 'tralalero', shape: 'shark', recommended: 500, hpSeconds: 25, damageSeconds: 4, reward: 15, color: 0x4a7fd4, accent: 0xf0f0f0 },
  { id: 'sahur', shape: 'club', recommended: 5000, hpSeconds: 31, damageSeconds: 4.5, reward: 20, color: 0xa9793f, accent: 0x5c4326 },
  { id: 'piccione', shape: 'pigeon', recommended: 40000, hpSeconds: 37, damageSeconds: 5, reward: 28, color: 0x6f7f93, accent: 0x9aa7b8 },
  { id: 'trippi', shape: 'shrimp', recommended: 1.1e+05, hpSeconds: 40, damageSeconds: 5.25, reward: 33, color: 0xe2703a, accent: 0xf4c9b0 },
  { id: 'patapim', shape: 'tree', recommended: 300000, hpSeconds: 43, damageSeconds: 5.5, reward: 38, color: 0x6b8f4e, accent: 0x7a5a38 },
  { id: 'lirili', shape: 'cactus', recommended: 2.5e+06, hpSeconds: 49, damageSeconds: 6, reward: 50, color: 0x58a05e, accent: 0xd8c27a },
  { id: 'boneca', shape: 'tyre', recommended: 7e+06, hpSeconds: 52, damageSeconds: 6.25, reward: 57, color: 0x6f9a4a, accent: 0x1e2024 },
  { id: 'frigo', shape: 'fridge', recommended: 2e+07, hpSeconds: 55, damageSeconds: 6.5, reward: 65, color: 0xdfe3e6, accent: 0xc29a63 },
  { id: 'bombardiro', shape: 'croc', recommended: 1.5e+08, hpSeconds: 61, damageSeconds: 7, reward: 85, color: 0x6f9159, accent: 0x8fa3b8 },
  { id: 'vacca', shape: 'cow', recommended: 4.5e+08, hpSeconds: 64, damageSeconds: 7.25, reward: 97, color: 0xf2efe6, accent: 0xd9b45a },
  { id: 'gusini', shape: 'goose', recommended: 1.2e+09, hpSeconds: 68, damageSeconds: 7.5, reward: 110, color: 0xeeeae0, accent: 0x7d8796 },
  { id: 'spioniro', shape: 'spy', recommended: 1e+10, hpSeconds: 75, damageSeconds: 8, reward: 145, color: 0x6b7686, accent: 0xb59a6d },
  { id: 'piccolo', shape: 'namek', recommended: 8e+10, hpSeconds: 82, damageSeconds: 8.5, reward: 190, color: 0x7fb069, accent: 0xd6d0c0 },
  { id: 'chimpanzini', shape: 'banana', recommended: 3e+11, hpSeconds: 84, damageSeconds: 8.6, reward: 205, color: 0xe8c547, accent: 0x5b3b24 },
  { id: 'cappuccino', shape: 'cup', recommended: 1e+12, hpSeconds: 86, damageSeconds: 8.7, reward: 220, color: 0xefe6d8, accent: 0x1c1c1f },
  { id: 'ballerina', shape: 'ballerina', recommended: 3.3e+12, hpSeconds: 88, damageSeconds: 8.8, reward: 235, color: 0xf2a7c3, accent: 0xefe6d8 },
  { id: 'glorbo', shape: 'melon', recommended: 1e+13, hpSeconds: 89, damageSeconds: 8.45, reward: 238, color: 0x3f7a3a, accent: 0xd9453f },
  { id: 'burbaloni', shape: 'coconut', recommended: 2.6e+13, hpSeconds: 89, damageSeconds: 8.65, reward: 242, color: 0x7a5a38, accent: 0xf2efe6 },
  { id: 'bananita', shape: 'dolphin', recommended: 6.5e+13, hpSeconds: 89, damageSeconds: 8.85, reward: 246, color: 0x8fa3b8, accent: 0xe8c547 },
  { id: 'chad', shape: 'moai', recommended: 1.6e+14, hpSeconds: 90, damageSeconds: 9, reward: 250, color: 0xb9b2a4, accent: 0xe8b84b }
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
 * Les trois rôles que peut prendre un enseignement au combat, en langue du
 * pays : **MOG** pour frapper, **NPC** pour encaisser sans broncher,
 * **LOOKSMAX** pour se refaire une santé.
 */
export type AttackRole = 'mog' | 'npc' | 'looksmax';

/**
 * Ce que le boss s'apprête à faire, annoncé **avant** que le joueur ne
 * choisisse. C'est toute la mécanique : sans cette annonce, garder et se
 * soigner seraient des paris aveugles et le seul coup jouable resterait
 * l'attaque.
 */
export type BossIntent = 'strike' | 'charge' | 'guard';

/** Tirage des intentions : une charge et une garde pour deux attaques. */
export const INTENT_POOL: readonly BossIntent[] = ['strike', 'strike', 'charge', 'guard'];

/** Multiplicateur de dégâts du boss selon son intention. */
export const INTENT_DAMAGE: Record<BossIntent, number> = {
  strike: 1,
  charge: 3,
  guard: 0.3
};

/**
 * Réglages du combat, calés par simulation (8 000 combats par configuration).
 *
 * Le but était qu'aucune ligne de conduite unique ne suffise. Résultat sur le
 * dernier boss, au débit conseillé : marteler MOG gagne 70 % des combats,
 * jouer les intentions 79 %, et temporiser sans frapper 0 %. Chacune des trois
 * valeurs ci-dessous tient ce résultat en équilibre — les modifier isolément
 * le casse.
 */
export const COMBAT = {
  /** Dégâts d'un MOG réussi, en secondes de la production du joueur. */
  mogPower: 22,
  /** Part de la vie manquante rendue par un LOOKSMAX. Décroissant par nature :
   *  puissant quand on est bas, dérisoire quand on est au complet, donc
   *  impossible d'en faire une rente. */
  healShare: 0.3,
  /** Ce qui passe encore à travers une garde NPC. Elle couvre aussi le tour
   *  suivant, ce qui permet d'anticiper une charge. */
  guardCut: 0.3,
  /** Les dégâts du boss enflent de 3 % par tour. Sans cette montée, se
   *  retrancher derrière garde et soin rendait le joueur immortel. */
  enragePerTurn: 0.03,
  /** Tours de recharge d'un enseignement après usage. */
  cooldown: 2
};

/**
 * **La difficulté est quantifiée.** Un MOG réussi retire exactement
 * `COMBAT.mogPower` secondes de vie, soit 22 : un boss à 88 secondes tombe en
 * quatre coups, un boss à 89 en cinq. Deux boss séparés d'une demi-seconde de
 * vie peuvent donc afficher dix points d'écart en taux de victoire, et trois
 * boss d'affilée entre 88,5 et 90 se ressemblaient tous. Ce qui distingue
 * réellement les derniers n'est pas leur vie mais leurs **dégâts**, qui eux
 * varient continûment — et surtout leur débit conseillé, seize fois plus élevé
 * du premier des quatre au dernier.
 */

/** Part de la récompense rendue quand on refait un boss déjà battu. */
export const FARM_REWARD_SHARE = 0.2;

/** Faces du dé lancé par les deux camps à chaque tour. */
export const DIE_FACES = 20;
