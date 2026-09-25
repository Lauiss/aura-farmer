import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CallManager } from '../../services/call-manager';
import { ModalManager } from '../../services/modal-manager';
import { ModelIcons } from '../../services/model-icons';
import { CALL_RING_SECONDS } from '../../../assets/static/callers';

/**
 * Appel entrant : la tête de celui qui appelle, son nom, et deux boutons —
 * vert pour décrocher, rouge pour raccrocher.
 *
 * Elle ne décide de rien : tout est dans [`CallManager`](../../services/call-manager.ts).
 * Elle se contente de montrer qui appelle et de **se refermer d'elle-même** dès
 * que la sonnerie s'arrête, y compris quand personne n'a touché à rien et que
 * le délai a expiré.
 *
 * Le compte à rebours est visible : sans lui, on ne comprend pas pourquoi
 * l'appel s'est évanoui pendant qu'on hésitait.
 */
@Component({
  selector: 'app-incoming-call',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './incoming-call.html',
  styleUrl: './incoming-call.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncomingCall implements OnDestroy {

  readonly calls = inject(CallManager);
  private readonly modalManager = inject(ModalManager);
  private readonly modelIcons = inject(ModelIcons);

  /**
   * L'appelant est lu **une fois** : quand le service le remet à `null`, le
   * panneau doit encore pouvoir s'afficher le temps de se refermer, sans se
   * vider de son contenu entre-temps.
   */
  readonly caller = this.calls.ringing();
  readonly portrait = this.caller ? this.modelIcons.caller(this.caller.id, 320) : '';

  /** Secondes restantes, pour la jauge et le décompte. */
  readonly remaining = signal(CALL_RING_SECONDS);
  readonly total = CALL_RING_SECONDS;

  private readonly ticker = setInterval(() => {
    this.remaining.update(value => Math.max(0, value - 1));
  }, 1000);

  constructor() {
    // La modale suit la sonnerie : décrocher, raccrocher ou laisser passer
    // remettent `ringing` à `null`, et le panneau s'en va dans les trois cas.
    effect(() => {
      if (!this.calls.ringing()) this.modalManager.close();
    });
  }

  answer(): void {
    this.calls.answer();
  }

  hangUp(): void {
    this.calls.hangUp();
  }

  ngOnDestroy(): void {
    clearInterval(this.ticker);
  }
}
