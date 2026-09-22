import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { AchievementsManager } from '../../services/achievements-manager';
import { TranslatePipe } from '@ngx-translate/core';


@Component({
  selector: 'app-achievements-list',
  imports: [TranslatePipe],
  templateUrl: './achievements-list.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './achievements-list.scss'
})
export class AchievementsList {
  achievementsManager = inject(AchievementsManager);
}
