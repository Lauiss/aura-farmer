/**
 * Consommables vendus par le moyai marchand : des canettes qui dopent la
 * production et le clic pendant un temps donné.
 *
 * Ils s'achètent en **gemmes** et non en aura : c'est ce qui donne aux gemmes
 * un usage régulier à côté des coffres, dont le rendement est aléatoire.
 */

export type ConsumableId = 'espresso' | 'monster' | 'redline' | 'nitro';

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
}

export const CONSUMABLES: readonly ConsumableDefinition[] = [
  { id: 'espresso', price: 5, multiplier: 1.5, duration: 120, color: 0x6b4a32, accent: 0xd8c9a8 },
  { id: 'monster', price: 15, multiplier: 2, duration: 300, color: 0x1f2420, accent: 0x7ed957 },
  { id: 'redline', price: 40, multiplier: 3, duration: 600, color: 0xc4352f, accent: 0xf0e4d0 },
  { id: 'nitro', price: 120, multiplier: 5, duration: 900, color: 0x2b3a6b, accent: 0x5fd4ff }
];

export function consumableDefinition(id: ConsumableId): ConsumableDefinition {
  return CONSUMABLES.find(consumable => consumable.id === id)!;
}
