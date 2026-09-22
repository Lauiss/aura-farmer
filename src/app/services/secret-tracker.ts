import { Injectable, signal } from '@angular/core';

/**
 * Suit les gestes qui ne sont écrits nulle part et débloquent un succès caché.
 *
 * Comme `SpinCombo`, il est nourri image par image hors de la zone Angular :
 * il n'écrit dans son signal qu'au franchissement du seuil.
 */
@Injectable({
  providedIn: 'root'
})
export class SecretTracker {

  /** Durée, en secondes, pendant laquelle la statue doit tourner le dos. */
  static readonly BACK_FACING_TARGET = 5;

  /** Passe à vrai quand le joueur a contemplé le dos de la statue assez longtemps. */
  readonly backFacingReached = signal(false);

  private seconds = 0;

  reportBackFacing(backFacing: boolean, dt: number): void {
    if (this.backFacingReached()) return;

    // Le compte repart de zéro dès que la statue se retourne : c'est bien une
    // contemplation continue qui est demandée.
    this.seconds = backFacing ? this.seconds + dt : 0;

    if (this.seconds >= SecretTracker.BACK_FACING_TARGET) {
      this.backFacingReached.set(true);
    }
  }
}
