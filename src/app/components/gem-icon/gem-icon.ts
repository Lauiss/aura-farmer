import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ModelIcons } from '../../services/model-icons';

/**
 * Le losange des gemmes, à la taille du texte qui l'entoure.
 *
 * C'était l'emoji 💎 : le seul pictogramme du jeu qui ne sortait pas de
 * `three/models/`, et le seul qui changeait d'allure d'un système à l'autre —
 * bleu plat sous Windows, facetté sous macOS, absent sur certains Linux. Il
 * reprend désormais la gemme de `createGem()`, déjà affichée sur la carte.
 *
 * Purement décoratif : le montant qu'il accompagne porte déjà son libellé.
 */
@Component({
  selector: 'app-gem-icon',
  standalone: true,
  template: `<img [src]="icons.gem()" alt="" aria-hidden="true">`,
  styles: `
    :host {
      display: inline-block;
      // La gemme rendue garde une marge dans sa vignette : à 1 em, elle
      // paraissait plus petite que les chiffres qu'elle accompagne.
      width: 1.4em;
      height: 1.4em;
      vertical-align: -0.35em;
    }

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GemIcon {
  readonly icons = inject(ModelIcons);
}
