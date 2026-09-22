import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CosmeticId } from '../../three/models/cosmetics';
import { WardrobeManager } from '../../services/wardrobe-manager';
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
  private readonly soundManager = inject(SoundManager);

  toggle(id: CosmeticId): void {
    this.wardrobe.toggle(id);
    this.soundManager.playFX(Sound.Plop);
  }

  /** Clé de traduction du nom d'un accessoire. */
  labelKey(id: CosmeticId): string {
    return `COSMETIC_${id.toUpperCase()}`;
  }
}
