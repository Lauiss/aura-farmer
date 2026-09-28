import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BACKDROP_VIEWBOX, Backdrop, backdrop } from '../../../assets/static/backdrops';
import type { BackgroundId } from '../../../assets/static/backgrounds';

/**
 * Le décor de fond, en SVG.
 *
 * Il vit **dans** `MoyaiViewer`, derrière son canvas, et non dans l'écran de
 * jeu : l'aperçu de la garde-robe montre le même décor que la partie, et le
 * poser dans une page aurait obligé à le reposer dans l'autre.
 *
 * Il ne contient aucune image et aucun dégradé — voir
 * [backdrops.ts](../../../assets/static/backdrops.ts).
 */
@Component({
  selector: 'app-scene-backdrop',
  standalone: true,
  templateUrl: './scene-backdrop.html',
  styleUrl: './scene-backdrop.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SceneBackdrop {

  readonly background = input<BackgroundId | null>(null);

  readonly viewBox = BACKDROP_VIEWBOX;

  readonly art = computed<Backdrop | null>(() => {
    const id = this.background();
    return id ? backdrop(id) : null;
  });
}
