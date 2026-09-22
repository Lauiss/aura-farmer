import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SpinCombo } from '../../services/spin-combo';

/**
 * Affichage du combo de rotation : un gros multiplicateur qui gonfle avec
 * l'élan, avec un palier nommé pour que le joueur voie qu'il fait bien.
 */
@Component({
  selector: 'app-combo-meter',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './combo-meter.html',
  styleUrl: './combo-meter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComboMeter {

  readonly combo = inject(SpinCombo);

  /** Visible dès que le combo dépasse le simple. */
  readonly active = computed(() => this.combo.multiplier() > 1);

  /** Palier, qui commande à la fois le libellé et l'intensité visuelle. */
  readonly tier = computed(() => {
    const value = this.combo.multiplier();
    if (value >= 3) return 'ascended';
    if (value >= 2.2) return 'cracked';
    if (value >= 1.6) return 'locked';
    return 'warm';
  });

  readonly tierLabel = computed(() => {
    switch (this.tier()) {
      case 'ascended': return 'COMBO_ASCENDED';
      case 'cracked': return 'COMBO_CRACKED';
      case 'locked': return 'COMBO_LOCKED_IN';
      default: return 'COMBO_WARMING';
    }
  });

  /** Affiché avec une virgule décimale, à la française. */
  readonly display = computed(() => this.combo.multiplier().toFixed(1));
}
