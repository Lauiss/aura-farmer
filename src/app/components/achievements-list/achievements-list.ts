import { Component, inject } from '@angular/core';
import { AchievementsManager } from '../../services/achievements-manager';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-achievements-list',
  imports: [TranslatePipe, CommonModule],
  templateUrl: './achievements-list.html',
  styleUrl: './achievements-list.scss'
})
export class AchievementsList {
  achievementsManager = inject(AchievementsManager);
}
