import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Achievement, AchievementsManager } from '../../services/achievements-manager';
import { HintManager } from '../../services/hint-manager';
import { ModalManager } from '../../services/modal-manager';
import { TrophyIcons } from '../../services/trophy-icons';
import { AchievementDetail } from '../achievement-detail/achievement-detail';

@Component({
  selector: 'app-achievements-list',
  imports: [TranslatePipe],
  templateUrl: './achievements-list.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './achievements-list.scss'
})
export class AchievementsList {
  achievementsManager = inject(AchievementsManager);

  private readonly trophyIcons = inject(TrophyIcons);
  private readonly hintManager = inject(HintManager);
  private readonly modalManager = inject(ModalManager);

  /** Trophée ambré pour un succès débloqué, gris sinon. */
  trophyIcon(unlocked: boolean): string {
    return this.trophyIcons.get(unlocked);
  }

  onAchievementClick(achievement: Achievement): void {
    if (achievement.unlocked) {
      // S'empile sur la liste, qui reste ouverte derrière.
      this.modalManager.open(AchievementDetail, { data: { achievement } }, 'md');
      return;
    }
    this.hintManager.show('ACHIEVEMENT_LOCKED_HINT');
  }
}
