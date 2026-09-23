import { signal } from "@angular/core";
import { MoyaiUpgrades } from "../../app/components/aura-btn/aura-btn";
import { UpgradeType } from "../../app/services/shop-manager";
import { outfitUpgrades } from "./outfit-upgrades";
import { sortByPrice } from "./order";

export const moyaiUpgrades: MoyaiUpgrades[] = [
    {
        id: 0,
        name: 'earings',
        description: '+5% global aura production and offline aura gain !',
        unlocked: false,
        price: 2000,
        effect: { type: UpgradeType.MULTIPLIER, value: 0.05 },
        displayCondition: signal(true),
        upgrades: [],
    },
        {
        id: 1,
        name: 'sunglasses',
        description: 'x2 aura per click',
        unlocked: false,
        effect : { type: UpgradeType.CLICK, value: 1 },
        price: 30000000,
        displayCondition: signal(true),
        upgrades: [],
    },
        {
        id: 2,
        name: 'tatoos',
        description: '+10% aura production for Jawline Check, Rizz and Biceps Flexing',
        unlocked: false,
        price: 25000,
        effect: { type: UpgradeType.ITEM_BOOST, targetItemId: [1,2,3] , value: 0.10 },
        displayCondition: signal(true),
        upgrades: [],
    },
        {
        id: 3,
        name: 'tuxedo',
        description: 'Reduce prices for all upgrades by 5%',
        unlocked: false,
        effect: { type: UpgradeType.PRICE_REDUCTION, value: -0.05 },
        price: 300000,
        displayCondition: signal(true),
        upgrades: [],
    },
        {
        id: 4,
        name: 'tie',
        description: '+20% Aura per click',
        unlocked: false,
        effect: { type: UpgradeType.CLICK, value: 0.20 },
        price: 3000000,
        displayCondition: signal(true),
        upgrades: [],
    },
        {
        id: 5,
        name: 'crown',
        description: 'Global aura +15%',
        unlocked: false,
        price: 500000000,
        effect: { type: UpgradeType.MULTIPLIER, value: 0.15 },
        displayCondition: signal(true),
        upgrades: [],
    },
        {
        id: 6,
        name: 'cape',
        description: 'Global aura +25%',
        unlocked: false,
        price: 10000000000,
        effect: { type: UpgradeType.MULTIPLIER, value: 0.25 },
        displayCondition: signal(true),
        upgrades: [],
    },
];

// Rattachement par nom : les améliorations vivent dans leur propre fichier,
// et la liste des pièces reste lisible.
for (const upgrade of moyaiUpgrades) {
    upgrade.upgrades = sortByPrice(outfitUpgrades[upgrade.name] ?? []);
}

// Les pièces étaient écrites dans l'ordre où elles ont été imaginées, pas dans
// celui où on peut se les offrir : la branche Outfit sautait de 2 000 à
// 30 millions pour revenir à 25 000.
sortByPrice(moyaiUpgrades);
