/**
 * Quêtes : ce qui donne au jeu une direction.
 *
 * Un incrémental sans objectif affiché se joue en regardant les nombres monter
 * jusqu'à ce qu'on s'arrête. Deux réponses ici, complémentaires :
 *
 * - **L'histoire** (`STORY`), une file de chapitres joués dans l'ordre, un seul
 *   ouvert à la fois. C'est elle qui raconte la déchéance du moyai et sa
 *   remontée jusqu'à son frère, et qui dit en permanence « voilà la prochaine
 *   étape ». Chaque chapitre vise une grandeur qui monte de toute façon : on ne
 *   demande jamais de détour, on nomme le chemin.
 * - **Les quotidiennes** (`DAILY_POOL`), trois tirées par jour, mesurées en
 *   **écart depuis le début de la journée** et non en total : sinon elles
 *   seraient déjà remplies le jour où on les découvre.
 */

/**
 * Ce qu'une quête mesure. Toutes ces grandeurs sont **croissantes**, ce qui est
 * indispensable pour les quotidiennes : leur avancement est la différence avec
 * un relevé pris au réveil, et une grandeur qui redescend rendrait cet écart
 * négatif.
 *
 * `production` fait exception — elle peut baisser — et n'est donc utilisée que
 * par l'histoire, où l'on compare à un seuil absolu.
 */
export type QuestGoal =
  | 'aura'
  | 'clicks'
  | 'production'
  | 'bosses'
  | 'figures'
  | 'relics'
  | 'gems'
  | 'companions'
  | 'combo'
  | 'calls'
  | 'chests';

export interface QuestDefinition {
  id: string;
  goal: QuestGoal;
  /** Seuil à atteindre. Pour une quotidienne, l'écart à réaliser dans la journée. */
  target: number;
  /** Gemmes rendues à l'accomplissement. */
  gems: number;
}

/**
 * Les chapitres, dans l'ordre. Leurs seuils suivent la progression naturelle
 * d'une partie : chacun tombe peu après qu'on a déverrouillé ce dont il parle,
 * de sorte que l'histoire avance en jouant normalement.
 */
export const STORY: readonly QuestDefinition[] = [
  { id: 'exile', goal: 'aura', target: 1_000, gems: 5 },
  { id: 'jawline', goal: 'clicks', target: 400, gems: 8 },
  { id: 'pigeon', goal: 'aura', target: 100_000, gems: 12 },
  { id: 'battles', goal: 'production', target: 500, gems: 15 },
  { id: 'first-blood', goal: 'bosses', target: 1, gems: 20 },
  { id: 'gems', goal: 'gems', target: 120, gems: 25 },
  { id: 'showcase', goal: 'figures', target: 6, gems: 30 },
  { id: 'rumour', goal: 'bosses', target: 5, gems: 40 },
  { id: 'company', goal: 'companions', target: 3, gems: 50 },
  { id: 'trophies', goal: 'relics', target: 10, gems: 65 },
  { id: 'namek', goal: 'bosses', target: 13, gems: 80 },
  { id: 'six-seven', goal: 'combo', target: 6.7, gems: 100 },
  { id: 'threshold', goal: 'production', target: 1.6e14, gems: 150 },
  { id: 'succession', goal: 'bosses', target: 20, gems: 300 }
];

/**
 * Le vivier des quotidiennes. Leurs cibles sont volontairement modestes : elles
 * doivent se remplir en jouant une session, pas en organisant sa journée autour
 * du jeu.
 *
 * `aura` n'y figure pas avec une cible fixe : un montant d'aura qui a du sens à
 * la première heure est dérisoire à la dixième. Sa cible est recalculée au
 * tirage, en secondes de production (voir `QuestManager`).
 */
export const DAILY_POOL: readonly QuestDefinition[] = [
  { id: 'daily-clicks', goal: 'clicks', target: 400, gems: 6 },
  { id: 'daily-aura', goal: 'aura', target: 900, gems: 8 },
  { id: 'daily-bosses', goal: 'bosses', target: 2, gems: 10 },
  { id: 'daily-chests', goal: 'chests', target: 3, gems: 8 },
  { id: 'daily-gems', goal: 'gems', target: 25, gems: 6 },
  { id: 'daily-calls', goal: 'calls', target: 1, gems: 10 },
  { id: 'daily-figures', goal: 'figures', target: 2, gems: 8 }
];

/** Quotidiennes proposées en même temps. */
export const DAILY_COUNT = 3;

/**
 * Secondes de production visées par la quotidienne d'aura. Une cible absolue
 * n'a aucun sens sur une grandeur qui gagne dix ordres de grandeur au fil de la
 * partie.
 */
export const DAILY_AURA_SECONDS = 900;

export function storyQuest(id: string): QuestDefinition | undefined {
  return STORY.find(quest => quest.id === id);
}

export function dailyQuest(id: string): QuestDefinition | undefined {
  return DAILY_POOL.find(quest => quest.id === id);
}
