import { signal } from "@angular/core";
import { MoyaiUpgrades } from "../../app/components/aura-btn/aura-btn";

export const moyaiUpgrades: MoyaiUpgrades[] = [
    {
        id: 0,
        name: 'earings',
        description: 'Unlock earings for your moyai to increase aura gain by 1%',
        unlocked: false,
        price: 1,
        displayCondition: signal(true),
    },
        {
        id: 1,
        name: 'sunglasses',
        description: 'Unlock sunglasses for your moyai to increase aura gain by 1%',
        unlocked: false,
        price: 1,
        displayCondition: signal(true),
    },
        {
        id: 2,
        name: 'tatoos',
        description: 'Unlock tatoos for your moyai to increase aura gain by 1%',
        unlocked: false,
        price: 1,
        displayCondition: signal(true),
    },
        {
        id: 3,
        name: 'tuxedo',
        description: 'Unlock earings for your moyai to increase aura gain by 1%',
        unlocked: false,
        price: 1,
        displayCondition: signal(true),
    },
        {
        id: 4,
        name: 'tie',
        description: 'Unlock tie for your moyai to increase aura gain by 1%',
        unlocked: false,
        price: 1,
        displayCondition: signal(true),
    },
        {
        id: 5,
        name: 'crown',
        description: 'Unlock crown for your moyai to increase aura gain by 1%',
        unlocked: false,
        price: 1,
        displayCondition: signal(true),
    },
];
