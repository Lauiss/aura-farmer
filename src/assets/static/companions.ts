/**
 * Compagnons : des objets posés autour de la statue, qui ajoutent chacun un
 * pourcentage à la production passive.
 *
 * Le bonus est un **pourcentage** et non un montant fixe : une valeur absolue
 * calée sur le milieu de partie serait dérisoire à la fin et écrasante au
 * début. Braulo, le chat, ferme la marche et donne le plus.
 */

export type CompanionId =
  | 'vermouth'
  | 'butterfly'
  | 'moto'
  | 'cigarettes'
  | 'racecar'
  | 'skibidi'
  | 'braulo'
  | 'ivank'
  | 'makouille';

export interface CompanionDefinition {
  id: CompanionId;
  /** Prix en aura. */
  price: number;
  /** Ce qu'il ajoute à la production, en proportion. */
  bonus: number;
  color: number;
  accent: number;
}

export const COMPANIONS: readonly CompanionDefinition[] = [
  { id: 'vermouth', price: 3e6, bonus: 0.08, color: 0xa9764a, accent: 0x4a3524 },
  { id: 'butterfly', price: 4e7, bonus: 0.12, color: 0xb8bcc2, accent: 0x2f333a },
  { id: 'moto', price: 6e8, bonus: 0.18, color: 0x2f3a4a, accent: 0xc4352f },
  { id: 'cigarettes', price: 9e9, bonus: 0.25, color: 0xe8e2d4, accent: 0xc4352f },
  { id: 'racecar', price: 2e11, bonus: 0.4, color: 0xc4352f, accent: 0x1c1f24 },
  { id: 'skibidi', price: 5e12, bonus: 0.6, color: 0xeef1f4, accent: 0xd8b48a },
  { id: 'ivank', price: 2e14, bonus: 1, color: 0x5a6350, accent: 0x33382d },
  // Braulo passe après Ivank : Makouille, sa femelle, le suit directement.
  { id: 'braulo', price: 4e15, bonus: 1.5, color: 0x7a736b, accent: 0x7ed957 },
  // Makouille ferme la marche : la femelle de Braulo, et le meilleur bonus.
  { id: 'makouille', price: 8e16, bonus: 2.5, color: 0xc4a88a, accent: 0xffb3c8 }
];

/**
 * Dernière amélioration de la branche : un téléphone pour chaque compagnon.
 * Chaque compagnon possédé ajoute `COMPANION_PHONE_PAYOUT` au gain du
 * doomscrolling — ils scrollent avec toi.
 */
export const COMPANION_PHONES_PRICE = 2e17;
export const COMPANION_PHONE_PAYOUT = 0.15;

export function companionDefinition(id: CompanionId): CompanionDefinition {
  return COMPANIONS.find(companion => companion.id === id)!;
}
