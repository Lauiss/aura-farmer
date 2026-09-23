import { Injectable, computed, inject, signal } from '@angular/core';
import { CollectionManager } from './collection-manager';
import { SaveLocation, SaveManager } from './save-manager';
import {
  CONSUMABLES,
  ConsumableDefinition,
  ConsumableId,
  consumableDefinition
} from '../../assets/static/consumables';

/** Un effet en cours : l'instant, en millisecondes, où il s'arrête. */
type ActiveMap = Partial<Record<ConsumableId, number>>;

/**
 * Consommables : les canettes achetées en gemmes qui dopent la production
 * pendant un temps donné.
 *
 * Les effets sont conservés par **date de fin** et non par durée restante :
 * ainsi ils continuent de s'écouler pendant que le jeu est fermé, sans quoi
 * fermer l'onglet mettrait un bonus en pause indéfiniment.
 */
@Injectable({
  providedIn: 'root'
})
export class ConsumableManager {

  readonly catalogue = CONSUMABLES;

  private readonly collection = inject(CollectionManager);
  private readonly saveManager = inject(SaveManager);

  private readonly active = signal<ActiveMap>({});
  /**
   * Horloge grossière, avancée par la boucle de jeu. Les `computed` qui
   * dépendent du temps ont besoin d'une source réactive : sans elle, un effet
   * expiré resterait affiché jusqu'au prochain achat.
   */
  private readonly now = signal(Date.now());

  constructor() {
    const saved: ActiveMap | null = this.saveManager.loadProgress(SaveLocation.Consumables);
    if (saved) this.active.set(this.prune(saved, Date.now()));
  }

  /** Facteur appliqué à la production et au clic ; 1 quand rien n'est actif. */
  readonly multiplier = computed(() => {
    const now = this.now();
    let total = 1;
    for (const [id, until] of Object.entries(this.active())) {
      if ((until ?? 0) > now) total *= consumableDefinition(id as ConsumableId).multiplier;
    }
    return total;
  });

  /** Effets en cours, du plus proche de la fin au plus lointain. */
  readonly running = computed(() => {
    const now = this.now();
    return Object.entries(this.active())
      .filter(([, until]) => (until ?? 0) > now)
      .map(([id, until]) => ({
        definition: consumableDefinition(id as ConsumableId),
        remaining: Math.ceil(((until ?? 0) - now) / 1000)
      }))
      .sort((a, b) => a.remaining - b.remaining);
  });

  isActive(id: ConsumableId): boolean {
    return (this.active()[id] ?? 0) > this.now();
  }

  /** Secondes restantes sur un effet, 0 s'il ne tourne pas. */
  remaining(id: ConsumableId): number {
    return Math.max(0, Math.ceil(((this.active()[id] ?? 0) - this.now()) / 1000));
  }

  /**
   * Achète une canette et lance son effet. Boire deux fois la même **prolonge**
   * la durée au lieu d'empiler le facteur : sinon il suffirait d'en acheter
   * dix d'un coup pour multiplier la production par mille.
   */
  buy(definition: ConsumableDefinition): boolean {
    if (this.collection.gems() < definition.price) return false;

    this.collection.spendGems(definition.price);
    const now = Date.now();
    this.active.update(active => {
      const from = Math.max(active[definition.id] ?? 0, now);
      return { ...active, [definition.id]: from + definition.duration * 1000 };
    });
    this.persist();
    return true;
  }

  /**
   * Avance l'horloge, appelée une fois par seconde par la boucle de jeu. Les
   * effets expirés sont retirés à ce moment-là, et la sauvegarde n'est
   * réécrite que si quelque chose a réellement changé.
   */
  tick(): void {
    const now = Date.now();
    this.now.set(now);

    const pruned = this.prune(this.active(), now);
    if (Object.keys(pruned).length !== Object.keys(this.active()).length) {
      this.active.set(pruned);
      this.persist();
    }
  }

  private prune(active: ActiveMap, now: number): ActiveMap {
    return Object.fromEntries(
      Object.entries(active).filter(([, until]) => (until ?? 0) > now)
    ) as ActiveMap;
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Consumables, this.active());
  }
}
