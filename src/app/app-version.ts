import { version } from '../../package.json';

/**
 * Version du jeu, affichée dans les options.
 *
 * Elle est lue **depuis `package.json`** et non recopiée dans une constante :
 * deux endroits à tenir pour un même numéro finissent toujours par diverger, et
 * c'est le genre d'écart qu'on ne remarque qu'en lisant un rapport de bug qui
 * mentionne une version qui n'a jamais existé.
 *
 * L'import nommé est **élagué** : seule la chaîne de version atteint le bundle,
 * rien des scripts ni des dépendances de développement (vérifié en cherchant
 * `karma`, `devDependencies` et `printWidth` dans le fichier livré — aucune
 * occurrence). Ce module reste le seul à importer le JSON, pour que cette
 * dépendance tienne à un seul endroit.
 *
 * Elle s'incrémente **à chaque fusion sur `main`**, c'est-à-dire à chaque
 * déploiement, et l'entrée correspondante du [journal](../../CHANGELOG.md)
 * porte le même numéro.
 */
export const APP_VERSION: string = version;
