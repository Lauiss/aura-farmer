import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SpinCombo } from '../../services/spin-combo';
import { CritStreak } from '../../services/crit-streak';

/** Paliers du combo : seuil, clé de libellé et couleur. */
interface Tier {
  from: number;
  key: string;
  color: string;
}

/**
 * Les paliers montent jusqu'à ×10, seuil auquel l'écran passe en « go fast » :
 * le dernier palier et l'emballement de l'écran se déclenchent ensemble, pour
 * que le joueur relie les deux.
 */
const TIERS: readonly Tier[] = [
  { from: 1, key: 'COMBO_WARMING', color: '#e8b84b' },
  { from: 1.6, key: 'COMBO_LOCKED_IN', color: '#ffd166' },
  { from: 2.2, key: 'COMBO_CRACKED', color: '#ff9f45' },
  { from: 3, key: 'COMBO_ASCENDED', color: '#ff6b3d' },
  { from: 6, key: 'COMBO_NUCLEAR', color: '#ff4d6d' },
  { from: 10, key: 'COMBO_GODLIKE', color: '#c77dff' }
];

/**
 * Affichage du combo : un gros multiplicateur, son palier nommé, et une jauge
 * qui dit ce qu'il reste à parcourir avant le suivant.
 *
 * Pas de halo derrière le chiffre : il le noyait au lieu de le mettre en
 * avant. Le juice vient du mouvement — un à-coup à chaque palier franchi — et
 * de la jauge, pas d'un effet lumineux permanent.
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
  readonly streak = inject(CritStreak);

  /** Visible dès que le combo dépasse le simple, ou qu'une série court. */
  readonly active = computed(() => this.combo.multiplier() > 1 || this.streak.active());

  /** Rang du palier courant dans `TIERS`. */
  readonly tierIndex = computed(() => {
    const value = this.combo.multiplier();
    let index = 0;
    for (let i = 0; i < TIERS.length; i++) {
      if (value >= TIERS[i].from) index = i;
    }
    return index;
  });

  readonly tier = computed(() => TIERS[this.tierIndex()]);
  readonly tierLabel = computed(() => this.tier().key);
  readonly tierColor = computed(() => this.tier().color);
  readonly isTop = computed(() => this.tierIndex() === TIERS.length - 1);

  /**
   * Avancement vers le palier suivant, de 0 à 1. Au dernier palier la jauge
   * reste pleine : il n'y a plus rien au-dessus.
   */
  readonly toNextTier = computed(() => {
    const index = this.tierIndex();
    if (index === TIERS.length - 1) return 1;
    const from = TIERS[index].from;
    const to = TIERS[index + 1].from;
    return Math.min(1, Math.max(0, (this.combo.multiplier() - from) / (to - from)));
  });

  /** Taille du chiffre, qui enfle avec le palier. */
  readonly valueSize = computed(() => `${3.2 + this.tierIndex() * 0.24}rem`);

  /** Affiché avec une décimale : le dixième bouge, donc il se voit vivre. */
  readonly display = computed(() => this.combo.multiplier().toFixed(1));
}
