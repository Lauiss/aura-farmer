import { Injectable, computed, inject, signal } from '@angular/core';
import { BackgroundId, BACKGROUNDS, backgroundDefinition } from '../three/models/backgrounds';
import { AuraManager } from './aura-manager';
import { SaveLocation, SaveManager } from './save-manager';
import { ShopManager } from './shop-manager';

interface BackgroundSave {
  owned: BackgroundId[];
  selected: BackgroundId | null;
  /** Exemplaires achetés, par décor puis par amélioration. */
  upgrades?: Partial<Record<BackgroundId, Record<number, number>>>;
}

/**
 * Décors de fond : lesquels sont acquis, et lequel est affiché.
 *
 * Le meilleur décor **possédé** accorde un bonus de production qui se cumule
 * avec tout le reste ; l'affichage, lui, est une simple préférence.
 */
@Injectable({
  providedIn: 'root'
})
export class BackgroundManager {

  readonly catalogue = BACKGROUNDS;

  private readonly auraManager = inject(AuraManager);
  private readonly saveManager = inject(SaveManager);
  private readonly shopManager = inject(ShopManager);

  private readonly ownedIds = signal<Set<BackgroundId>>(new Set());
  readonly selected = signal<BackgroundId | null>(null);

  constructor() {
    const saved: BackgroundSave | null = this.saveManager.loadProgress(SaveLocation.Backgrounds);
    if (saved) {
      this.ownedIds.set(new Set(saved.owned ?? []));
      this.selected.set(saved.selected ?? null);
      for (const background of BACKGROUNDS) {
        const purchases = saved.upgrades?.[background.id] ?? {};
        for (const upgrade of background.upgrades) {
          upgrade.purchases = purchases[upgrade.id] ?? 0;
          upgrade.unlocked = upgrade.purchases > 0;
        }
      }
      this.shopManager.markPurchasesChanged();
    }
  }

  readonly owned = computed<BackgroundId[]>(() => [...this.ownedIds()]);
  readonly hasAny = computed(() => this.ownedIds().size > 0);

  /**
   * Bonus du **meilleur** décor possédé, qu'il soit affiché ou non.
   *
   * Il portait auparavant sur le seul décor affiché, ce qui punissait le
   * joueur d'afficher celui qu'il préfère : on ne doit pas avoir à choisir
   * entre ce qu'on trouve beau et ce qui rapporte. Un décor s'achète une fois
   * et compte pour toujours ; l'affichage n'est plus qu'une préférence.
   */
  readonly bonus = computed(() => {
    let best = 0;
    for (const id of this.ownedIds()) {
      best = Math.max(best, this.backgroundBonus(id));
    }
    return 1 + best;
  });

  /** Bonus d'un décor, améliorations comprises, qu'il soit affiché ou non. */
  backgroundBonus(id: BackgroundId): number {
    const definition = backgroundDefinition(id);
    return definition.upgrades.reduce(
      (total, upgrade) => total + upgrade.value * this.shopManager.upgradePurchases(upgrade),
      definition.bonus
    );
  }

  buyUpgrade(id: BackgroundId, upgradeId: number): boolean {
    if (!this.isOwned(id)) return false;
    const list = backgroundDefinition(id).upgrades;
    const upgrade = list.find(u => u.id === upgradeId);
    if (!upgrade || !this.shopManager.buyUpgradeCopy(list, upgrade)) return false;

    this.persist();
    return true;
  }

  isOwned(id: BackgroundId): boolean {
    return this.ownedIds().has(id);
  }

  buy(id: BackgroundId): boolean {
    if (this.isOwned(id)) return false;

    const price = this.shopManager.scaled(backgroundDefinition(id).price);
    if (this.auraManager.auraCount() < price) return false;

    this.auraManager.auraCount.update(aura => aura - price);
    this.ownedIds.update(owned => new Set(owned).add(id));
    // Un décor fraîchement acheté s'affiche : c'est ce qu'on vient chercher.
    this.selected.set(id);
    this.persist();
    return true;
  }

  /** Choisit un décor acquis, ou revient au fond uni avec `null`. */
  select(id: BackgroundId | null): void {
    if (id && !this.isOwned(id)) return;
    this.selected.set(id);
    this.persist();
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Backgrounds, {
      owned: [...this.ownedIds()],
      selected: this.selected(),
      upgrades: Object.fromEntries(
        BACKGROUNDS.map(background => [
          background.id,
          Object.fromEntries(background.upgrades.map(u => [u.id, this.shopManager.upgradePurchases(u)]))
        ])
      )
    } satisfies BackgroundSave);
  }
}
