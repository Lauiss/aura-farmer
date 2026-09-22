import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { HintManager } from '../../services/hint-manager';
import { MoyaiViewer } from '../moyai-viewer/moyai-viewer';

/**
 * Petit moyai qui surgit en bas de l'écran avec une bulle de texte. Monté une
 * seule fois au niveau de l'application, il sert d'indication ponctuelle —
 * aujourd'hui quand on clique sur un succès encore verrouillé.
 */
@Component({
  selector: 'app-moyai-hint',
  standalone: true,
  imports: [TranslatePipe, MoyaiViewer],
  templateUrl: './moyai-hint.html',
  styleUrl: './moyai-hint.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoyaiHint {
  readonly hintManager = inject(HintManager);
}
