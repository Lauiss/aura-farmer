import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { ModalManager } from '../../services/modal-manager';
import { ModelIcons } from '../../services/model-icons';
import { Sound, SoundManager } from '../../services/sound-manager';
import { CinematicManager } from '../../services/cinematic-manager';
import { QuestManager } from '../../services/quest-manager';
import { BattleManager } from '../../services/battle-manager';
import { CollectionManager } from '../../services/collection-manager';
import { PlayTime, formatClock } from '../../services/play-time';

/**
 * L'écran de fin.
 *
 * Le jeu se terminait sans rien dire : la dernière cinématique s'arrêtait et
 * l'on se retrouvait devant la statue, sans qu'on sache qu'on venait de finir.
 * Un incrémental n'a pas de générique, mais il a une **durée** — et c'est la
 * seule chose qu'un joueur qui vient de terminer veut lire.
 *
 * Le temps affiché est celui **gelé à la fin de l'histoire**
 * (`QuestManager.finishedAt`) et non le compteur courant : sans ce gel, rouvrir
 * l'écran une heure plus tard afficherait une heure de plus, et le chiffre ne
 * voudrait plus rien dire.
 */
@Component({
  selector: 'app-game-ending',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './game-ending.html',
  styleUrl: './game-ending.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameEnding {

  private readonly modalManager = inject(ModalManager);
  private readonly soundManager = inject(SoundManager);
  private readonly modelIcons = inject(ModelIcons);
  private readonly router = inject(Router);
  private readonly quests = inject(QuestManager);
  private readonly playTime = inject(PlayTime);
  private readonly battles = inject(BattleManager);
  private readonly collection = inject(CollectionManager);
  readonly cinematics = inject(CinematicManager);

  readonly trophy = this.modelIcons.trophy(true);

  /** Le chrono, en `HH:MM:SS` : une durée de fin se lit comme un temps. */
  readonly clock = computed(() => formatClock(this.quests.finishedAt() ?? this.playTime.seconds()));

  /** Laquelle des deux fins, pour que le texte ne soit pas le même. */
  readonly ending = computed(() => this.cinematics.ending() ?? 'keep');

  /**
   * De quoi relire son parcours. Ce sont les seuls chiffres qui disent ce
   * qu'on a fait plutôt que ce qu'on a amassé.
   */
  readonly tally = computed(() => [
    { key: 'ENDING_BOSSES', value: `${this.battles.defeatedCount()}` },
    { key: 'ENDING_FIGURES', value: `${this.collection.ownedCount()}/${this.collection.catalogue.length}` },
    { key: 'ENDING_RELICS', value: `${this.collection.relicCount()}/${this.collection.relicCatalogue.length}` },
    { key: 'ENDING_WATCHES', value: `${this.collection.watchCount()}/${this.collection.watchCatalogue.length}` }
  ]);

  /** On continue de jouer : rien n'est retiré, la partie reste ouverte. */
  close(): void {
    this.soundManager.playFX(Sound.Plop);
    this.modalManager.close();
  }

  toMenu(): void {
    this.soundManager.playFX(Sound.Plop);
    this.modalManager.closeAll();
    this.router.navigate(['/']);
  }
}
