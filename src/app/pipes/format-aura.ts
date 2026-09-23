import { Pipe, PipeTransform } from '@angular/core';

/**
 * Suffixes de l'échelle courte, un par puissance de mille. La liste va jusqu'au
 * vigintillion : passé le trillion, s'en tenir au « T » faisait afficher des
 * valeurs comme « 40159748907.30 T ».
 */
const SUFFIXES = [
  '', 'k', 'M', 'B', 'T',
  'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod',
  'Vg'
];

/**
 * Abrège un montant d'aura : 1 234 567 devient « 1.23 M ». Au-delà du dernier
 * suffixe connu, la notation scientifique prend le relais plutôt que de laisser
 * la mantisse s'allonger indéfiniment.
 *
 * Il vit dans son propre fichier et non dans la page de jeu : les données
 * statiques des succès s'en servent, ce qui refermait un cycle d'imports entre
 * la page, les succès et tout ce qui les charge.
 */
export function formatAura(value: number): string {
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';

  const absValue = Math.abs(value);
  if (absValue < 1) return value.toFixed(2);
  // 999.996 s'arrondirait à « 1000 » : il passe au kilo avec le reste.
  if (absValue < 999.995) return value.toFixed(2).replace(/\.00$/, '');

  let tier = Math.floor(Math.log10(absValue) / 3);
  // L'arrondi à deux décimales peut faire basculer 999.996 k en « 1000 k » :
  // on passe alors au suffixe suivant.
  if (Number((absValue / Math.pow(1000, tier)).toFixed(2)) >= 1000) tier++;

  if (tier >= SUFFIXES.length) {
    return value.toExponential(2).replace('e+', 'e');
  }

  const scaled = value / Math.pow(1000, tier);
  return scaled.toFixed(2).replace(/\.00$/, '') + ' ' + SUFFIXES[tier];
}

@Pipe({
  name: 'formatAura',
  standalone: true
})
export class FormatAuraPipe implements PipeTransform {
  transform(value: number): string {
    return formatAura(value);
  }
}
