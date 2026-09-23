import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CollectionManager } from '../../services/collection-manager';
import { ModalManager } from '../../services/modal-manager';
import { ModelIcons } from '../../services/model-icons';
import { HintManager } from '../../services/hint-manager';
import { Sound, SoundManager } from '../../services/sound-manager';
import { GameLoop } from '../../services/game-loop';
import { ChestOpening } from '../../components/chest-opening/chest-opening';
import {
  CHESTS,
  ChestDefinition,
  ChestTier,
  CollectibleDefinition,
  RARITIES,
  RARITY_BONUS,
  RARITY_COLORS,
  Rarity
} from '../../../assets/static/collectibles';

/**
 * Écran du gacha : on y dépense ses gemmes en coffres, on ouvre ceux qu'on a
 * en réserve, et on consulte la collection de statuettes, dont on peut porter
 * la matière sur la statue du jeu.
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
  private readonly modalManager = inject(ModalManager);
  private readonly modelIcons = inject(ModelIcons);
  private readonly hintManager = inject(HintManager);
  private readonly soundManager = inject(SoundManager);
  private readonly router = inject(Router);
  private readonly gameLoop = inject(GameLoop);

  readonly rarityColors = RARITY_COLORS;
  readonly rarityBonus = RARITY_BONUS;
  readonly questionIcon = this.modelIcons.question();

  /** Le coffre du doomscrolling ne s'achète pas : il n'apparaît qu'en réserve. */
  readonly shopChests = CHESTS.filter(chest => chest.price !== null);

  /** Tiers dont on a des coffres en réserve, le coffre gratuit en premier. */
  readonly pendingTiers = computed(() => CHESTS.filter(chest => this.collection.chestCount(chest.tier) > 0));

  /** Statuettes groupées par rareté, de la plus commune à la plus rare. */
  readonly groups = RARITIES.map(rarity => ({
    rarity,
    items: this.collection.catalogue.filter(collectible => collectible.rarity === rarity)
  }));

  readonly totalBonus = computed(() => Math.round((this.collection.bonus() - 1) * 100));

  chestIcon(tier: ChestTier): string {
    return this.modelIcons.chest(tier);
  }

  figure(collectible: CollectibleDefinition): string {
    return this.collection.isOwned(collectible.id) ? this.modelIcons.moyaiSkin(collectible.id) : this.questionIcon;
  }

  /** Chances d'un coffre, en pourcentages entiers, raretés nulles omises. */
  odds(chest: ChestDefinition): { rarity: Rarity; percent: number }[] {
    return RARITIES.filter(rarity => chest.odds[rarity] > 0).map(rarity => ({
      rarity,
      percent: Math.round(chest.odds[rarity] * 100)
    }));
  }

  buy(chest: ChestDefinition): void {
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

  toggleSkin(collectible: CollectibleDefinition): void {
    if (!this.collection.isOwned(collectible.id)) return;
    this.soundManager.playFX(Sound.Plop);
    this.collection.applySkin(this.collection.skin() === collectible.id ? null : collectible.id);
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
