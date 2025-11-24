import { computed } from "@angular/core";
import { Achievement } from "../../app/services/achievements-manager";
import { mewingUpgrades } from "./item_upgrades";

//TODO : fix les achivements
// export const achievements: Achievement[] = [
//       // --- Succès classiques ---
//   {
//     title: "Premiers Pas",
//     description: "Atteindre le niveau 1 avec Jawline Check.",
//     icon: "assets/imgs/achievements/step1.png",
//     condition: computed(() => shopItems[0].level() >= 1),
//     owned: false,
//   },
//   {
//     title: "Début du Rizz",
//     description: "Débloquer l'item Rizz.",
//     icon: "assets/imgs/achievements/rizz.png",
//     condition: computed(() => shopItems[1].unlocked === true),
//     owned: false,
//   },
//   {
//     title: "Flex Légendaire",
//     description: "Atteindre le niveau 5 de Biceps Flexing.",
//     icon: "assets/imgs/achievements/biceps.png",
//     condition: computed(() => shopItems[2].level() >= 5),
//     owned: false,
//   },
//   {
//     title: "Mewing Découvrez",
//     description: "Débloquer l’item Mewing.",
//     icon: "assets/imgs/achievements/mewing.png",
//     condition: computed(() => shopItems[3].unlocked === true),
//     owned: false,
//   },

//   // --- Succès de cumul ---
//   {
//     title: "Petit Bodybuilder",
//     description: "Atteindre un total de 20 niveaux cumulés.",
//     icon: "assets/imgs/achievements/total_levels.png",
//     condition: computed(() => shopItems.reduce((acc, i) => acc + i.level(), 0) >= 20),
//     owned: false,
//   },
//   {
//     title: "Ascension",
//     description: "Atteindre un total de 100 niveaux cumulés.",
//     icon: "assets/imgs/achievements/ascension.png",
//     condition: computed(() => shopItems.reduce((acc, i) => acc + i.level(), 0) >= 100),
//     owned: false,
//   },
//   {
//     title: "Click Machine",
//     description: "Cliquer 500 fois au total.",
//     icon: "assets/imgs/achievements/clicks.png",
//     condition: computed(() => totalClicks() >= 500),
//     owned: false,
//   },
//   {
//     title: "Click God",
//     description: "Cliquer 5000 fois au total.",
//     icon: "assets/imgs/achievements/clicks_god.png",
//     condition: computed(() => totalClicks() >= 5000),
//     owned: false,
//   },

//   // --- Succès aura / upgrades ---
//   {
//     title: "Aura Collector",
//     description: "Générer 1000 d’aura au total.",
//     icon: "assets/imgs/achievements/aura.png",
//     condition: computed(() => totalAura() >= 1000),
//     owned: false,
//   },
//   {
//     title: "Master Collector",
//     description: "Acheter 10 upgrades au total.",
//     icon: "assets/imgs/achievements/upgrades.png",
//     condition: computed(() => totalUpgradesBought() >= 10),
//     owned: false,
//   },
//   {
//     title: "Upgrade Tree Completed",
//     description: "Terminer tous les upgrades de Mewing.",
//     icon: "assets/imgs/achievements/tree_mewing.png",
//     condition: computed(() => mewingUpgrades.every(u => u.unlocked)),
//     owned: false,
//   },

//   // --- Succès rares / mèmes ---
//   {
//     title: "Rizzler Suprême",
//     description: "Avoir Rizz maxé au niveau 10.",
//     icon: "assets/imgs/achievements/rizzler.png",
//     condition: computed(() => shopItems[1].level() >= 10),
//     owned: false,
//   },
//   {
//     title: "Sigma Grindset",
//     description: "Avoir tous les items débloqués.",
//     icon: "assets/imgs/achievements/sigma.png",
//     condition: computed(() => shopItems.every(i => i.unlocked)),
//     owned: false,
//   },
//   {
//     title: "Strongest NPC",
//     description: "Avoir Biceps Flexing niveau 20.",
//     icon: "assets/imgs/achievements/strongest.png",
//     condition: computed(() => shopItems[2].level() >= 20),
//     owned: false,
//   },
//   {
//     title: "Chad Ascension",
//     description: "Avoir Mewing niveau 25.",
//     icon: "assets/imgs/achievements/chad.png",
//     condition: computed(() => shopItems[3].level() >= 25),
//     owned: false,
//   },
//   {
//     title: "Aura Overlord",
//     description: "Monetize Aura niveau 10 ou plus.",
//     icon: "assets/imgs/achievements/aura_overlord.png",
//     condition: computed(() => shopItems[7].level() >= 10),
//     owned: false,
//   }
// ];

