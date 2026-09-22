# AuraFarmer

Clicker incrémental Angular. Prototype : https://lauiss.itch.io/chad-aura-farmer

## Stack

- Angular 22 (standalone, signals, `ChangeDetectionStrategy.Eager` posé par la migration v22)
- `@ngx-translate/core` 18 — configuré par `provideTranslateService` + `provideTranslateHttpLoader` dans [app.config.ts](src/app/app.config.ts) (plus de `TranslateModule.forRoot`)
- Three.js 0.186 pour la 3D, style low poly
- SCSS avec `@use '.../variables' as *` (les `@import` Sass sont bannis, dépréciés en Dart Sass 3)
- Tests : Karma/Jasmine (nécessite Chrome). `npx tsc -p tsconfig.spec.json --noEmit` suffit pour un typecheck.

## Architecture

- `src/app/pages/` — `landing-page` (menu) et `game-page` (le jeu)
- `src/app/components/` — briques UI, toutes standalone
- `src/app/services/` — managers en singletons `providedIn: 'root'` (aura, shop, save, sound, settings, achievements, modal)
- `src/app/three/` — tout le Three.js hors composants Angular
  - `geometry.ts` — boîte à outils partagée par tous les modèles (`loft`, `chisel`, `createRandom`, `mesh`, `disposeObject`)
  - `models/` — un fichier par modèle, ne contenant que ses propres cotes
- `src/assets/static/` — données de jeu en dur (items, upgrades, achievements)
- `src/assets/i18n/` — `fr.json` / `en.json`, **mêmes clés des deux côtés**

### Conventions

- Les modales passent par `ModalManager.open(Component, data?, size?)` + `<app-modal-host>` (monté dans [app.html](src/app/app.html)). La taille est normalisée (`sm` 24rem, `md` 34rem — le défaut, `lg` 48rem, `xl` 66rem) pour que deux panneaux de même nature s'affichent à la même largeur.
- `ModalManager` est une **pile** : `open()` empile par-dessus ce qui est affiché et `close()` ne retire que le panneau du dessus (`closeAll()` vide tout). `modalData()` et `currentComponent()` renvoient le sommet de la pile. Le `z-index` est calculé par le gabarit à partir du rang, il n'est pas en dur dans le SCSS.
- Un élément en `position: fixed` placé **dans** une modale se positionne par rapport à elle et non par rapport à l'écran : `.modal-content` porte un `transform`, qui devient son bloc conteneur. Ce qui doit se caler sur l'écran se monte au niveau de l'application, comme `<app-moyai-hint>`.
- La sauvegarde est du localStorage via `SaveManager`; clé de partie `AURA_FARMER_SAVE`, clé d'options `SaveLocation.Settings`.
- Toute boucle d'animation Three.js tourne dans `NgZone.runOutsideAngular` pour ne pas déclencher la détection de changements à 60 fps.

## 3D

- [models/moyai.ts](src/app/three/models/moyai.ts) — `createMoyai()` ne modélise **que la tête**, coupée net juste sous la mâchoire (pas de torse, de bras ni de socle : c'est la silhouette du 🗿 qui est voulue). Elle est construite en lissant des sections horizontales (`loft`) : chaque section pilote sa largeur et ses profondeurs avant/arrière **indépendamment**, ce qui dessine le profil moai (front fuyant, arcade en surplomb via deux sections à 0.06 d'écart, menton saillant, nez dépassant le plan du visage, lèvres pincées projetées, oreilles oblongues).
  - L'enroulement des triangles compte : dans `loft`, l'ordre est anti-horaire vu de l'extérieur, sinon les normales rentrent et le modèle se rend à l'envers (les faces avant sont culled).
  - Bruit déterministe (seed) : même graine, même statue. `disposeObject()` libère le GPU.
- [moyai-viewer.ts](src/app/components/moyai-viewer/moyai-viewer.ts) — scène autonome, `TrackballControls` (rotation libre sur tous les axes, pan désactivé), rotation lente automatique tant que l'utilisateur n'a pas touché à la statue.
- [models/trophy.ts](src/app/three/models/trophy.ts) — `createTrophy({ unlocked })`, ambré ou gris, pour les succès. Ses anses passent par une `ExtrudeGeometry` : `loft` n'empile que selon Y et ne sait pas suivre une courbe.
- [snapshot.ts](src/app/three/snapshot.ts) — rend un modèle **une fois** en data URL. Les icônes de succès passent par là plutôt que par un canvas vivant chacune : un navigateur ne tient qu'une poignée de contextes WebGL (~16) et la liste en affiche des dizaines. Le cache est dans [TrophyIcons](src/app/services/trophy-icons.ts).
- Tout composant Three.js doit appeler `forceContextLoss()` en plus de `dispose()` s'il peut être monté et démonté plusieurs fois.
- Piège matériau : un `metalness` élevé sans carte d'environnement rend presque noir — un métal ne renvoie que son environnement. Garder `metalness` bas et faire porter l'éclat par la couleur de base.
- Toutes les générations 3D suivantes doivent rester **low poly** et `flatShading: true`.

## Direction artistique

**Le design system de `variables.scss` est en suspens** : l'utilisateur ne l'aime pas et veut le reprendre lui-même. Ne pas investir dedans, ne pas repeindre le jeu à partir de ces tokens tant qu'il n'a pas tranché.

En attendant, [menu-theme.scss](src/menu-theme.scss) porte **à part** les tokens du menu et des modales : gris très sombre `#121211`, texte blanc crème `#ede6d6`, accent ambré `#e8b84b`. Ni noir pur ni blanc pur — le contraste maximal fait vibrer les arêtes de la statue. Tout ce qui habille l'accueil et les modales pioche là, et nulle part ailleurs.

Les polices personnalisées (DynaPuff, Fugaz One) ont été retirées : elles ne collaient pas au jeu. `styles.scss` s'en tient à une pile système en attendant que la typo soit choisie, sur la base de 16px du navigateur.

Sur le sombre, le texte clair paraît optiquement plus maigre qu'il ne l'est : le menu utilise `$menu-weight` (500) et `$menu-weight-strong` (600) plutôt que le 400 par défaut, et les niveaux de texte secondaires sont à 74 % / 46 % d'opacité, pas plus bas.

Les tailles passent toutes par l'échelle de `menu-theme.scss` (`$menu-size-title` … `$menu-size-small`) : pas de `font-size` en dur dans les composants du menu, sinon l'échelle décroche au premier ajustement.

L'écran d'accueil est fixé : pas de logo, menu en texte seul, avec un chevron `>` qui apparaît au survol et au focus clavier pour marquer la ligne courante (variante `ghost` de `app-action-btn` ; la variante `solid` conserve le style d'origine utilisé dans le jeu).

Les modales suivent le même thème, **toutes** — y compris celles du jeu (progression hors-ligne, succès). `app-modal-host` porte la couleur de texte du panneau, ce dont héritent les composants qu'il héberge.

## Vérifier une modification 3D sans navigateur

Aucun Chrome n'est installé. `scratchpad/render.mjs` (recréable) compile `three/` avec `npx tsc --ignoreConfig` puis rastérise les triangles en PPM → `magick` pour voir la silhouette. Penser à suffixer les imports en `.js` dans la sortie, Node en ESM ne les résout pas sans extension.
