import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CollectionManager } from '../../services/collection-manager';
import { ModelIcons } from '../../services/model-icons';
import { Sound, SoundManager } from '../../services/sound-manager';
import { GameLoop } from '../../services/game-loop';
import {
  CollectibleDefinition,
  RARITIES,
  RARITY_BONUS,
  RARITY_COLORS,
  Rarity,
  RelicDefinition
} from '../../../assets/static/collectibles';

/**
 * Collection : ce que l'on possède, et rien d'autre. Les statuettes, dont on
 * peut porter la matière sur la statue du jeu, et les reliques sacrées.
 *
 * L'achat a son propre écran ([`StorePage`](../store-page/store-page.ts)) :
 * acheter et contempler sont deux gestes différents, et les mélanger obligeait
 * à faire défiler la moitié d'un écran pour atteindre l'autre.
 */
@Component({
  selector: 'app-collection-page',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './collection-page.html',
  styleUrl: './collection-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectionPage {

  readonly collection = inject(CollectionManager);
  private readonly modelIcons = inject(ModelIcons);
  private readonly soundManager = inject(SoundManager);
  private readonly router = inject(Router);
  private readonly gameLoop = inject(GameLoop);

  readonly rarityColors = RARITY_COLORS;
  readonly rarityBonus = RARITY_BONUS;
  readonly questionIcon = this.modelIcons.question();

  /** Statuettes groupées par rareté, de la plus commune à la plus rare. */
  readonly groups = RARITIES.map(rarity => ({
    rarity,
    items: this.collection.catalogue.filter(collectible => collectible.rarity === rarity)
  }));

  readonly totalBonus = computed(() => Math.round((this.collection.bonus() - 1) * 100));

  /** Bonus cumulé des reliques, arrondi : il se compte en facteur, pas en %. */
  readonly relicMultiplier = computed(() => Number(this.collection.relicBonus().toFixed(2)));

  /** Relique trouvée : sa figure. Sinon le point d'interrogation. */
  relicFigure(relic: RelicDefinition): string {
    return this.collection.isRelicOwned(relic.id) ? this.modelIcons.relic(relic.id) : this.questionIcon;
  }

  figure(collectible: CollectibleDefinition): string {
    return this.collection.isOwned(collectible.id) ? this.modelIcons.moyaiSkin(collectible.id) : this.questionIcon;
  }

  toggleSkin(collectible: CollectibleDefinition): void {
    if (!this.collection.isOwned(collectible.id)) return;
    this.soundManager.playFX(Sound.Plop);
    this.collection.applySkin(this.collection.skin() === collectible.id ? null : collectible.id);
  }

  openStore(): void {
    this.soundManager.playFX(Sound.Plop);
    this.router.navigate(['/store']);
  }

  back(): void {
    this.soundManager.playFX(Sound.Plop);
    this.router.navigate(['/game']);
  }

  ngOnInit(): void {
    // Comme la boutique : arriver directement ici doit charger la partie.
    this.gameLoop.start();
  }
}
