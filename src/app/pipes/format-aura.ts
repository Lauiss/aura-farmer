import { Pipe, PipeTransform } from '@angular/core';

/**
 * Abrège un montant d'aura : 1 234 567 devient « 1.23 M ».
 *
 * Il vit dans son propre fichier et non dans la page de jeu : les données
 * statiques des succès s'en servent, ce qui refermait un cycle d'imports entre
 * la page, les succès et tout ce qui les charge.
 */
@Pipe({
  name: 'formatAura',
  standalone: true
})
export class FormatAuraPipe implements PipeTransform {
  transform(value: number): string {
    const absValue = Math.abs(value);

    if (absValue >= 1e12) {
      return (value / 1e12).toFixed(2).replace(/\.00$/, '') + ' T';
    } else if (absValue >= 1e9) {
      return (value / 1e9).toFixed(2).replace(/\.00$/, '') + ' B';
    } else if (absValue >= 1e6) {
      return (value / 1e6).toFixed(2).replace(/\.00$/, '') + ' M';
    } else if (absValue >= 1e3) {
      return (value / 1e3).toFixed(2).replace(/\.00$/, '') + ' k';
    } else if (absValue >= 1) {
      return value.toFixed(2).replace(/\.00$/, '');
    }
    return value.toFixed(2);
  }
}
