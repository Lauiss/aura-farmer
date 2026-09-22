# AuraFarmer

Clicker incrémental Angular. Prototype : https://lauiss.itch.io/chad-aura-farmer

## Stack

- Angular 22 (standalone, signals, `ChangeDetectionStrategy.Eager` posé par la migration v22)
- `@ngx-translate/core` 18 — configuré par `provideTranslateService` + `provideTranslateHttpLoader` dans [app.config.ts](src/app/app.config.ts) (plus de `TranslateModule.forRoot`)
- Three.js 0.186 pour la 3D, style low poly
- SCSS avec `@use '.../variables' as *` (les `@import` Sass sont bannis, dépréciés en Dart Sass 3)
- Tests : Karma/Jasmine (nécessite Chrome). `npx tsc -p tsconfig.spec.json --noEmit` suffit pour un typecheck.

## Architecture

- `src/app/pages/` — `landing-page` (menu), `game-page` (la statue, les compteurs et les trois accès) et `shop-map` (la boutique en carte navigable)
- `src/app/components/` — briques UI, toutes standalone
- `src/app/services/` — managers en singletons `providedIn: 'root'` (aura, shop, save, sound, settings, achievements, modal)
- `src/app/three/` — tout le Three.js hors composants Angular
  - `geometry.ts` — boîte à outils partagée par tous les modèles (`loft`, `chisel`, `createRandom`, `mesh`, `disposeObject`)
  - `models/` — un fichier par modèle, ne contenant que ses propres cotes
- `src/assets/static/` — données de jeu en dur (items, upgrades, achievements)
- `src/assets/i18n/` — `fr.json` / `en.json`, **mêmes clés des deux côtés**

### Conventions

- Un bouton réduit à une icône passe par [`app-icon-btn`](src/app/components/icon-btn/icon-btn.ts), jamais par une image cliquable. Il réunit les quatre dispositifs qui rendent l'icône compréhensible : vrai `<button>`, `aria-label` traduit avec l'image en `alt=""`, libellé visible au survol **et au focus clavier**, et un cadre qui signale l'interactivité au repos. Ne pas remplacer ce libellé par un `title` natif : il n'apparaît jamais au clavier.

- Les modales passent par `ModalManager.open(Component, data?, size?)` + `<app-modal-host>` (monté dans [app.html](src/app/app.html)). La taille est normalisée (`sm` 24rem, `md` 34rem — le défaut, `lg` 48rem, `xl` 66rem) pour que deux panneaux de même nature s'affichent à la même largeur.
- `ModalManager` est une **pile** : `open()` empile par-dessus ce qui est affiché et `close()` ne retire que le panneau du dessus (`closeAll()` vide tout). `modalData()` et `currentComponent()` renvoient le sommet de la pile. Le `z-index` est calculé par le gabarit à partir du rang, il n'est pas en dur dans le SCSS.
- Un élément en `position: fixed` placé **dans** une modale se positionne par rapport à elle et non par rapport à l'écran : `.modal-content` porte un `transform`, qui devient son bloc conteneur. Ce qui doit se caler sur l'écran se monte au niveau de l'application, comme `<app-moyai-hint>`.
- La sauvegarde est du localStorage via `SaveManager`; clé de partie `AURA_FARMER_SAVE`, clé d'options `SaveLocation.Settings`.
- Toute boucle d'animation Three.js tourne dans `NgZone.runOutsideAngular` pour ne pas déclencher la détection de changements à 60 fps.
- La boucle de jeu (production passive, succès, sauvegarde) vit dans [`GameLoop`](src/app/services/game-loop.ts), **pas dans une page**. Une boucle attachée à `game-page` s'arrêterait dès qu'on passe à la boutique, et se rabonnerait à chaque retour en multipliant les gains.
- Tout ce que le jeu dit au joueur passe par [`HintManager`](src/app/services/hint-manager.ts), qui fait parler la tête de moyai en bas de l'écran : `show('CLÉ')` pour une indication, `announce({ titleKey, body, icon })` pour une annonce mise en avant comme un succès. Les messages s'enchaînent dans une file au lieu de s'écraser.
- Les succès **ne créent leur liste qu'une fois par session** (`GamePage` ne reconstruit que si elle est vide). La reconstruire à chaque montage de la page la remettait à l'état verrouillé, et le contrôle périodique les redébloquait tous en les annonçant à nouveau.

## 3D

- [models/moyai.ts](src/app/three/models/moyai.ts) — `createMoyai()` ne modélise **que la tête**, coupée net juste sous la mâchoire (pas de torse, de bras ni de socle : c'est la silhouette du 🗿 qui est voulue). Elle est construite en lissant des sections horizontales (`loft`) : chaque section pilote sa largeur et ses profondeurs avant/arrière **indépendamment**, ce qui dessine le profil moai (front fuyant, arcade en surplomb via deux sections à 0.06 d'écart, menton saillant, nez dépassant le plan du visage, lèvres pincées projetées, oreilles oblongues).
  - L'enroulement des triangles compte : dans `loft`, l'ordre est anti-horaire vu de l'extérieur, sinon les normales rentrent et le modèle se rend à l'envers (les faces avant sont culled).
  - Bruit déterministe (seed) : même graine, même statue. `disposeObject()` libère le GPU.
