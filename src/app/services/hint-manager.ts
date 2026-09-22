import { Injectable, signal } from '@angular/core';

export interface MoyaiMessage {
  /** Identifiant de file, pour distinguer deux messages identiques. */
  id: number;
  /** Clé de traduction du surtitre, facultative. */
  titleKey?: string;
  /** Texte déjà traduit, prioritaire sur `bodyKey` — sert aux noms de succès. */
  body?: string;
  /** Clé de traduction du corps du message. */
  bodyKey?: string;
  /** Image à afficher à la place de la tête, par exemple un trophée. */
  icon?: string;
  durationMs: number;
}

/**
 * File des messages que le moyai prononce en bas de l'écran : indications de
 * jeu comme annonces de succès.
 *
 * Il vit au niveau de l'application et non dans une modale : `.modal-content`
 * porte un `transform`, qui devient le bloc conteneur de ses descendants en
 * `position: fixed` — un message placé dans la modale se positionnerait par
 * rapport à elle, pas par rapport à l'écran.
 */
@Injectable({
  providedIn: 'root'
})
export class HintManager {

  /** Message affiché, `null` quand la file est vide. */
  readonly current = signal<MoyaiMessage | null>(null);

  private queue: MoyaiMessage[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private nextId = 1;

  /** Indication simple, à partir d'une clé de traduction. */
  show(bodyKey: string, durationMs = 4000): void {
    this.enqueue({ id: this.nextId++, bodyKey, durationMs });
  }

  /** Annonce mise en avant : un surtitre, un texte et une image. */
  announce(message: Omit<MoyaiMessage, 'id' | 'durationMs'>, durationMs = 4500): void {
    this.enqueue({ ...message, id: this.nextId++, durationMs });
  }

  /** Passe au message suivant, ou masque la bulle si la file est vide. */
  next(): void {
    clearTimeout(this.timer);
    const following = this.queue.shift() ?? null;
    this.current.set(following);
    if (following) this.timer = setTimeout(() => this.next(), following.durationMs);
  }

  hide(): void {
    clearTimeout(this.timer);
    this.queue = [];
    this.current.set(null);
  }

  private enqueue(message: MoyaiMessage): void {
    // Les annonces s'enchaînent au lieu de s'écraser : débloquer trois succès
    // d'un coup doit les montrer tous les trois.
    if (this.current()) {
      this.queue.push(message);
      return;
    }
    this.current.set(message);
    this.timer = setTimeout(() => this.next(), message.durationMs);
  }
}
