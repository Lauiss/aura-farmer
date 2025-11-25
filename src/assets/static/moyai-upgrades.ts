import { signal } from "@angular/core";
import { MoyaiUpgrades } from "../../app/components/aura-btn/aura-btn";
import { UpgradeType } from "../../app/services/shop-manager";

export const moyaiUpgrades: MoyaiUpgrades[] = [
    {
        id: 0,
        name: 'earings',
        description: '+5% global aura production and offline aura gain !',
        unlocked: false,
        price: 500,
        effect: { type: UpgradeType.MULTIPLIER, value: 0.05 },
        displayCondition: signal(true),
    },
        {
        id: 1,
        name: 'sunglasses',
        description: 'x1000 aura per click',
        unlocked: false,
        effect : { type: UpgradeType.CLICK, value: 1000 },
        price: 150000,
        displayCondition: signal(true),
    },
        {
        id: 2,
        name: 'tatoos',
        description: '+10% aura production for Jawline Check, Rizz and Biceps Flexing',
        unlocked: false,
        price: 5000,
        effect: { type: UpgradeType.ITEM_BOOST, targetItemId: [0,1,2] , value: 0.10 },
        displayCondition: signal(true),
    },
        {
        id: 3,
        name: 'tuxedo',
        description: 'Reduce prices for all upgrades by 5%',
        unlocked: false,
        effect: { type: UpgradeType.PRICE_REDUCTION, value: -0.05 },
        price: 20000,
        displayCondition: signal(true),
    },
        {
        id: 4,
        name: 'tie',
        description: '+20% Aura per click',
        unlocked: false,
        effect: { type: UpgradeType.CLICK, value: 0.20 },
        price: 75000,
        displayCondition: signal(true),
    },
        {
        id: 5,
        name: 'crown',
        description: 'Global aura +15%',
        unlocked: false,
        price: 250000,
        effect: { type: UpgradeType.MULTIPLIER, value: 0.15 },
        displayCondition: signal(true),
    },
];
