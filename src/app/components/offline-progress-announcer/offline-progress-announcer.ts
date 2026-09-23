import { Component, inject, computed, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormatAuraPipe } from '../../pipes/format-aura';
import { DecimalPipe } from '@angular/common';
import { ModalManager } from '../../services/modal-manager';
import { ModelIcons } from '../../services/model-icons';

@Component({
  selector: 'app-offline-progress-announcer',
  imports: [TranslatePipe, forwardRef(() => FormatAuraPipe)],
  templateUrl: './offline-progress-announcer.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './offline-progress-announcer.scss'
})
export class OfflineProgressAnnouncer {
  private modalManager = inject(ModalManager);

  readonly hourglassIcon = inject(ModelIcons).hourglass();

  offlineProgression = computed(() => {
    return this.modalManager.modalData()?.data?.offlineProgression ?? 0;
  });

  offlineTime = computed(() => {
    return this.modalManager.modalData()?.data?.offlineTime ?? 0;
  });

  hours = computed(() => Math.floor(this.offlineTime() / 3600));
  minutes = computed(() => Math.floor((this.offlineTime() % 3600) / 60));
  seconds = computed(() => Math.floor(this.offlineTime() % 60));
}
