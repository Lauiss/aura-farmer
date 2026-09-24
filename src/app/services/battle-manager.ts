import { Injectable, computed, inject, signal } from '@angular/core';
import { SaveLocation, SaveManager } from './save-manager';
import { CollectionManager } from './collection-manager';
import { ShopManager } from './shop-manager';
import { RelicDefinition } from '../../assets/static/collectibles';
import {
  BATTLE_UNLOCK,
  BOSSES,
  BossDefinition,
  BossId,
  FARM_REWARD_SHARE,
  bossDefinition
} from '../../assets/static/bosses';

interface BattleSave {
  /** Boss déjà battus au moins une fois. */
  defeated: BossId[];
  /** Brainrot porté à la place du moyai, `null` pour la statue d'origine. */
  worn: BossId | null;
}

/**
 * Battles d'aura : quels boss sont battus, ce qu'ils rapportent, et lequel de
 * leurs brainrots remplace la statue sur l'écran de clic.
 *
 * Les boss se suivent en file : chacun s'ouvre en battant le précédent. La
 * récompense n'est pleine qu'à la première victoire — on peut refaire un boss,
 * mais le farmer rapporte nettement moins.
 */
@Injectable({
  providedIn: 'root'
})
export class BattleManager {

  readonly catalogue = BOSSES;

  private readonly saveManager = inject(SaveManager);
  private readonly collection = inject(CollectionManager);
  private readonly shopManager = inject(ShopManager);

  private readonly defeatedIds = signal<Set<BossId>>(new Set());
  /** Brainrot porté à la place du moyai ; `null` pour la statue d'origine. */
  readonly worn = signal<BossId | null>(null);

  constructor() {
    const saved: BattleSave | null = this.saveManager.loadProgress(SaveLocation.Battles);
    if (saved) {
      this.defeatedIds.set(new Set(saved.defeated ?? []));
      this.worn.set(saved.worn ?? null);
    }
    // Les reliques sont nées après certaines victoires : une partie en cours
    // récupère celles des boss qu'elle a déjà battus.
    for (const id of this.defeatedIds()) this.collection.grantBossRelic(id);
  }

  readonly defeatedCount = computed(() => this.defeatedIds().size);

  /**
   * Les battles n'existent pour le joueur qu'une fois le débit conseillé du
   * premier boss atteint. Avant, ni l'entrée de menu ni les améliorations de
   * dé ne se montrent : autant ne rien dévoiler d'une mécanique qu'il ne
   * pourrait de toute façon pas aborder.
   */
  readonly discovered = computed(() => this.shopManager.production() >= BATTLE_UNLOCK);

  /** L'accès aux battles s'ouvre dès qu'il y a de quoi frapper. */
  readonly wornDefinition = computed(() => {
    const id = this.worn();
    return id ? bossDefinition(id) : null;
  });

  isDefeated(id: BossId): boolean {
    return this.defeatedIds().has(id);
  }

  /**
   * Le premier boss est ouvert d'entrée ; les suivants attendent que le
   * précédent soit tombé.
   */
  isUnlocked(id: BossId): boolean {
    const index = BOSSES.findIndex(boss => boss.id === id);
    if (index <= 0) return true;
    return this.defeatedIds().has(BOSSES[index - 1].id);
  }

  /** Gemmes rendues par une victoire : pleines la première fois seulement. */
  reward(boss: BossDefinition): number {
    return this.isDefeated(boss.id)
      ? Math.max(1, Math.round(boss.reward * FARM_REWARD_SHARE))
      : boss.reward;
  }

  /**
   * Enregistre une victoire et crédite la récompense. La première rend aussi
   * la relique du boss. Renvoie ce qui a été gagné.
   */
  recordWin(boss: BossDefinition): { gems: number; first: boolean; relic: RelicDefinition | null } {
    const first = !this.isDefeated(boss.id);
    const gems = this.reward(boss);

    this.collection.addGems(gems);
    const relic = this.collection.grantBossRelic(boss.id);
    if (first) {
      this.defeatedIds.update(defeated => new Set(defeated).add(boss.id));
      this.persist();
    }
    return { gems, first, relic };
  }

  /**
   * Porte le brainrot d'un boss battu à la place du moyai, ou revient à la
   * statue. Un boss qu'on n'a pas vaincu ne se porte pas.
   */
  wear(id: BossId | null): void {
    if (id && !this.isDefeated(id)) return;
    this.worn.set(id);
    this.persist();
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Battles, {
      defeated: [...this.defeatedIds()],
      worn: this.worn()
    } satisfies BattleSave);
  }
}
