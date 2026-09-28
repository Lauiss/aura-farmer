# Journal des modifications

Ce qui change dans AuraFarmer, du plus récent au plus ancien.

Une entrée par **livraison** — c'est-à-dire par poussée sur `main`, qui déploie
d'un coup sur itch.io et sur GitHub Pages. Les dates sont celles du déploiement,
et le numéro celui de `package.json`, affiché dans les options du jeu.

Trois rubriques, et rien d'autre : **Ajouté** pour ce qui n'existait pas,
**Modifié** pour ce qui existait et se comporte autrement, **Corrigé** pour ce
qui était cassé. Ce qui ne se voit pas en jouant (déplacements de fichiers,
refactorisations) va en fin d'entrée sous *Dans le code*, pour ne pas noyer le
reste.

---

## 0.2.0 — 2026-09-28

### Ajouté

- **Une collection de dix montres**, de la Cas.io à la Philippe Psartek. Elles
  s'achètent en gemmes chez John Pork, de 200 à 150 000, et tombent très
  rarement d'un coffre. Réunies, elles multiplient la production par **7,4**.
  C'est la première chose du jeu qu'on peut **viser** : jusqu'ici les gemmes ne
  servaient qu'à racheter des coffres.
- **Achat groupé de coffres** : le bouton du marchand demande d'abord combien,
  avec un curseur, des paliers ronds et un « max ». Acheter n'ouvre plus le
  coffre dans la foulée — les coffres vont en réserve, que « tout ouvrir » vide
  d'un coup.
- **Un écran de fin** : « merci d'avoir joué », le temps de la partie en
  `HH:MM:SS`, et un récapitulatif (boss, statuettes, reliques, montres). Il
  attend le bon moment selon la fin choisie : garder la lettre clôt l'histoire
  tout de suite, la brûler ouvre un dernier combat.
- **Deux succès** : première montre, et les dix réunies.
- **Le numéro de version** s'affiche dans les options, sous le temps de jeu.

### Modifié

- **Chaque créature a désormais son propre regard.** Les vingt boss portaient
  les deux mêmes yeux ronds, de face, à la même taille. Le pigeon et l'oie ont
  maintenant les yeux sur les côtés du crâne, le requin et le dauphin l'œil noir
  du prédateur, la crevette et la grenouille des yeux pédonculés, le capybara la
  paupière lourde de celui qui dort debout.
- **Les décors de fond sont en 2D**, en aplats francs — sans dégradé ni halo.
  Ils étaient une seconde scène 3D peinte à chaque image alors que trois des
  cinq n'étaient déjà que des silhouettes plates.
- **Les boss occupent enfin leur vignette.** Ils n'en remplissaient que 58 % et
  flottaient au milieu du vide.
- **Le boss secret est atteignable.** Son débit conseillé était de 10 Qi/s, soit
  soixante mille fois Chad : ce n'était pas un combat difficile, c'était un mur.
  Il est à **3 Qa/s**. Sa difficulté une fois sur place est inchangée.
- **Piccolo s'appelle Antennino Verdolino**, et le mot « Namek » a disparu du
  jeu — on s'éloigne d'une franchise dont il était le sosie. Les parties en
  cours gardent leur victoire, leur relique et leur progression.
- **La montre « Hublot » s'appelle « Hubelot »** : c'était la seule marque
  réelle d'une série qui ne contient sinon que des déformations.

