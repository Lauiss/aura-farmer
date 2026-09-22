import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Bouton réduit à une icône.
 *
 * Une icône seule ne dit pas d'elle-même qu'elle est cliquable, ni ce qu'elle
 * déclenche. Quatre dispositifs se complètent ici, chacun pour un public
 * différent :
 *
 * - un vrai `<button>`, donc focalisable au clavier, actionnable à Entrée et à
 *   Espace, et annoncé comme bouton par les lecteurs d'écran ;
 * - un `aria-label` traduit, l'image étant en `alt=""` pour ne pas être
 *   annoncée deux fois ;
 * - un libellé visible au survol **et au focus clavier** — un `title` natif
 *   n'apparaît jamais au clavier et son annonce dépend du lecteur d'écran ;
 * - un cadre, un curseur de pointage et une réaction au survol, pour que le
 *   bouton se lise comme tel avant même d'être survolé.
 */
@Component({
  selector: 'app-icon-btn',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './icon-btn.html',
  styleUrl: './icon-btn.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconBtn {

  /** Source de l'image, typiquement une icône rendue par `ModelIcons`. */
  readonly icon = input.required<string>();
  /** Clé de traduction du libellé : lu par les lecteurs d'écran et affiché au survol. */
  readonly label = input.required<string>();
  readonly disabled = input(false);

  readonly activate = output<void>();

  onClick(): void {
    if (!this.disabled()) this.activate.emit();
  }
}
