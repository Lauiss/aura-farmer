import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CosmeticId } from '../../three/models/cosmetics';
import { WardrobeManager } from '../../services/wardrobe-manager';
import { BackgroundManager } from '../../services/background-manager';
import { BackgroundId } from '../../three/models/backgrounds';
import { Sound, SoundManager } from '../../services/sound-manager';

/** Garde-robe : on y choisit les accessoires que porte la statue. */
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

  /** Choisit un décor, ou revient au fond uni en touchant celui déjà affiché. */
  selectBackground(id: BackgroundId | null): void {
    this.backgrounds.select(this.backgrounds.selected() === id ? null : id);
    this.soundManager.playFX(Sound.Plop);
  }
}