- **La carte des améliorations est débarrassée.** Plus de trame de points sur
  toute la surface, plus de compteur de gemmes (rien ne s'y achète en gemmes),
  plus de boutons ×1, −, + et recentrer. Il ne reste que le retour et l'aura,
  centrée. On glisse pour se déplacer, la molette zoome, et `Maj + clic` achète
  le maximum — c'est désormais le seul achat groupé.
- **La carte s'ouvre plus large** : les quatre catégories tombaient chacune dans
  un coin et l'écran était aux trois quarts vide. On voit maintenant d'emblée
  qu'il y a quelque chose à explorer.
- **Une icône par catégorie** : trois des six montraient la même vignette de
  bâtiment.
- **L'arbre de compétences est réorganisé en étoile** : cinq branches réparties
  à angle égal autour du moyai, chacune s'étirant vers l'extérieur. C'était un
  assemblage de directions cardinales avec la boutique repoussée dans un coin,
  et ça se lisait comme cinq mises en page cousues ensemble.
- **Son en-tête reprend celui du marchand** : retour à gauche, titre au centre
  en capitales, aura à droite.
- **Une amélioration s'ouvre en maxant la précédente**, et non plus en en
  achetant un seul exemplaire. On ne peut plus traverser une chaîne pour
  atteindre au plus vite la dernière, la plus puissante, sans finir les autres.
  La tuile suivante reste visible, grisée, avec la raison écrite dessous. Les
  améliorations déjà possédées ne sont jamais reprises.

### Corrigé

- **Les derniers boss étaient inatteignables sur itch.io.** À vingt et un boss,
  la liste dépassait de l'écran, et le défilement du document est coupé dans
  l'iframe d'itch : Chad et le boss secret ne pouvaient pas être atteints. La
  liste défile désormais dans sa propre zone. Le bug ne se voyait pas dans un
  navigateur ordinaire.
- **Trois reliques s'affichaient en couronne.** La pastèque, la noix de coco et
  la peau de banane n'avaient aucun modèle et retombaient sur celui de Chad.
  Elles ont le leur.
- **Le soleil du décor « crépuscule » passait devant les montagnes.** Il se
  couche maintenant derrière la crête, et il est décalé pour ne plus être caché
  par la statue.
- **Deux autres reliques étaient des bouche-trous** : la glace était un cube
  unique parfaitement régulier, le pneu était couché au point de se confondre
  avec le halo de la relique.

### Dans le code

- `backgrounds.ts` ne contenant plus que des données, il passe de
  `three/models/` à `assets/static/`. `createRandom` quitte la boîte à outils 3D
  pour `utils/random.ts`, les décors 2D s'en servant sans avoir besoin de Three.
- Le renommage d'un boss impose une **migration de sauvegarde** : son
  identifiant vit dans les victoires, le brainrot porté et les scènes vues. Les
  tables sont dans `BattleManager` et `CinematicManager`.

---

## 0.1.0 — 2026-09-27, première mise en ligne publique

Version publiée sur itch.io et GitHub Pages, et jouée par les premiers joueurs.

### Ajouté

- **Cinématiques** : l'introduction au premier « Jouer », une scène de victoire
  par boss, le final sur Chad, la lettre du père et **deux fins** — la garder ou
  la brûler, ce dernier choix ouvrant un **boss secret** et son succès.
- **Quêtes** : quinze chapitres d'histoire joués dans l'ordre, et trois
  quotidiennes tirées par la date.
- **Mode calme** dans les options : le jeu se joue à l'identique mais cesse de
  clignoter. Les cinématiques continuent de se jouer, figées au lieu d'animées.
- **Appels pendant le doomscrolling** : John Pork, le Colonel WhatsApp et Larry
  le malicieux, avec sept secondes pour décrocher ou raccrocher.
- **Casino** (roulette et crash en gemmes), **compagnons** autour de la statue,
  **consommables** (canettes et plats), **reliques** rendues par les boss.
- **Vingt boss**, plus le secret.
- Toute l'interface en **anglais** comme en français, les cent six succès
  compris.

### Modifié

- **Refonte du combat.** Marteler MOG gagnait presque autant que jouer les
  intentions : trois leviers relient désormais la défense à l'attaque, et
  l'écart passe de 3 à 15 points.
- **Seconde phase** pour deux boss, sous la moitié de leur vie.
- **Prix indexés sur les multiplicateurs** : ils étaient absolus quand les
  revenus sont multiplicatifs, si bien qu'en fin de partie tout devenait
  gratuit.
- Les modèles d'animation, les accessoires et la garde-robe passent en 3D.

### Corrigé

- **Plus aucune image 2D** de l'ancienne version : tout est rendu depuis les
  modèles.
- La progression pouvait afficher **101 %** dans l'arbre de compétences.
- Toutes les cinématiques se rejouaient sur une partie déjà entamée.
- Le plafond de 60 images par seconde en rendait 30.

---

## Avant la 0.1.0

Développement initial, d'octobre 2025 à septembre 2026 : le clicker, l'arbre de
compétences, le doomscrolling, les battles d'aura, le gacha, la garde-robe, les
décors et le marchand. Le détail est dans l'historique Git — ce journal
commence à la mise en ligne publique.
