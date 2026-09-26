import { Injectable, computed, inject, signal } from '@angular/core';
import { SaveLocation, SaveManager } from './save-manager';
import { CinematicDefinition, Shot, cinematic } from '../../assets/static/cinematics';

/**
 * Les cinématiques : quelles scènes ont été vues, et où en est celle qui joue.
 *
 * Le service ne rend rien — il tient le déroulé et le temps. C'est
 * [`CinematicPlayer`](../components/cinematic-player/cinematic-player.ts) qui
 * le met à l'écran. Cette séparation permet de sauter une scène, de la rejouer
 * ou d'en écrire une nouvelle sans toucher au rendu.
 *
 * Une scène n'est jouée **qu'une fois par partie** et retenue dans la
 * sauvegarde : revoir la défaite initiale à chaque lancement serait une
 * punition, pas une mise en scène.
 */
@Injectable({
  providedIn: 'root'
})
export class CinematicManager {

  private readonly saveManager = inject(SaveManager);

  private readonly seen = signal<Set<string>>(new Set());

  /** Scène en cours, `null` quand rien ne joue. */
  readonly playing = signal<CinematicDefinition | null>(null);
  /** Rang du plan affiché. */
  readonly shotIndex = signal(0);

  readonly shot = computed<Shot | null>(() => this.playing()?.shots[this.shotIndex()] ?? null);

  /** Vrai sur le dernier plan : le bouton passe de « passer » à « continuer ». */
  readonly isLast = computed(() => {
    const scene = this.playing();
    return !!scene && this.shotIndex() >= scene.shots.length - 1;
  });

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    const saved: string[] | null = this.saveManager.loadProgress(SaveLocation.Cinematics);
    if (saved) this.seen.set(new Set(saved));
  }

  hasSeen(id: string): boolean {
    return this.seen().has(id);
  }

  /**
   * Joue une scène si elle ne l'a jamais été.
   *
   * Le mode calme ne l'empêche **pas** : une cinématique raconte l'histoire,
   * elle n'est pas un effet décoratif, et la sauter priverait le joueur de ce
   * qui donne son sens à la partie. Ce sont ses mouvements qui se taisent —
   * la feuille de style globale coupe les animations, et les plans s'y
   * enchaînent en poses fixes (voir `cinematic-player.scss`).
   */
  play(id: string): boolean {
    if (this.hasSeen(id)) return false;

    const scene = cinematic(id);
    if (!scene) return false;

    this.seen.update(list => new Set(list).add(id));
    this.persist();
    this.playing.set(scene);
    this.shotIndex.set(0);
    this.schedule();
    return true;
  }

  /** Passe au plan suivant, ou termine la scène. */
  next(): void {
    const scene = this.playing();
    if (!scene) return;

    if (this.shotIndex() >= scene.shots.length - 1) {
      this.stop();
      return;
    }
    this.shotIndex.update(rank => rank + 1);
    this.schedule();
  }

  /** Interrompt la scène. Elle compte comme vue : on ne la repropose pas. */
  stop(): void {
    clearTimeout(this.timer);
    this.playing.set(null);
    this.shotIndex.set(0);
  }

  /**
   * Le plan s'enchaîne tout seul au bout de sa durée. On peut aussi le presser
   * d'un clic : une cinématique qu'on ne peut pas accélérer se subit.
   */
  private schedule(): void {
    clearTimeout(this.timer);
    const shot = this.shot();
    if (shot) this.timer = setTimeout(() => this.next(), shot.durationMs);
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Cinematics, [...this.seen()]);
  }
}
