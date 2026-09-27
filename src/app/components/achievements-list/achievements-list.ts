import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Achievement, AchievementsManager } from '../../services/achievements-manager';
import { HintManager } from '../../services/hint-manager';
import { ModalManager } from '../../services/modal-manager';
import { ModelIcons } from '../../services/model-icons';
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

  private readonly modelIcons = inject(ModelIcons);
  private readonly hintManager = inject(HintManager);
  private readonly modalManager = inject(ModalManager);
  private readonly translate = inject(TranslateService);

  /** Filtre saisi. La liste passe les deux cents entrées : la chercher à l'œil
   *  n'était plus possible. */
  readonly search = signal('');

  /**
   * Succès affichés. La recherche porte sur le titre **et** la description,
   * tous deux traduits — on cherche « coffre » sans savoir comment le succès
   * s'appelle. Un secret encore verrouillé n'a ni l'un ni l'autre : il ne
   * répond donc à aucune recherche, ce qui est le but.
   */
  readonly shown = computed(() => {
    const needle = AchievementsList.fold(this.search());
    if (!needle) return this.achievementsManager.achievements();

    return this.achievementsManager.achievements().filter(achievement => {
      if (this.isHidden(achievement)) return false;
      const haystack = AchievementsList.fold(
        `${this.translate.instant(achievement.title)} ${this.translate.instant(achievement.description, achievement.params)}`
      );
      return haystack.includes(needle);
    });
  });

  /** Sans accents ni casse : « déchu » doit se trouver en tapant « dechu ». */
  private static fold(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  /** Vrai quand le succès ne doit rien dévoiler : secret et pas encore obtenu. */
  isHidden(achievement: Achievement): boolean {
    return !achievement.unlocked && !!achievement.secret;
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  /** Trophée ambré pour un succès débloqué, gris sinon. */
  trophyIcon(unlocked: boolean): string {
    return this.modelIcons.trophy(unlocked);
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
