import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CosmeticId } from '../../three/models/cosmetics';
import { WardrobeManager } from '../../services/wardrobe-manager';
import { BackgroundManager } from '../../services/background-manager';
import { BackgroundId } from '../../three/models/backgrounds';
import { Sound, SoundManager } from '../../services/sound-manager';
import { BattleManager } from '../../services/battle-manager';
import { BossId } from '../../../assets/static/bosses';
import { StoreManager } from '../../services/store-manager';
import { CompanionId } from '../../../assets/static/companions';

/**
 * Garde-robe : tout ce que le joueur peut arborer se règle ici — accessoires,
 * compagnons, décor affiché, et brainrots ramenés des battles. Le port des brainrots vivait
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
  readonly store = inject(StoreManager);
  private readonly soundManager = inject(SoundManager);

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

  /** Compagnons acquis, qu'on peut sortir ou ranger. */
  readonly companions = computed(() =>
    this.store.companionCatalogue.filter(companion => this.store.hasCompanion(companion.id))
  );

  /**
   * Sortir ou ranger un compagnon ne change rien au bonus : il est acquis à
   * l'achat. Décorer ne doit pas coûter de production.
   */
  toggleCompanion(id: CompanionId): void {
    this.store.toggleCompanion(id);
    this.soundManager.playFX(Sound.Plop);
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
