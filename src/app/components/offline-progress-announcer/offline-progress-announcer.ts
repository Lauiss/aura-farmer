import { Component, inject, computed, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormatAuraPipe } from '../../pipes/format-aura';
import { ModalManager } from '../../services/modal-manager';
import { ModelIcons } from '../../services/model-icons';
import { UtilityManager } from '../../services/utility-manager';

/**
 * Ce qui a été gagné pendant l'absence. Le gain passe en premier et en gros —
 * c'est la seule chose qu'on vient lire —, la durée et le débit suivent en
 * retrait, et le plafond est signalé quand il a mordu, sans quoi le joueur
 * croit avoir tout touché.
 */
@Component({
  selector: 'app-offline-progress-announcer',
  imports: [TranslatePipe, forwardRef(() => FormatAuraPipe)],
  templateUrl: './offline-progress-announcer.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './offline-progress-announcer.scss'
})
export class OfflineProgressAnnouncer {
  private modalManager = inject(ModalManager);
  private readonly utilityManager = inject(UtilityManager);

  readonly hourglassIcon = inject(ModelIcons).hourglass();

  offlineProgression = computed(() => {
    return this.modalManager.modalData()?.data?.offlineProgression ?? 0;
  });

  offlineTime = computed(() => {
    return this.modalManager.modalData()?.data?.offlineTime ?? 0;
  });

  /** Temps réellement écoulé, plafond non appliqué. */
  private readonly elapsed = computed<number>(
    () => this.modalManager.modalData()?.data?.elapsed ?? this.offlineTime()
  );

  readonly capHours = computed(() => Math.round(this.utilityManager.offlineCapSeconds() / 3600));

  /** Le plafond a-t-il mordu ? Une minute de marge évite de le dire pour rien. */
  readonly capped = computed(() => this.elapsed() > this.offlineTime() + 60);

  /** Aura par seconde effectivement créditée pendant l'absence. */
  readonly ratePerSecond = computed(() => {
    const seconds = this.offlineTime();
    return seconds > 0 ? this.offlineProgression() / seconds : 0;
  });

  /** Durée créditée, en heures, minutes et secondes. */
  readonly elapsedLabel = computed(() => {
    const total = this.offlineTime();
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = Math.floor(total % 60);
    return hours > 0 ? `${hours} h ${minutes} m` : `${minutes} m ${seconds} s`;
  });
}
