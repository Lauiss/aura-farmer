import { Injectable, signal } from '@angular/core';

/**
 * Pilote le moyai d'indication affiché en bas de l'écran.
 *
 * Il vit au niveau de l'application et non dans la modale : `.modal-content`
 * porte un `transform`, qui devient le bloc conteneur de ses descendants en
 * `position: fixed` — un message placé dans la modale se positionnerait par
 * rapport à elle, pas par rapport à l'écran.
 */
@Injectable({
  providedIn: 'root'
})
export class HintManager {

  /** Clé de traduction du message affiché, `null` quand rien n'est montré. */
  readonly message = signal<string | null>(null);

  private timer?: ReturnType<typeof setTimeout>;

  show(translationKey: string, durationMs = 4000): void {
    clearTimeout(this.timer);
    this.message.set(translationKey);
    this.timer = setTimeout(() => this.message.set(null), durationMs);
  }

  hide(): void {
    clearTimeout(this.timer);
    this.message.set(null);
  }
}