- [moyai-viewer.ts](src/app/components/moyai-viewer/moyai-viewer.ts) — scène autonome, `TrackballControls` (rotation libre sur tous les axes, pan désactivé), rotation lente automatique tant que l'utilisateur n'a pas touché à la statue.
- [models/trophy.ts](src/app/three/models/trophy.ts) — `createTrophy({ unlocked })`, ambré ou gris, pour les succès. Ses anses passent par une `ExtrudeGeometry` : `loft` n'empile que selon Y et ne sait pas suivre une courbe.
- [models/building.ts](src/app/three/models/building.ts) — `createBuilding()`, l'icône de la boutique et des catégories.
- [models/finger.ts](src/app/three/models/finger.ts) — l'index du « chut », joué par `MoyaiViewer.playShush()` quand on clique en possédant le Mewing. Le doigt est enfant de la statue, donc il la suit si elle tourne.
- [models/question-mark.ts](src/app/three/models/question-mark.ts) et [models/arrow.ts](src/app/three/models/arrow.ts) — le « ? » de ce qui n'est pas dévoilé et la flèche verte des améliorations. Plus aucune icône 2D dans la carte : tout passe par `ModelIcons`.
- [models/gear.ts](src/app/three/models/gear.ts) — `createGear()`, l'engrenage du bouton des options. Profil denté dessiné point par point puis extrudé ; garder le sommet de dent large devant les flancs, sinon la roue s'effile en étoile.
- [snapshot.ts](src/app/three/snapshot.ts) — rend un modèle **une fois** en data URL. Les icônes passent par là plutôt que par un canvas vivant chacune : un navigateur ne tient qu'une poignée de contextes WebGL (~16) et la liste des succès en affiche des dizaines. Le cache est dans [ModelIcons](src/app/services/model-icons.ts), avec repli sur les anciens PNG si WebGL manque.
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

## Règles de jeu à connaître

- **Combo de rotation** : faire tourner la statue alimente [`SpinCombo`](src/app/services/spin-combo.ts), qui monte un multiplicateur appliqué au clic suivant. Les tours complets comptent séparément en lacet et en tangage. Le service est nourri **hors de la zone Angular**, image par image, et n'écrit dans ses signaux que lorsque la valeur affichée change — sinon la détection de changements repartirait à 60 Hz. Le rapport passe par l'entrée `spinReporter` de `MoyaiViewer`, un simple rappel et non une sortie Angular, pour la même raison.
- **Chaîne d'améliorations** : sans champ `requires` explicite, chaque amélioration d'un article ouvre la suivante de sa liste (`ShopManager.upgradeRequirements`). La carte s'arrête à la première encore fermée.
- **Dévoilement de la carte** : `shop-map` s'arrête au **premier article non dévoilé**, affiché anonyme, et ne rend rien au-delà. Le joueur ne voit jamais plus loin que sa prochaine étape.
- **Garde-robe** : [`WardrobeManager`](src/app/services/wardrobe-manager.ts) croise les améliorations du moyai acquises avec les accessoires réellement modélisés, et retient lesquels sont portés (conservé à part de la progression). `MoyaiViewer` reçoit la liste par son entrée `cosmetics`. Le smoking et la cravate rapportent un **haut de buste** sous la mâchoire, la statue n'ayant pas de corps ; `JAW_BASE` et `BUST_BOTTOM` dans [cosmetics.ts](src/app/three/models/cosmetics.ts) en fixent les limites. Le bas du buste sortirait du cadre sans recul : l'écran de jeu augmente la distance de caméra quand l'un des deux est porté.
- **Structure de la carte** : une racine « Moyai », acquise d'entrée, d'où partent deux branches — « Enseignements », qui porte les articles, et « Gains passifs d'aura », annoncée mais close tant que les vêtements du moyai n'ont pas de modèle 3D. La racine et les catégories ne s'achètent pas : `price()` renvoie 0 pour elles, car le gabarit lit leur prix pour décider des classes.

- Chaque article a **25 niveaux** (`maxLevel`) et un `basePrice`. `ShopManager.getAmountToBuy` plafonne la quantité et `buyItem` s'arrête au plafond. Les seuils de `displayCondition` sont calés sur 10 niveaux, soit le même quart de parcours qu'avec les 200 d'avant : les changer sans les suivre casse la chaîne de révélation.
- Chaque amélioration s'achète **cinq fois** (`maxPurchases`), chaque exemplaire réappliquant son effet et renchérissant le suivant de 60 %.
- La sauvegarde ne restaure **que le niveau**, pas la valeur ni le facteur ni le prix : ce sont des réglages d'équilibrage, et les restaurer figeait chaque partie sur les réglages du jour de sa création. Le prix est recalculé par `priceAtLevel`.
- Les améliorations cosmétiques du moyai (habits, lunettes, couronne…) sont **retirées de l'affichage** de la carte, en attendant d'être modelées en accessoires 3D. Les données et le moteur restent en place dans `moyai-upgrades.ts` et `ShopManager`.

## Restes à nettoyer

`shop-list` n'est plus utilisé depuis que la boutique est passée en carte. `aura-btn` ne sert plus comme composant mais **son fichier porte les interfaces** `MoyaiUpgrades`, `Effect` et `MoyaiUpgradeSave`, dont dépendent `shop-manager` et `save-manager` : le supprimer casserait le modèle de données. Déplacer ces types avant toute suppression.

## Vérifier une modification 3D sans navigateur

Aucun Chrome n'est installé. `scratchpad/render.mjs` (recréable) compile `three/` avec `npx tsc --ignoreConfig` puis rastérise les triangles en PPM → `magick` pour voir la silhouette. Penser à suffixer les imports en `.js` dans la sortie, Node en ESM ne les résout pas sans extension.
