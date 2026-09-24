import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CosmeticId } from '../../three/models/cosmetics';
import { WardrobeManager } from '../../services/wardrobe-manager';
import { BackgroundManager } from '../../services/background-manager';
import { BackgroundId } from '../../three/models/backgrounds';
import { Sound, SoundManager } from '../../services/sound-manager';
import { BattleManager } from '../../services/battle-manager';
import { BossId } from '../../../assets/static/bosses';
import { CollectionManager } from '../../services/collection-manager';
import { ModelIcons } from '../../services/model-icons';
import { RARITY_COLORS } from '../../../assets/static/collectibles';

/**
 * Garde-robe : tout ce que le joueur peut arborer se règle ici — accessoires,
 * matière de la statue, décor affiché, et brainrots ramenés des battles. La
 * matière se choisissait dans la collection, qui ne fait plus que montrer ce
 * qu'on possède. Les compagnons n'y sont
 * pas : ils restent affichés en toutes circonstances. Le port des brainrots vivait
 * dans l'écran des battles, où l'on vient se battre et non s'habiller.
 */
@Component({
  selector: 'app-wardrobe',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './wardrobe.html',
  styleUrl: './wardrobe.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Wardrobe {

  readonly wardrobe = inject(WardrobeManager);
  readonly backgrounds = inject(BackgroundManager);
  readonly battles = inject(BattleManager);
  readonly collection = inject(CollectionManager);
  private readonly modelIcons = inject(ModelIcons);
  private readonly soundManager = inject(SoundManager);

  readonly rarityColors = RARITY_COLORS;

  /** Statuettes obtenues, dont on peut porter la matière. */
  readonly skins = computed(() =>
    this.collection.catalogue.filter(collectible => this.collection.isOwned(collectible.id))
  );

  skinIcon(id: string): string {
    return this.modelIcons.moyaiSkin(id);
  }

  /** Porte une matière, ou revient à la pierre avec `null`. */
  selectSkin(id: string | null): void {
    this.collection.applySkin(this.collection.skin() === id ? null : id);
    this.soundManager.playFX(Sound.Plop);
  }

  toggle(id: CosmeticId): void {
    this.wardrobe.toggle(id);
    this.soundManager.playFX(Sound.Plop);
  }

  /** Clé de traduction du nom d'un accessoire. */
  labelKey(id: CosmeticId): string {
    return `COSMETIC_${id.toUpperCase()}`;
  }

  backgroundKey(id: BackgroundId): string {
    return `BACKGROUND_${id.toUpperCase()}`;
  }

  /** Brainrots vaincus, donc portables. */
  readonly defeated = computed(() =>
    this.battles.catalogue.filter(boss => this.battles.isDefeated(boss.id))
  );

  /** Porte un brainrot, ou revient à la statue d'origine avec `null`. */
  selectBrainrot(id: BossId | null): void {
    this.battles.wear(this.battles.worn() === id ? null : id);
    this.soundManager.playFX(Sound.Plop);
  }

  /** Choisit un décor, ou revient au fond uni en touchant celui déjà affiché. */
  selectBackground(id: BackgroundId | null): void {
    this.backgrounds.select(this.backgrounds.selected() === id ? null : id);
    this.soundManager.playFX(Sound.Plop);
  }
}
