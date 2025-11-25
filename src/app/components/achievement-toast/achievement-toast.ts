import { Component, inject, OnInit, signal } from '@angular/core';
import { Achievement, AchievementsManager } from '../../services/achievements-manager';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-achievement-toast',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './achievement-toast.html',
  styleUrl: './achievement-toast.scss'
})
export class AchievementToast implements OnInit {
  private achievementsManager = inject(AchievementsManager);
  achievements = signal<Achievement[]>([]);

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
