import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ChestOpening } from '../../components/chest-opening/chest-opening';
import { MoyaiViewer } from '../../components/moyai-viewer/moyai-viewer';
import { CollectionManager } from '../../services/collection-manager';
import { ConsumableManager } from '../../services/consumable-manager';
import { GameLoop } from '../../services/game-loop';
import { HintManager } from '../../services/hint-manager';
import { ModalManager } from '../../services/modal-manager';
import { ModelIcons } from '../../services/model-icons';
import { Sound, SoundManager } from '../../services/sound-manager';
import {
  CHESTS,
  ChestDefinition,
  ChestTier,
  RARITIES,
  RARITY_COLORS,
  RELIC_CHEST_CHANCE,
  Rarity
} from '../../../assets/static/collectibles';
import { ConsumableDefinition } from '../../../assets/static/consumables';

/**
 * Boutique du moyai marchand : un comptoir, le vendeur derrière, et les
 * étagères en dessous.
 *
 * Elle est séparée de la collection, qui ne montre plus que ce qu'on possède :
 * acheter et contempler sont deux gestes différents, et les mélanger obligeait
 * à faire défiler la moitié d'un écran pour atteindre l'autre.
 */
@Component({
  selector: 'app-store-page',
  standalone: true,
  imports: [TranslatePipe, MoyaiViewer],
  templateUrl: './store-page.html',
  styleUrl: './store-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StorePage {

  readonly collection = inject(CollectionManager);
  readonly consumables = inject(ConsumableManager);
  private readonly modalManager = inject(ModalManager);
  private readonly modelIcons = inject(ModelIcons);
  private readonly hintManager = inject(HintManager);
  private readonly soundManager = inject(SoundManager);
  private readonly router = inject(Router);
  private readonly gameLoop = inject(GameLoop);

  readonly rarityColors = RARITY_COLORS;

  /** Le coffre du doomscrolling tombe tout seul : il ne se vend pas. */
  readonly shopChests = CHESTS.filter(chest => chest.price !== null);

  /** Coffres en réserve, à ouvrir sans repasser par la caisse. */
  readonly pendingTiers = computed(() =>
    CHESTS.filter(chest => this.collection.chestCount(chest.tier) > 0)
  );

  chestIcon(tier: ChestTier): string {
    return this.modelIcons.chest(tier);
  }

  canIcon(definition: ConsumableDefinition): string {
    return this.modelIcons.can(definition.id);
  }

  /** Chances d'un coffre, en pourcentages entiers, raretés nulles omises. */
  odds(chest: ChestDefinition): { rarity: Rarity; percent: number }[] {
    return RARITIES.filter(rarity => chest.odds[rarity] > 0).map(rarity => ({
      rarity,
      percent: Math.round(chest.odds[rarity] * 100)
    }));
  }

  relicOdds(chest: ChestDefinition): string {
    return `${(RELIC_CHEST_CHANCE[chest.tier] * 100).toFixed(1)}`;
  }

  /** Durée d'un consommable, en minutes, pour l'étiquette. */
  minutes(definition: ConsumableDefinition): number {
    return Math.round(definition.duration / 60);
  }

  /** Temps restant sur un effet, en `m:ss`. */
  countdown(definition: ConsumableDefinition): string {
    const total = this.consumables.remaining(definition.id);
    return `${Math.floor(total / 60)}:${`${total % 60}`.padStart(2, '0')}`;
  }

  buyChest(chest: ChestDefinition): void {
    if (!this.collection.buyChest(chest.tier)) {
      this.hintManager.show('COLLECTION_NOT_ENOUGH_GEMS');
      return;
    }
    this.soundManager.playFX(Sound.Buy);
    this.openChest(chest.tier);
  }

  openChest(tier: ChestTier): void {
    this.soundManager.playFX(Sound.Plop);
    this.modalManager.open(ChestOpening, { tier });
  }

  buyDrink(definition: ConsumableDefinition): void {
    if (!this.consumables.buy(definition)) {
      this.hintManager.show('COLLECTION_NOT_ENOUGH_GEMS');
      return;
    }
    this.soundManager.playFX(Sound.Buy);
    this.hintManager.show('STORE_DRINK_HINT');
  }

  openCollection(): void {
    this.soundManager.playFX(Sound.Plop);
    this.router.navigate(['/collection']);
  }

  back(): void {
    this.soundManager.playFX(Sound.Plop);
    this.router.navigate(['/game']);
  }

  ngOnInit(): void {
    // Comme les autres écrans de jeu : y arriver directement doit charger la
    // partie, sinon le compte de gemmes reste à zéro.
    this.gameLoop.start();
  }
}
