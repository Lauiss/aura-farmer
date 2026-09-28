import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CollectionManager } from '../../services/collection-manager';
import { ModelIcons } from '../../services/model-icons';
import { Sound, SoundManager } from '../../services/sound-manager';
import { GameLoop } from '../../services/game-loop';
import { SaveLocation, SaveManager } from '../../services/save-manager';
import {
  CollectibleDefinition,
  RARITIES,
  RARITY_BONUS,
  RARITY_COLORS,
  Rarity,
  RelicDefinition,
  WatchDefinition
} from '../../../assets/static/collectibles';

/**
 * Collection : ce que l'on possède, et rien d'autre. Les statuettes, dont on
 * peut porter la matière sur la statue du jeu **d'ici même** comme depuis la
 * garde-robe, et les reliques sacrées.
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
  private readonly saveManager = inject(SaveManager);

  /**
   * Sections repliées. On retient les **fermées** et non les ouvertes : une
   * rareté ajoutée plus tard s'ouvre alors d'elle-même, au lieu d'arriver
   * fermée parce qu'elle ne figurait pas dans la liste.
   *
   * C'est une préférence d'affichage, pas de la progression : elle a sa propre
   * clé, hors de la sauvegarde de partie.
   */
  private readonly closed = signal<Set<string>>(
    new Set(this.saveManager.loadProgress(SaveLocation.Ui)?.collectionClosed ?? [])
  );

  isOpen(section: string): boolean {
    return !this.closed().has(section);
  }

  onToggle(section: string, event: Event): void {
    const open = (event.target as HTMLDetailsElement).open;
    this.closed.update(list => {
      const next = new Set(list);
      if (open) next.delete(section);
      else next.add(section);
      return next;
    });
    this.saveManager.saveProgress(SaveLocation.Ui, {
      ...(this.saveManager.loadProgress(SaveLocation.Ui) ?? {}),
      collectionClosed: [...this.closed()]
    });
  }

  /** Statuettes obtenues dans une rareté, pour le compte du titre replié. */
  ownedIn(rarity: Rarity): number {
    return this.collection.catalogue.filter(
      collectible => collectible.rarity === rarity && this.collection.isOwned(collectible.id)
    ).length;
  }

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

  /** Bonus cumulé des montres, au même format que celui des reliques. */
  readonly watchMultiplier = computed(() => Number(this.collection.watchBonus().toFixed(2)));

  /**
   * La montre s'affiche toujours, obtenue ou non : elle se vend, et un
   * catalogue dont on ne voit pas la marchandise ne donne envie de rien.
   */
  watchFigure(watch: WatchDefinition): string {
    return this.modelIcons.watch(watch.id);
  }

  /** Relique trouvée : sa figure. Sinon le point d'interrogation. */
  relicFigure(relic: RelicDefinition): string {
    return this.collection.isRelicOwned(relic.id) ? this.modelIcons.relic(relic.id) : this.questionIcon;
  }

  figure(collectible: CollectibleDefinition): string {
    return this.collection.isOwned(collectible.id) ? this.modelIcons.moyaiSkin(collectible.id) : this.questionIcon;
  }

  /**
   * Porte la matière d'une statuette, ou revient à la pierre en touchant
   * celle qui est déjà portée — le même geste que dans la garde-robe.
   */
  wear(collectible: CollectibleDefinition): void {
    this.collection.applySkin(this.collection.skin() === collectible.id ? null : collectible.id);
    this.soundManager.playFX(Sound.Plop);
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
