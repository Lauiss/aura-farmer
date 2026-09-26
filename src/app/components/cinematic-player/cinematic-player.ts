import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CinematicManager } from '../../services/cinematic-manager';
import { ModelIcons } from '../../services/model-icons';
import { Actor, Beat } from '../../../assets/static/cinematics';

/**
 * Joue une cinématique : deux silhouettes sur une scène, et la bulle de
 * dialogue habituelle.
 *
 * Les personnages sont des **vignettes rendues une fois** et animées en CSS,
 * pas des scènes Three.js vivantes. Une cinématique qui ouvrirait trois
 * contextes WebGL de plus, au moment précis où le jeu démarre et où tout le
 * reste se charge, coûterait plus cher que ce qu'elle raconte — et des
 * silhouettes low poly qui glissent, tombent et se relèvent disent la scène
 * aussi bien.
 *
 * Il vit au niveau de l'application, comme la bulle du moyai : posé dans une
 * page, il disparaîtrait au changement d'écran.
 */
@Component({
  selector: 'app-cinematic-player',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './cinematic-player.html',
  styleUrl: './cinematic-player.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CinematicPlayer {

  readonly cinematics = inject(CinematicManager);
  private readonly modelIcons = inject(ModelIcons);

  readonly shot = this.cinematics.shot;

  /** Vignette d'un acteur : la statue du joueur, un boss ou un appelant. */
  icon(actor: Actor): string {
    switch (actor.kind) {
      case 'hero': return this.modelIcons.moyai();
      case 'boss': return this.modelIcons.boss(actor.id);
      case 'caller': return this.modelIcons.caller(actor.id, 320);
    }
  }

  /** Nom affiché au-dessus de la réplique. */
  nameKey(actor: Actor): string {
    switch (actor.kind) {
      case 'hero': return 'BATTLE_YOU';
      case 'boss': return `BOSS_${actor.id.toUpperCase()}`;
      case 'caller': return `CALLER_${actor.id.toUpperCase()}`;
    }
  }

  /** Classe d'animation d'un temps de jeu. */
  beatClass(beat: Beat): string {
    return `beat-${beat}`;
  }

  readonly speaker = computed(() => this.shot()?.speaker ?? null);

  skip(): void {
    this.cinematics.stop();
  }

  advance(): void {
    this.cinematics.next();
  }
}
