import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Achievement, AchievementsManager } from '../../services/achievements-manager';
import { ModelIcons } from '../../services/model-icons';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-achievement-toast',
  imports: [TranslatePipe],
  templateUrl: './achievement-toast.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './achievement-toast.scss'
})
export class AchievementToast implements OnInit {
  private achievementsManager = inject(AchievementsManager);
  achievements = signal<Achievement[]>([]);

  private readonly modelIcons = inject(ModelIcons);

  /** Un bandeau n'apparaît que pour un succès débloqué : toujours le trophée ambré. */
  get trophyIcon(): string {
    return this.modelIcons.trophy(true);
  }

  ngOnInit() {
    // S'abonner aux nouveaux achievements débloqués
    this.achievementsManager.achievementUnlocked$.subscribe(achievement => {
      this.showAchievement(achievement);
    });
  }

  showAchievement(achievement: Achievement) {
    this.achievements.update(list => [...list, achievement]);

    // Retirer le toast après 4 secondes
    setTimeout(() => {
      this.achievements.update(list => list.filter(a => a.id !== achievement.id));
    }, 4000);
  }
}
