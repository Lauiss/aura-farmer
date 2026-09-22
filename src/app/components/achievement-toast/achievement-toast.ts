import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { AchievementsManager } from '../../services/achievements-manager';
import { HintManager } from '../../services/hint-manager';
import { ModelIcons } from '../../services/model-icons';
import { TranslateService } from '@ngx-translate/core';

/**
 * Relaie les succès débloqués vers la bulle du moyai, en bas de l'écran.
 *
 * Le composant ne rend plus rien lui-même : il ne sert qu'à brancher le flux
 * des succès sur la file de messages, et reste monté au niveau de
 * l'application pour écouter en permanence.
 */
@Component({
  selector: 'app-achievement-toast',
  imports: [],
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ''
})
export class AchievementToast implements OnInit {

  private readonly achievementsManager = inject(AchievementsManager);
  private readonly hintManager = inject(HintManager);
  private readonly modelIcons = inject(ModelIcons);
  private readonly translate = inject(TranslateService);

  ngOnInit() {
    this.achievementsManager.achievementUnlocked$.subscribe(achievement => {
      this.hintManager.announce({
        titleKey: 'ACHIEVEMENT_UNLOCKED',
        // Le titre du succès est une clé, traduite ici plutôt que dans le
        // gabarit : la bulle affiche indifféremment du texte ou une clé.
        body: this.translate.instant(achievement.title),
        icon: this.modelIcons.trophy(true)
      });
    });
  }
}
