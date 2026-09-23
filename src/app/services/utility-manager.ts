import { Injectable, computed, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';
import { SaveLocation, SaveManager } from './save-manager';
import { ShopManager } from './shop-manager';
import {
  UTILITIES,
  UtilityDefinition,
  UtilityId,
  UtilityStat
} from '../../assets/static/utilities';

export type { UtilityDefinition, UtilityId, UtilityUpgrade } from '../../assets/static/utilities';

interface UtilitySave {
  owned: UtilityId[];
  /** Pilote automatique du doomscrolling allumé ; vrai par défaut. */
  autoScroll?: boolean;
  /** Exemplaires achetés, par utilitaire puis par amélioration. */
  upgrades: Partial<Record<UtilityId, Record<number, number>>>;
}

/**
 * Utilitaires : des achats ponctuels qui ajoutent une mécanique plutôt qu'un
 * bonus continu — les points faibles, le doomscrolling et le trickshot.
 * Les améliorations passent par les helpers de `ShopManager`, pour obéir aux
 * mêmes règles de prérequis et de prix que celles des articles.
 */
@Injectable({
  providedIn: 'root'
})
export class UtilityManager {

  readonly catalogue = UTILITIES;

  private readonly auraManager = inject(AuraManager);
  private readonly saveManager = inject(SaveManager);
  private readonly shopManager = inject(ShopManager);

  private readonly ownedIds = signal<Set<UtilityId>>(new Set());
  /** Interrupteur du pilote automatique, pour qui l'a acheté. */
  readonly autoScrollEnabled = signal(true);

  constructor() {
    this.restore(this.saveManager.loadProgress(SaveLocation.Utilities));
  }

  readonly owned = computed<UtilityId[]>(() => [...this.ownedIds()]);

  isOwned(id: UtilityId): boolean {
    return this.ownedIds().has(id);
  }

  definition(id: UtilityId): UtilityDefinition {
    return UTILITIES.find(utility => utility.id === id)!;
  }

  buy(id: UtilityId): boolean {
    if (this.isOwned(id)) return false;

    const price = this.definition(id).price;
    if (this.auraManager.auraCount() < price) return false;

    this.auraManager.auraCount.update(aura => aura - price);
    this.ownedIds.update(owned => new Set(owned).add(id));
    this.persist();
    return true;
  }

  buyUpgrade(id: UtilityId, upgradeId: number): boolean {
    if (!this.isOwned(id)) return false;
    const list = this.definition(id).upgrades;
    const upgrade = list.find(u => u.id === upgradeId);
    if (!upgrade || !this.shopManager.buyUpgradeCopy(list, upgrade)) return false;

    this.persist();
    return true;
  }

  /** Somme de ce qu'apportent les exemplaires achetés pour une grandeur. */
  bonus(id: UtilityId, stat: UtilityStat): number {
    return this.definition(id)
      .upgrades.filter(u => u.stat === stat)
      .reduce((total, u) => total + u.value * this.shopManager.upgradePurchases(u), 0);
  }

  /** Tire au sort le déclenchement du trickshot, si on le possède. */
  rollTrickshot(): boolean {
    if (!this.isOwned('trickshot')) return false;
    return Math.random() < (this.definition('trickshot').chance ?? 0);
  }

  // --- Points faibles ----------------------------------------------------

  /** Multiplicateur d'un coup porté sur un point faible. */
  readonly critMultiplier = computed(() => 5 + this.bonus('weakpoints', 'critMultiplier'));
  /** Élan ajouté au combo par un point faible touché. */
  readonly weakPointCombo = computed(() => 0.35 + this.bonus('weakpoints', 'weakPointCombo'));
  /** Réglages transmis à la statue, ou `null` sans l'utilitaire. */
  readonly weakPointConfig = computed(() =>
    this.ownedIds().has('weakpoints')
      ? {
          size: 1 + this.bonus('weakpoints', 'weakPointSize'),
          lifetime: 2.6 + this.bonus('weakpoints', 'weakPointLifetime'),
          respawn: 1.6
        }
      : null
  );

  // --- Doomscrolling -----------------------------------------------------

  /** Probabilité qu'une publication fasse gagner de l'aura. */
  readonly doomscrollLuck = computed(() => Math.min(0.9, 0.55 + this.bonus('doomscroll', 'luck')));
  /** Multiplicateur des montants, gagnés comme perdus. */
  readonly doomscrollPayout = computed(() => 1 + this.bonus('doomscroll', 'payout'));
  /** Le pilote automatique est-il acheté ? */
  readonly doomscrollAutoOwned = computed(() => this.bonus('doomscroll', 'autoScroll') > 0);
  /** Le téléphone défile-t-il tout seul ? Il faut l'amélioration et l'interrupteur. */
  readonly doomscrollAuto = computed(() => this.doomscrollAutoOwned() && this.autoScrollEnabled());

  toggleAutoScroll(): void {
    this.autoScrollEnabled.update(enabled => !enabled);
    this.persist();
  }
  /** Chance qu'une publication soit un coffre. */
  readonly chestChance = computed(() => 0.006 + this.bonus('doomscroll', 'chestChance'));
  /** Élan ajouté au combo par publication parcourue. */
  readonly doomscrollCombo = computed(() => 0.08 + this.bonus('doomscroll', 'scrollCombo'));

  // --- Rotation ------------------------------------------------------------

  /**
   * Part de l'amortissement retirée à la statue : posséder l'utilitaire en
   * retire déjà un cinquième, chaque exemplaire d'amélioration un peu plus.
   */
  readonly inertia = computed(() =>
    this.ownedIds().has('spin') ? Math.min(0.9, 0.2 + this.bonus('spin', 'inertia')) : 0
  );
  /** Vitesse de rotation perpétuelle, en radians par seconde ; 0 sans l'amélioration. */
  readonly autoSpin = computed(() => (this.bonus('spin', 'autoSpin') > 0 ? 5 : 0));

  // --- Sauvegarde --------------------------------------------------------

  private restore(saved: UtilitySave | UtilityId[] | null): void {
    if (!saved) return;
    // L'ancien format ne gardait que la liste des utilitaires possédés.
    const data: UtilitySave = Array.isArray(saved) ? { owned: saved, upgrades: {} } : saved;

    this.ownedIds.set(new Set(data.owned ?? []));
    this.autoScrollEnabled.set(data.autoScroll ?? true);
    for (const utility of UTILITIES) {
      const purchases = data.upgrades?.[utility.id] ?? {};
      for (const upgrade of utility.upgrades) {
        upgrade.purchases = purchases[upgrade.id] ?? 0;
        upgrade.unlocked = upgrade.purchases > 0;
      }
    }
    this.shopManager.markPurchasesChanged();
  }

  private persist(): void {
    const upgrades: UtilitySave['upgrades'] = {};
    for (const utility of UTILITIES) {
      upgrades[utility.id] = Object.fromEntries(
        utility.upgrades.map(u => [u.id, this.shopManager.upgradePurchases(u)])
      );
    }
    this.saveManager.saveProgress(SaveLocation.Utilities, {
      owned: [...this.ownedIds()],
      autoScroll: this.autoScrollEnabled(),
      upgrades
    } satisfies UtilitySave);
  }
}
