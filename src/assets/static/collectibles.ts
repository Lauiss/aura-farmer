import type { MoyaiPalette } from '../../app/three/models/moyai';

/**
 * Collection du gacha : des statuettes de moyai taillées dans d'autres
 * matières. Chacune ne s'obtient qu'une fois, accorde un bonus de production
 * permanent et peut habiller la statue du jeu.
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];

/** Couleur d'une rareté, partagée par la modale d'ouverture et la collection. */
export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#c9c2b0',
  rare: '#5fb4ff',
  epic: '#b07bff',
  legendary: '#ffb830'
};

/** Bonus de production accordé par une statuette, selon sa rareté. */
export const RARITY_BONUS: Record<Rarity, number> = {
  common: 0.02,
  rare: 0.05,
  epic: 0.1,
  legendary: 0.25
};

export interface CollectibleDefinition {
  id: string;
  rarity: Rarity;
  palette: MoyaiPalette;
}

export const COLLECTIBLES: readonly CollectibleDefinition[] = [
  { id: 'granite', rarity: 'common', palette: { stone: 0x8d8a86, stoneDark: 0x6b6966, cavity: 0x262524 } },
  { id: 'sandstone', rarity: 'common', palette: { stone: 0xc9a878, stoneDark: 0xa3845a, cavity: 0x3a2c1c } },
  { id: 'basalt', rarity: 'common', palette: { stone: 0x4f4f54, stoneDark: 0x3a3a3f, cavity: 0x121214 } },
  { id: 'mossy', rarity: 'common', palette: { stone: 0x7d9166, stoneDark: 0x5e7050, cavity: 0x1f2a18 } },
  { id: 'terracotta', rarity: 'common', palette: { stone: 0xb86a4a, stoneDark: 0x8f4e35, cavity: 0x2f1810 } },
  { id: 'chalk', rarity: 'common', palette: { stone: 0xe4e0d6, stoneDark: 0xc4bfb2, cavity: 0x4a4740 } },

  { id: 'jade', rarity: 'rare', palette: { stone: 0x5fae8a, stoneDark: 0x3f8a68, cavity: 0x113322 } },
  { id: 'ice', rarity: 'rare', palette: { stone: 0xa9d8ee, stoneDark: 0x7fb7d4, cavity: 0x1c3c52 } },
  { id: 'rosequartz', rarity: 'rare', palette: { stone: 0xe8a9b8, stoneDark: 0xc98597, cavity: 0x4a2530 } },
  { id: 'copper', rarity: 'rare', palette: { stone: 0xc07a3a, stoneDark: 0x8c5626, cavity: 0x2d1a0b, sheen: 0x1a0c02 } },
  { id: 'obsidian', rarity: 'rare', palette: { stone: 0x2e2838, stoneDark: 0x1f1a27, cavity: 0x6b4fb0, glow: 0x2a1850 } },

  { id: 'amethyst', rarity: 'epic', palette: { stone: 0x9b6bd6, stoneDark: 0x7447b0, cavity: 0x2a1245, sheen: 0x1c0a33 } },
  { id: 'lava', rarity: 'epic', palette: { stone: 0x3a2424, stoneDark: 0x2a1818, cavity: 0xff5a1f, glow: 0xff3a00 } },
  { id: 'neon', rarity: 'epic', palette: { stone: 0x2b2d42, stoneDark: 0x1f2033, cavity: 0x39ffd6, glow: 0x14c9a4 } },

  { id: 'golden', rarity: 'legendary', palette: { stone: 0xe8b84b, stoneDark: 0xc2912d, cavity: 0x5a3a0a, sheen: 0x3a2500 } },
  { id: 'diamond', rarity: 'legendary', palette: { stone: 0xd8f4ff, stoneDark: 0xa7dcf2, cavity: 0x5fd4ff, glow: 0x2a8fc0, sheen: 0x183848 } }
];

export function collectibleDefinition(id: string): CollectibleDefinition | undefined {
  return COLLECTIBLES.find(collectible => collectible.id === id);
}

// --- Coffres -------------------------------------------------------------

/**
 * Tiers de coffres. Celui du doomscrolling tombe gratuitement ; les trois
 * autres s'achètent en gemmes, avec des chances de plus en plus belles.
 */
export type ChestTier = 'doomscroll' | 'basic' | 'premium' | 'mythic';

export interface ChestDefinition {
  tier: ChestTier;
  /** Prix en gemmes, `null` pour un coffre qui ne s'achète pas. */
  price: number | null;
  odds: Record<Rarity, number>;
}

export const CHESTS: readonly ChestDefinition[] = [
  { tier: 'doomscroll', price: null, odds: { common: 0.7, rare: 0.22, epic: 0.07, legendary: 0.01 } },
  { tier: 'basic', price: 10, odds: { common: 0.7, rare: 0.22, epic: 0.07, legendary: 0.01 } },
  { tier: 'premium', price: 40, odds: { common: 0.3, rare: 0.45, epic: 0.2, legendary: 0.05 } },
  { tier: 'mythic', price: 120, odds: { common: 0, rare: 0.35, epic: 0.45, legendary: 0.2 } }
];

export function chestDefinition(tier: ChestTier): ChestDefinition {
  return CHESTS.find(chest => chest.tier === tier)!;
}

/** Gemmes toujours rendues par un coffre, selon la rareté tirée. */
export const RARITY_GEMS: Record<Rarity, number> = { common: 2, rare: 5, epic: 12, legendary: 30 };

/**
 * Chance qu'une rareté donne une statuette plutôt que de l'aura, tant qu'il en
 * reste à obtenir. Une fois une rareté complétée, elle ne rend plus que de
 * l'aura et des gemmes : jamais de doublon.
 */
export const RARITY_COLLECTIBLE_CHANCE: Record<Rarity, number> = {
  common: 0.45,
  rare: 0.6,
  epic: 0.75,
  legendary: 1
};

/** Aura rendue à la place d'une statuette, en secondes de production. */
export const RARITY_AURA_SECONDS: Record<Rarity, number> = {
  common: 60,
  rare: 180,
  epic: 600,
  legendary: 1800
};
