import { Injectable, WritableSignal, signal, computed, inject } from '@angular/core';
import { AuraManager } from './aura-manager';
import { ShopManager } from './shop-manager';
import { Subject } from 'rxjs';

export interface Achievement {
  id: number;
  title: string;
  description: string;
  /**
   * Interpolation de la description, pour les seuils chiffrés. Le nombre est
   * mis en forme par `FormatAuraPipe` à la déclaration : il se lit pareil
   * dans les deux langues, mais sa **place** dans la phrase, non.
   */
  params?: Record<string, unknown>;
  condition: () => boolean;
  unlocked: boolean;
  /**
   * Succès **secret** : tant qu'il n'est pas obtenu, ni son titre ni sa
   * description ne se montrent. Réservé à ce qui se découvre — un geste qu'on
   * n'a aucune raison de tenter, une bêtise qu'on regrette. Le reste des
   * succès verrouillés s'affiche en clair : ce sont des objectifs, et un
   * objectif qu'on ne peut pas lire n'en est pas un.
   */
  secret?: boolean;
}

export interface AchievementSave {
  id: number;
  unlocked: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AchievementsManager {
  private auraManager = inject(AuraManager);
  private shopManager = inject(ShopManager);

  achievements = signal<Achievement[]>([]);
  totalClicks = signal(0);

  // Subject pour notifier les nouveaux achievements débloqués
  achievementUnlocked$ = new Subject<Achievement>();

  setAchievements(achievements: Achievement[]) {
    this.achievements.set(achievements);
  }

  checkAchievements(): Achievement[] {
    const unlocked: Achievement[] = [];
    const achievements = this.achievements();

    for (const achievement of achievements) {
      if (!achievement.unlocked && achievement.condition()) {
        achievement.unlocked = true;
        unlocked.push(achievement);
        // Notifier le nouveau achievement
        this.achievementUnlocked$.next(achievement);
      }
    }

    if (unlocked.length > 0) {
      this.achievements.set([...achievements]);
    }

    return unlocked;
  }

  // Vérifie les achievements sans afficher de notification (pour la rétroactivité)
  checkAchievementsSilently(): void {
    const achievements = this.achievements();
    let hasChanges = false;

    for (const achievement of achievements) {
      if (!achievement.unlocked && achievement.condition()) {
        achievement.unlocked = true;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.achievements.set([...achievements]);
    }
  }

  incrementClicks() {
    this.totalClicks.update(c => c + 1);
  }

  getUnlockedCount(): number {
    return this.achievements().filter(a => a.unlocked).length;
  }

  getTotalCount(): number {
    return this.achievements().length;
  }

  restoreFromSave(saved: AchievementSave[]) {
    if (!saved) return;
    const achievements = this.achievements();

    for (const savedAchievement of saved) {
      const existing = achievements.find(a => a.id === savedAchievement.id);
      if (existing) {
        existing.unlocked = savedAchievement.unlocked;
      }
    }

    this.achievements.set([...achievements]);
  }

  getAchievementsForSave(): AchievementSave[] {
    return this.achievements().map(a => ({
      id: a.id,
      unlocked: a.unlocked
    }));
  }
}
