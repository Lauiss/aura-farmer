/**
 * Consommables vendus par le moyai marchand : des canettes qui dopent la
 * production et le clic pendant un temps donné.
 *
 * Ils s'achètent en **gemmes** et non en aura : c'est ce qui donne aux gemmes
 * un usage régulier à côté des coffres, dont le rendement est aléatoire.
 */

export type ConsumableId = 'espresso' | 'monster' | 'redline' | 'nitro' | 'ascend' | 'singularity';

export interface ConsumableDefinition {
  id: ConsumableId;
  /** Prix en gemmes. */
  price: number;
  /** Facteur appliqué à la production et au clic tant qu'il est actif. */
  multiplier: number;
  /** Durée d'effet, en secondes. */
  duration: number;
  /** Teintes de la canette. */
  color: number;
  accent: number;
  /** Aura à dépenser dans l'arbre pour que la canette apparaisse en rayon. */
  unlockPrice: number;
}

export const CONSUMABLES: readonly ConsumableDefinition[] = [
  { id: 'espresso', price: 5, multiplier: 1.5, duration: 120, color: 0x6b4a32, accent: 0xd8c9a8, unlockPrice: 50000 },
  { id: 'monster', price: 15, multiplier: 2, duration: 300, color: 0x1f2420, accent: 0x7ed957, unlockPrice: 2e6 },
  { id: 'redline', price: 40, multiplier: 3, duration: 600, color: 0xc4352f, accent: 0xf0e4d0, unlockPrice: 8e7 },
  { id: 'nitro', price: 120, multiplier: 5, duration: 900, color: 0x2b3a6b, accent: 0x5fd4ff, unlockPrice: 3e9 },
  { id: 'ascend', price: 350, multiplier: 10, duration: 900, color: 0x4a2b6b, accent: 0xb98bff, unlockPrice: 1e11 },
  { id: 'singularity', price: 900, multiplier: 20, duration: 900, color: 0x1a1520, accent: 0xe8b84b, unlockPrice: 4e12 }
];

export function consumableDefinition(id: ConsumableId): ConsumableDefinition {
  return CONSUMABLES.find(consumable => consumable.id === id)!;
}
