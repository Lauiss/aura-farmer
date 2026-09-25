import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NgTemplateOutlet } from '@angular/common';
import { ChestOpening } from '../../components/chest-opening/chest-opening';
import { CollectionManager } from '../../services/collection-manager';
import { ConsumableManager } from '../../services/consumable-manager';
import { StoreManager } from '../../services/store-manager';
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
  Rarity
} from '../../../assets/static/collectibles';
import { ConsumableDefinition } from '../../../assets/static/consumables';

/**
 * Boutique de **John Pork** : lui derrière son comptoir à gauche, la
 * marchandise en liste à droite.
 *
 * Le vendeur tenait toute la largeur en haut de page et il fallait le dépasser
 * pour voir ce qu'il vendait ; en colonne, il reste visible pendant qu'on
 * parcourt les rayons — et c'est lui qui accuse réception de l'achat, dans sa
 * bulle, là où seule la ligne de gemmes changeait tout en haut de l'écran.
 *
 * Son portrait est une **vignette rendue une fois** et non une scène vivante :
 * l'écran de jeu fait déjà tourner plusieurs contextes WebGL, et un vendeur
 * qui tourne sur lui-même n'apprend rien de plus qu'un vendeur immobile.
 *
 * La boutique est séparée de la collection, qui ne montre plus que ce qu'on
 * possède : acheter et contempler sont deux gestes différents.
 */
@Component({
  selector: 'app-store-page',
  standalone: true,
  imports: [TranslatePipe, NgTemplateOutlet],
  templateUrl: './store-page.html',
  styleUrl: './store-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StorePage {

  readonly collection = inject(CollectionManager);
  readonly consumables = inject(ConsumableManager);
  readonly store = inject(StoreManager);
  private readonly modalManager = inject(ModalManager);
  private readonly modelIcons = inject(ModelIcons);
  private readonly hintManager = inject(HintManager);
  private readonly soundManager = inject(SoundManager);
  private readonly router = inject(Router);
  private readonly gameLoop = inject(GameLoop);

  readonly rarityColors = RARITY_COLORS;
  readonly vendorPortrait = this.modelIcons.caller('john', 512);

  /**
   * Ce que le marchand dit à l'instant. Il part de son boniment et revient
   * dessus après chaque réplique : une bulle qui reste sur « pas assez de
   * gemmes » finirait par ne plus rien vouloir dire.
   */
  readonly line = signal('STORE_PITCH');
  private lineTimer?: ReturnType<typeof setTimeout>;

  private say(key: string): void {
    this.line.set(key);
    clearTimeout(this.lineTimer);
    this.lineTimer = setTimeout(() => this.line.set('STORE_PITCH'), 3200);
  }

  /**
   * Coffres en vente : ceux dont le rayon a été ouvert dans l'arbre. Celui du
   * doomscrolling tombe tout seul et ne se vend pas.
   */
  readonly shopChests = computed(() =>
    CHESTS.filter(chest => chest.price !== null && this.store.isChestUnlocked(chest.tier))
  );

  /** Coffres en réserve, à ouvrir sans repasser par la caisse. */
  readonly pendingTiers = computed(() =>
    CHESTS.filter(chest => this.collection.chestCount(chest.tier) > 0)
  );

  /**
   * Article qui vient d'être acheté, pour lui donner son à-coup. Sans
   * réaction, cliquer « acheter » ne se distinguait pas d'un clic raté : seule
   * la ligne de gemmes changeait, tout en haut de l'écran.
   */
  readonly bought = signal<string | null>(null);

  private celebrate(key: string): void {
    this.bought.set(key);
    setTimeout(() => {
      if (this.bought() === key) this.bought.set(null);
    }, 460);
  }

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
      this.say('STORE_SAY_BROKE');
      return;
    }
    this.soundManager.playFX(Sound.Buy);
    this.celebrate(`chest-${chest.tier}`);
    this.say('STORE_SAY_THANKS');
    this.openChest(chest.tier);
  }

  openChest(tier: ChestTier): void {
    this.soundManager.playFX(Sound.Plop);
    this.modalManager.open(ChestOpening, { tier });
  }

  /**
   * Un seul effet par catégorie : tant qu'une canette tourne, le marchand
   * refuse d'en vendre une autre — d'où l'arrêt cardiaque. Idem pour un plat.
   */
  buyConsumable(definition: ConsumableDefinition): void {
    const food = definition.category === 'food';
    switch (this.consumables.buy(definition)) {
      case 'busy':
        this.say(food ? 'STORE_FOOD_FULL' : 'STORE_HEART_ATTACK');
        return;
      case 'gems':
        this.say('STORE_SAY_BROKE');
        return;
    }
    this.soundManager.playFX(Sound.Buy);
    this.celebrate(`drink-${definition.id}`);
    this.say('STORE_SAY_THANKS');
    this.hintManager.show(food ? 'STORE_FOOD_HINT' : 'STORE_DRINK_HINT');
  }

  /** Vrai si un autre article de la même catégorie tourne déjà. */
  blocked(definition: ConsumableDefinition): boolean {
    const active = this.consumables.activeIn(definition.category);
    return !!active && active.id !== definition.id;
  }

  openCollection(): void {
    this.soundManager.playFX(Sound.Plop);
    this.router.navigate(['/collection']);
  }

  back(): void {
    this.soundManager.playFX(Sound.Plop);
    this.router.navigate(['/game']);
  }

  ngOnDestroy(): void {
    clearTimeout(this.lineTimer);
  }

  ngOnInit(): void {
    // Comme les autres écrans de jeu : y arriver directement doit charger la
    // partie, sinon le compte de gemmes reste à zéro.
    this.gameLoop.start();
  }
}
