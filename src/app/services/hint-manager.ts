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
  /** Paramètres d'interpolation de `bodyKey`, s'il en attend. */
  params?: Record<string, unknown>;
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

  /**
   * Durée plancher d'un message, et longueur de file au-delà de laquelle on y
   * tend. Débloquer dix succès d'un coup enchaînait dix messages de quatre
   * secondes et demie : trois quarts de minute à regarder défiler avant de
   * pouvoir rejouer.
   */
  private static readonly MIN_DURATION_MS = 1100;
  private static readonly RUSH_AT = 4;

  /**
   * Au-delà de cette longueur, la file est résumée en un seul message. Les
   * annonces au-delà de la dizaine n'apprennent plus rien, elles font juste
   * attendre.
   */
  private static readonly MAX_QUEUE = 6;

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
    if (following) this.timer = setTimeout(() => this.next(), this.displayTime(following));
  }

  /**
   * Temps d'affichage réel : d'autant plus court que la file est longue. Un
   * message isolé garde sa durée pleine, une avalanche défile au pas de
   * course sans jamais descendre sous le seuil de lisibilité.
   */
  private displayTime(message: MoyaiMessage): number {
    if (this.queue.length === 0) return message.durationMs;
    const rush = Math.min(1, this.queue.length / HintManager.RUSH_AT);
    return Math.round(
      message.durationMs + (HintManager.MIN_DURATION_MS - message.durationMs) * rush
    );
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
      this.collapse();
      return;
    }
    this.current.set(message);
    this.timer = setTimeout(() => this.next(), this.displayTime(message));
  }

  /**
   * Replie une file trop longue en un unique décompte. On garde les premiers
   * messages, qui portent l'information, et on remplace la traîne par « et N
   * autres » plutôt que de la faire défiler.
   */
  private collapse(): void {
    if (this.queue.length <= HintManager.MAX_QUEUE) return;

    const kept = this.queue.slice(0, HintManager.MAX_QUEUE - 1);
    // Le décompte s'additionne au lieu de repartir de zéro : un résumé déjà
    // présent dans la traîne emporte son propre total avec lui, sinon replier
    // deux fois de suite annonçait « et 2 autres » après en avoir masqué dix.
    const dropped = this.queue
      .slice(kept.length)
      .reduce((total, message) => total + ((message.params?.['count'] as number) ?? 1), 0);

    kept.push({
      id: this.nextId++,
      bodyKey: 'HINT_AND_MORE',
      params: { count: dropped },
      durationMs: 2600
    });
    this.queue = kept;
  }
}
