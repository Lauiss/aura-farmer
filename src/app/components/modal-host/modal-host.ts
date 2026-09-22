import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ModalManager } from '../../services/modal-manager';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-host',
  templateUrl: './modal-host.html',
  styleUrls: ['./modal-host.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule]
})
export class ModalHost {
  readonly modalManager = inject(ModalManager);
}
