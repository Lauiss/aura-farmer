import type { BossId } from './bosses';
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
/**
 * Bonus de production d'une statuette, selon sa rareté.
 *
 * Il a été **divisé par deux** quand la collection est passée de seize à
 * soixante-cinq pièces : à l'ancien barème, la collection complète serait
 * passée de ×2,2 à ×4,9 de production sans que rien d'autre ne change. Au
 * barème actuel elle vaut ×2,95 — une vraie récompense pour quatre fois plus
 * de coffres, mais pas un doublement de l'économie de fin de partie.
 */
export const RARITY_BONUS: Record<Rarity, number> = {
  common: 0.01,
  rare: 0.025,
  epic: 0.05,
  legendary: 0.13
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
  { id: 'slate', rarity: 'common', palette: { stone: 0x6f757c, stoneDark: 0x525860, cavity: 0x1c1f22 } },
  { id: 'limestone', rarity: 'common', palette: { stone: 0xd6cdb8, stoneDark: 0xb3a98f, cavity: 0x3f3a2c } },
  { id: 'clay', rarity: 'common', palette: { stone: 0xa9714f, stoneDark: 0x83543a, cavity: 0x2c1a11 } },
  { id: 'concrete', rarity: 'common', palette: { stone: 0x9a9a95, stoneDark: 0x787873, cavity: 0x2a2a28 } },
  { id: 'brick', rarity: 'common', palette: { stone: 0x9c4b3a, stoneDark: 0x763628, cavity: 0x2a120c } },
  { id: 'gravel', rarity: 'common', palette: { stone: 0x87817a, stoneDark: 0x635e58, cavity: 0x23211e } },
  { id: 'pumice', rarity: 'common', palette: { stone: 0xc2bcae, stoneDark: 0x9d978a, cavity: 0x3a3830 } },
  { id: 'flint', rarity: 'common', palette: { stone: 0x5a5f66, stoneDark: 0x3f434a, cavity: 0x16181b } },
  { id: 'coal', rarity: 'common', palette: { stone: 0x3a3a3c, stoneDark: 0x262628, cavity: 0x0e0e10 } },
  { id: 'adobe', rarity: 'common', palette: { stone: 0xc99a6a, stoneDark: 0xa3794d, cavity: 0x3a2716 } },
  { id: 'driftwood', rarity: 'common', palette: { stone: 0xa89880, stoneDark: 0x847661, cavity: 0x2e281f } },
  { id: 'bamboo', rarity: 'common', palette: { stone: 0xc8c073, stoneDark: 0xa39c56, cavity: 0x38351a } },
  { id: 'cork', rarity: 'common', palette: { stone: 0xbf9a6d, stoneDark: 0x9a7a52, cavity: 0x362719 } },
  { id: 'rust', rarity: 'common', palette: { stone: 0x9c5c34, stoneDark: 0x7a4525, cavity: 0x2c160a } },
  { id: 'tin', rarity: 'common', palette: { stone: 0xb4bcc4, stoneDark: 0x8f979f, cavity: 0x33383d } },
  { id: 'plaster', rarity: 'common', palette: { stone: 0xeae4d8, stoneDark: 0xc6c0b3, cavity: 0x47443c } },
  { id: 'peat', rarity: 'common', palette: { stone: 0x5c4a38, stoneDark: 0x423528, cavity: 0x18120c } },
  { id: 'dune', rarity: 'common', palette: { stone: 0xd9c08c, stoneDark: 0xb39b6a, cavity: 0x3f3421 } },
  { id: 'ash', rarity: 'common', palette: { stone: 0xa5a29c, stoneDark: 0x817f7a, cavity: 0x2d2c29 } },
  { id: 'soot', rarity: 'common', palette: { stone: 0x2f2d2b, stoneDark: 0x1f1e1c, cavity: 0x0b0b0a } },
  { id: 'lichen', rarity: 'common', palette: { stone: 0x9aa87a, stoneDark: 0x76845b, cavity: 0x282e1c } },
  { id: 'shale', rarity: 'common', palette: { stone: 0x6a6f73, stoneDark: 0x4c5054, cavity: 0x1b1d1f } },
  { id: 'siltstone', rarity: 'common', palette: { stone: 0xb0a48c, stoneDark: 0x8a7f6b, cavity: 0x322d24 } },
  { id: 'bone', rarity: 'common', palette: { stone: 0xe6ded0, stoneDark: 0xc0b8a8, cavity: 0x453f35 } },

  { id: 'jade', rarity: 'rare', palette: { stone: 0x5fae8a, stoneDark: 0x3f8a68, cavity: 0x113322 } },
  { id: 'ice', rarity: 'rare', palette: { stone: 0xa9d8ee, stoneDark: 0x7fb7d4, cavity: 0x1c3c52 } },
  { id: 'rosequartz', rarity: 'rare', palette: { stone: 0xe8a9b8, stoneDark: 0xc98597, cavity: 0x4a2530 } },
  { id: 'copper', rarity: 'rare', palette: { stone: 0xc07a3a, stoneDark: 0x8c5626, cavity: 0x2d1a0b, sheen: 0x1a0c02 } },
  { id: 'obsidian', rarity: 'rare', palette: { stone: 0x2e2838, stoneDark: 0x1f1a27, cavity: 0x6b4fb0, glow: 0x2a1850 } },
  { id: 'amber', rarity: 'rare', palette: { stone: 0xd99a3a, stoneDark: 0xad7622, cavity: 0x3f2a08, sheen: 0x2a1a00 } },
  { id: 'malachite', rarity: 'rare', palette: { stone: 0x3f9e7a, stoneDark: 0x2c7458, cavity: 0x0f2d21 } },
  { id: 'lapis', rarity: 'rare', palette: { stone: 0x2f5fae, stoneDark: 0x214585, cavity: 0x0c1a35, sheen: 0x06102a } },
  { id: 'onyx', rarity: 'rare', palette: { stone: 0x2a2a2e, stoneDark: 0x1b1b1f, cavity: 0x0a0a0c, sheen: 0x000000 } },
  { id: 'turquoise', rarity: 'rare', palette: { stone: 0x4fc0bf, stoneDark: 0x3a9695, cavity: 0x123534 } },
  { id: 'coral', rarity: 'rare', palette: { stone: 0xe0705f, stoneDark: 0xb85244, cavity: 0x40180f } },
  { id: 'pearl', rarity: 'rare', palette: { stone: 0xf0ece0, stoneDark: 0xcfc9b9, cavity: 0x4a4638, sheen: 0x2a2820 } },
  { id: 'marble', rarity: 'rare', palette: { stone: 0xe8e6e2, stoneDark: 0xc2c0bb, cavity: 0x45443f } },
  { id: 'bronze', rarity: 'rare', palette: { stone: 0xa9793f, stoneDark: 0x7f5a2c, cavity: 0x2c1c0a, sheen: 0x1a1000 } },
  { id: 'silver', rarity: 'rare', palette: { stone: 0xc9ced6, stoneDark: 0xa0a5ad, cavity: 0x393c42, sheen: 0x20232a } },
  { id: 'quartz', rarity: 'rare', palette: { stone: 0xdcd6ea, stoneDark: 0xb6b0c6, cavity: 0x413c52 } },
  { id: 'agate', rarity: 'rare', palette: { stone: 0xb07a5a, stoneDark: 0x8a5c42, cavity: 0x321e14 } },
  { id: 'jasper', rarity: 'rare', palette: { stone: 0xa03a3a, stoneDark: 0x7c2a2a, cavity: 0x2c0d0d } },
  { id: 'serpentine', rarity: 'rare', palette: { stone: 0x6f9a52, stoneDark: 0x527539, cavity: 0x1d2a14 } },
  { id: 'opal', rarity: 'rare', palette: { stone: 0xcfe4e0, stoneDark: 0xa8bdb9, cavity: 0x3c4a48, glow: 0x5fb4a8 } },

  { id: 'amethyst', rarity: 'epic', palette: { stone: 0x9b6bd6, stoneDark: 0x7447b0, cavity: 0x2a1245, sheen: 0x1c0a33 } },
  { id: 'lava', rarity: 'epic', palette: { stone: 0x3a2424, stoneDark: 0x2a1818, cavity: 0xff5a1f, glow: 0xff3a00 } },
  { id: 'neon', rarity: 'epic', palette: { stone: 0x2b2d42, stoneDark: 0x1f2033, cavity: 0x39ffd6, glow: 0x14c9a4 } },
  { id: 'emerald', rarity: 'epic', palette: { stone: 0x36c27a, stoneDark: 0x239157, cavity: 0x0c3a22, glow: 0x1aa060 } },
  { id: 'ruby', rarity: 'epic', palette: { stone: 0xd63a52, stoneDark: 0xa5253a, cavity: 0x3c0a14, glow: 0xb01030 } },
  { id: 'sapphire', rarity: 'epic', palette: { stone: 0x3a6fd6, stoneDark: 0x2750a5, cavity: 0x0c1a3c, glow: 0x1040b0 } },
  { id: 'aurora', rarity: 'epic', palette: { stone: 0x2b3a4a, stoneDark: 0x1f2a36, cavity: 0x4fe0b0, glow: 0x2ac088 } },
  { id: 'void', rarity: 'epic', palette: { stone: 0x1a1626, stoneDark: 0x110e1a, cavity: 0x8a5fff, glow: 0x4a1fd0 } },
  { id: 'glacier', rarity: 'epic', palette: { stone: 0xbfe8ff, stoneDark: 0x93bdd6, cavity: 0x2a5a76, glow: 0x4aa8d0 } },
  { id: 'circuit', rarity: 'epic', palette: { stone: 0x22322a, stoneDark: 0x16221c, cavity: 0x7cff9a, glow: 0x30d060 } },

  { id: 'golden', rarity: 'legendary', palette: { stone: 0xe8b84b, stoneDark: 0xc2912d, cavity: 0x5a3a0a, sheen: 0x3a2500 } },
  { id: 'diamond', rarity: 'legendary', palette: { stone: 0xd8f4ff, stoneDark: 0xa7dcf2, cavity: 0x5fd4ff, glow: 0x2a8fc0, sheen: 0x183848 } },
  { id: 'rainbow', rarity: 'legendary', palette: { stone: 0xe8b84b, stoneDark: 0x9b6bd6, cavity: 0x39ffd6, glow: 0xff5a9a } },
  { id: 'eclipse', rarity: 'legendary', palette: { stone: 0x141218, stoneDark: 0x0a090c, cavity: 0xffca4a, glow: 0xff8a1f } },
  { id: 'singularity', rarity: 'legendary', palette: { stone: 0x0e0e12, stoneDark: 0x060608, cavity: 0xbf7bff, glow: 0x6a1fd0 } },
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

// --- Reliques --------------------------------------------------------------

/**
 * Les reliques sont les **trophées des boss** : la basket de Tralalero, la
 * batte de Tung Tung Tung Sahur… Chaque boss rend la sienne à sa première
 * défaite.
 *
 * Elles tombaient auparavant des coffres, à moins d'une chance sur cent : il
 * fallait des centaines de coffres pour les réunir. Liées aux battles, elles
 * suivent la progression au lieu du hasard. Leur bonus reste **multiplicatif**
 * mais plus modeste : réunies, elles font ×22, là où les dix d'avant faisaient
 * ×134. Ce total est **tenu** : passer de quatorze à dix-sept reliques a fait
 * redescendre toute l'échelle des bonus, sinon trois trophées de plus
 * gonflaient la production de moitié sans que rien d'autre ne change.
 */
export type RelicShape =
  | 'sneaker'
  | 'bat'
  | 'feather'
  | 'claw'
  | 'hat'
  | 'sandal'
  | 'tyre'
  | 'ice'
  | 'bomb'
  | 'bell'
  | 'grenade'
  | 'magnifier'
  | 'turban'
  | 'banana'
  | 'katana'
  | 'slipper'
  | 'melon'
  | 'coconut'
  | 'banana-peel'
  | 'crown';

export interface RelicDefinition {
  id: RelicShape;
  /** Boss qui la rend à sa première défaite. */
  boss: BossId;
  /** Facteur appliqué à la production, multiplié à celui des autres reliques. */
  bonus: number;
  /** Teinte de l'objet, et celle de son halo. */
  color: number;
  glow: number;
}

export const RELICS: readonly RelicDefinition[] = [
  { id: 'sneaker', boss: 'tralalero', bonus: 1.07, color: 0x2f6fd0, glow: 0x1f4f94 },
  { id: 'bat', boss: 'sahur', bonus: 1.08, color: 0xc9a26b, glow: 0x7a5a38 },
  { id: 'feather', boss: 'piccione', bonus: 1.089, color: 0x9aa7b8, glow: 0x4a5566 },
  { id: 'claw', boss: 'trippi', bonus: 1.099, color: 0xe2703a, glow: 0x8a3a18 },
  { id: 'hat', boss: 'patapim', bonus: 1.109, color: 0xe8b84b, glow: 0x8a6412 },
  { id: 'sandal', boss: 'lirili', bonus: 1.119, color: 0xa9793f, glow: 0x5c4326 },
  { id: 'tyre', boss: 'boneca', bonus: 1.128, color: 0x2a2c31, glow: 0x6f9a4a },
  { id: 'ice', boss: 'frigo', bonus: 1.138, color: 0xbfe8ff, glow: 0x3f8fb8 },
  { id: 'bomb', boss: 'bombardiro', bonus: 1.148, color: 0x3a3f46, glow: 0xc4352f },
  { id: 'bell', boss: 'vacca', bonus: 1.158, color: 0xd9b45a, glow: 0x8a6412 },
  { id: 'grenade', boss: 'gusini', bonus: 1.167, color: 0x4b5a3c, glow: 0x2a3321 },
  { id: 'magnifier', boss: 'spioniro', bonus: 1.177, color: 0xb59a6d, glow: 0x6b7686 },
  { id: 'turban', boss: 'piccolo', bonus: 1.187, color: 0xeeeae0, glow: 0x7fb069 },
  { id: 'banana', boss: 'chimpanzini', bonus: 1.196, color: 0xe8c547, glow: 0x8a6412 },
  { id: 'katana', boss: 'cappuccino', bonus: 1.206, color: 0xc9ced6, glow: 0x1c1c1f },
  { id: 'slipper', boss: 'ballerina', bonus: 1.216, color: 0xf2a7c3, glow: 0xa84a74 },
  { id: 'melon', boss: 'glorbo', bonus: 1.226, color: 0x3f7a3a, glow: 0xd9453f },
  { id: 'coconut', boss: 'burbaloni', bonus: 1.235, color: 0x7a5a38, glow: 0xf2efe6 },
  { id: 'banana-peel', boss: 'bananita', bonus: 1.245, color: 0xe8c547, glow: 0x8fa3b8 },
  { id: 'crown', boss: 'chad', bonus: 1.42, color: 0xe8b84b, glow: 0xb08a2c }
];

/** Relique rendue par un boss. */
export function relicForBoss(boss: BossId): RelicDefinition | undefined {
  return RELICS.find(relic => relic.boss === boss);
}

export function relicDefinition(id: string): RelicDefinition | undefined {
  return RELICS.find(relic => relic.id === id);
}

