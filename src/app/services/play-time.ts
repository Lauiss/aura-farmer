import { Injectable, computed, signal } from '@angular/core';

/**
 * Temps de jeu cumulé, en secondes.
 *
 * Il est mesuré au **temps réel écoulé entre deux battements** de la boucle et
 * non en comptant une seconde par battement : un onglet en arrière-plan voit
 * ses minuteurs ralentis par le navigateur, et le compteur aurait pris du
 * retard sur l'horloge sans qu'on sache lequel des deux croire.
 *
 * Chaque intervalle est **plafonné** (`MAX_STEP`) : au retour d'un ordinateur
 * en veille ou d'un onglet laissé ouvert toute la nuit, la boucle reprend avec
 * des heures d'écart, qui n'ont pas été jouées. C'est ce qui distingue ce
 * compteur de la progression hors-ligne, qui elle compte précisément
 * l'absence.
 *
 * Il vit dans son propre service plutôt que dans `GameLoop` parce que les
 * quêtes le lisent, et que `GameLoop` dépend déjà des quêtes : l'y mettre
 * refermerait un cycle d'injection.
 */
@Injectable({
  providedIn: 'root'
})
export class PlayTime {

  /** Plus long intervalle porté au compteur, en secondes. */
  private static readonly MAX_STEP = 5;

  readonly seconds = signal(0);
  private last = Date.now();

  /** Appelé à chaque battement de la boucle de jeu. */
  tick(): void {
    const now = Date.now();
    const elapsed = (now - this.last) / 1000;
    this.last = now;
    if (elapsed <= 0) return;
    this.seconds.update(total => total + Math.min(elapsed, PlayTime.MAX_STEP));
  }

  /**
   * Repart d'une sauvegarde. L'horloge de référence est remise à maintenant :
   * sans cela, le premier battement après le chargement porterait au compteur
   * tout le temps écoulé depuis la construction du service.
   */
  restore(seconds: number): void {
    this.seconds.set(Math.max(0, seconds));
    this.last = Date.now();
  }

  readonly label = computed(() => formatDuration(this.seconds()));
}

/**
 * Durée lisible : « 14 h 22 » au-delà de l'heure, « 22 min 05 » au-delà de la
 * minute, sinon des secondes. On ne descend jamais sous l'unité en dessous de
 * celle qui domine : « 14 h 22 min 07 s » ne se lit pas.
 */
export function formatDuration(seconds: number): string {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;

  if (hours > 0) return `${hours} h ${`${minutes}`.padStart(2, '0')}`;
  if (minutes > 0) return `${minutes} min ${`${rest}`.padStart(2, '0')}`;
  return `${rest} s`;
}

/**
 * Le même temps en `HH:MM:SS`, pour l'écran de fin.
 *
 * `formatDuration` est fait pour se **lire** en passant (« 14 h 22 ») et coupe
 * volontairement l'unité la plus fine. Un temps de fin de partie est un
 * **score** : il se compare, donc il se donne en entier et à chasse fixe.
 */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(rest)}`;
}
