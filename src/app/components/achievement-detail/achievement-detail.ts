import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Achievement } from '../../services/achievements-manager';
import { ModalManager } from '../../services/modal-manager';
import { ModelIcons } from '../../services/model-icons';

/**
 * Détail d'un succès débloqué, ouvert par-dessus la liste. Il s'empile sur
 * elle : la croix ne referme que ce panneau et ramène la liste au premier plan.
 */
@Component({
  selector: 'app-achievement-detail',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './achievement-detail.html',
  styleUrl: './achievement-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchievementDetail {

  private readonly modalManager = inject(ModalManager);
  private readonly modelIcons = inject(ModelIcons);

  readonly achievement = computed<Achievement | null>(
    () => this.modalManager.modalData()?.data?.achievement ?? null
  );

  readonly trophyIcon = this.modelIcons.trophy(true);

  close(): void {
    this.modalManager.close();
  }
}
