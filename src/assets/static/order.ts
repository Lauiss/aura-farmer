/**
 * Ordre d'affichage des achats : toujours du moins cher au plus cher.
 *
 * La chaîne de prérequis suit l'**ordre de la liste** (`ShopManager
 * .upgradeRequirements`) et non les identifiants : trier par prix suffit donc
 * à ce que le joueur déroule toujours la dépense la plus abordable d'abord,
 * sans toucher aux `id`. Les sauvegardes retrouvent chaque élément par son
 * `id`, elles ne souffrent pas du changement d'ordre.
 *
 * Le tri se fait **sur place** : les listes sont exportées telles quelles et
 * partagées par référence, renvoyer une copie laisserait les consommateurs
 * sur l'ancien ordre.
 */
export function sortByPrice<T extends { price: number }>(list: T[]): T[] {
  return list.sort((a, b) => a.price - b.price);
}
