# Collection des Esprits — Fortnite Chapitre 7, Saison 4

Tracker de collection **100 % statique** pour tous les **esprits (Sprites) de Fortnite Chapitre 7
Saison 4 « Override »** : 162 entrées, 27 esprits et 7 familles de finitions, avec suivi
**possédé / maîtrisé** fiche par fiche, recherche, filtres, progression vers le palier
**70 maîtrises** et export / import JSON pour les sauvegardes.

Ouvrir `index.html`. Aucune étape de build, aucun serveur, aucun compte, aucune requête réseau.

---

## 1. Le catalogue (et comment il a été vérifié)

Dans le jeu, ces créatures s'appellent des **Sprites**. Le tracker utilise les noms du jeu et
accepte « esprit / esprits » comme synonyme de recherche.

| Famille de finition | Entrées | Remarques |
|---|---|---|
| Base (Normal) | 27 | chaque esprit en a une |
| Gold | 26 | 3× XP d'esprit sur les éliminations |
| Cheat Master | 26 | tous les Cheat Codes corrects |
| Loot Hacker | 26 | meilleures chances de butin sur les Loot Hacks |
| Bounty Hunter | 26 | butin d'esprit sur élimination ; XP uniquement par élimination |
| Trick or Treat | 26 | finition Fortnitemares ; bonbons dans les conteneurs |
| Quack | 5 | **récompenses de maîtrise**, pas des drops en partie |
| **Total** | **162** | |

Le seul esprit de base sans aucune finition est **Mega Man** (1 entrée). Les cinq esprits dotés
d'une forme Quack sont **Jonesy, Bush, Adventure, Spooky Dash et Klombo** : ils s'obtiennent en
maîtrisant 40 / 45 / 50 / 55 / 60 esprits, donc depuis l'onglet des récompenses de maîtrise.

Vérification croisée de plusieurs sources indépendantes (liste détaillée, avec l'usage fait de
chacune, dans `data/sources.json` et dans **Réglages → Catalogue & récompenses**) :

* [Sprite Checklist](https://spritechecklist.org/) — vérification fiche par fiche des 162 lignes et
  source des rendus embarqués.
* [VICE — All Fortnite Chapter 7 Season 4 Sprites](https://www.vice.com/en/article/all-fortnite-chapter-7-season-4-sprites-complete-list/)
  — total et découpage par collection (27 / 26 / 26 / 26 / 26 / 26 / 5 = 162).
* [Fortnite Wiki](https://fortnite.weirdgloop.org/w/Chapter_7:_Season_4) — dates de sortie, ajouts
  par mise à jour (v42.20 / v42.30 / v42.40), noms et raretés officiels.
* [Gaming Route](https://gamingroute.com/fortnite-sprites-list-chapter-7-season-4/) et
  [FN Sprite Tracker](https://fnsprites.app/sprites) — confirmation indépendante des 27 esprits
  obtenables en saison 4 et du total de 162.
* [Beebom](https://beebom.com/what-does-mastering-a-sprite-do-in-fortnite/) +
  [Game Rant](https://gamerant.com/fortnite-ch7-s4-quack-sprites-mastery-reward-how-to-get-effect/) +
  [IGN](https://www.ign.com/wikis/fortnite/Sprites_Checklist_and_Guide) — structure du track de
  maîtrise (Pixel Polli à 28, Quack à 40/45/50/55/60, style Mixtape Pixie à 70).
* [Beebom](https://beebom.com/how-to-get-obsession-one-wish-willow-sprite-in-fortnite/) /
  [Game Rant](https://gamerant.com/fortnite-blinky-sprite-location-how-to-get-effect-pac-man-ghost-locations/)
  — origines des collaborations (One Wish Willow = *Obsession* ; Blinky = PAC-MAN).

### Noms qui diffèrent selon les sources

Plusieurs trackers conservent des libellés **d'avant-sortie**. Ici, ce sont les noms du jeu qui
s'affichent, les anciens restant cherchables :

| Nom en jeu (utilisé ici) | Ancien libellé / avant-sortie |
|---|---|
| Jackrabbit | Jazz Jackrabbit |
| Bush | Bushranger / Bush Ranger |
| 8-Bit | 8-Bit Blaster |
| Adventure | The Adventurer |
| Crown | Victory Crown |

### Exclus volontairement

* Les esprits de la **saison 3** (Dream, Zero Point, Grim Reaper, Ironmouse, Pollo, Duck, Ghost,
  Fire, Water, Earth, Fishy…). Ils restent dans la collection d'un joueur mais ne sont plus
  équipables en saison 4 et n'alimentent pas son track de maîtrise.
* Les **placeholders jamais sortis** (Bullet, Cube, Head Shot, Meowscles, Squibbly).

### Ce qui reste incertain (dit ouvertement, rien n'est inventé)

1. Les **seuils des Quack (40/45/50/55/60)** et le **style à 70 maîtrises** sont rapportés de façon
   concordante par plusieurs guides, mais Epic ne les a pas documentés dans ses notes de patch.
   Ils sont donc implémentés « cohérents entre sources », pas « officiellement confirmés ».
2. Le **palier 16** (Cheat Code Locators) est donné en **×3 par IGN** et en **×2 par le Fortnite
   Wiki, Game Rant, Beebom et allthings.how**. C'est ×2 qui est retenu ; le doute est signalé dans
   l'app plutôt que masqué.
3. Les **taux d'apparition** ne sont pas publiés par Epic : aucun n'est affiché.
4. Le roster est figé à 162 lignes au patch **v42.40**, mais Epic pourrait encore le modifier avant
   la fin de saison (31 octobre 2026). Le catalogue porte donc une empreinte de version
   (`C7S4-2026-10-26`) et l'import signale les entrées inconnues de la version courante.
5. Il n'existe **pas de sous-famille « Jonesy Spirit »** dans le jeu. Jonesy compte exactement sept
   lignes : Base, Gold, Cheat Master, Loot Hacker, Bounty Hunter, Trick or Treat et Quack. Des noms
   comme « Golden Jonesy Spirit », « King of Cheats Jonesy Spirit » ou « Pirate of Plunder Jonesy
   Spirit » n'apparaissent dans aucune source vérifiée et n'ont donc pas été ajoutés.
6. L'orthographe **« Pixel Polli » / « Pixel Polly »** n'est pas tranchée : « Polli » est la forme
   la plus répandue et c'est celle utilisée.

---

## 2. Le track de maîtrise (35 paliers)

Le track de la saison 4 est **irrégulier** : les paliers ne sont pas répartis tous les 5 niveaux, et
certains intervalles sont légitimement vides. Ils sont affichés tels quels, sans rien inventer pour
combler les trous (29–34, 36–39, 41–44, 46–49, 51–54, 56–59, 61–69).

| Paliers | Récompense |
|---|---|
| 1, 5, 9, 13, 17, 20, 23, 27 | 40 000 XP de saison |
| 2, 10 | 3× Cheat Code Locator |
| 16 | 2× Cheat Code Locator *(IGN indique ×3)* |
| 21 | 1× Lucky Locator |
| 35 | Lucky Locator |
| 3, 6, 11, 15, 26 | 5 000 Sprite Dust |
| 4 | 4× Spicy Taco |
| 18 | 5× Spicy Taco |
| 7, 12, 24 | 2× Portable Extractor |
| 8, 19, 22 | 3× Extraction Accelerator |
| 14, 25 | 2× Llama Supply Drop |
| **28** | **Pixel Polli (tenue)** |
| 40 / 45 / 50 / 55 / 60 | Quack Jonesy / Bush / Adventure / Spooky Dash / Klombo |
| **70** | **style « Mixtape Pixie » (Pixel Polli)** |

### Sémantique de la maîtrise

* Un esprit est **maîtrisé** quand il atteint le **niveau 5 puis est extrait** (ou gagne avec lui
  équipé). Atteindre le niveau 5 sans extraction ne compte pas.
* **Maîtrisé implique possédé** : cocher *Maîtrisé* coche *Possédé*.
* **Décocher *Possédé* sur un esprit maîtrisé retire sa maîtrise** (avec un toast explicatif), car
  un esprit maîtrisé mais non possédé est contradictoire.
* Chaque entrée ne compte **qu'une fois** : le compteur est piloté par des identifiants uniques.
* **La collection démarre vide : 0 possédé, 0 maîtrisé.** Aucun esprit n'est pré-coché.
* Compteur configurable **« déjà maîtrisés hors tracker »**, à **0 par défaut**, dans
  **Réglages** ou via le lien `Ajuster` sous la barre. Il existe pour les joueurs qui avaient déjà
  maîtrisé des esprits avant d'utiliser le tracker : progression effective = `hors tracker +
  fiches cochées ici`. Il n'est jamais déduit du compte Epic et n'est jamais imposé.
* Palier distinct, souvent confondu : **extraire 30 esprits (à n'importe quel niveau)** débloque le
  Back Bling *Pixel Sprite Trainer*. C'est un palier d'**extraction**, pas de maîtrise : il ne fait
  pas partie de la barre de progression.

---

## 3. Utiliser le tracker

| Action | Comment |
|---|---|
| Marquer possédé / maîtrisé | cases sur chaque fiche (accessibles au clavier) |
| Recherche | champ de recherche ; `/` pour y aller, `Échap` pour vider |
| Alias de recherche | `golden` → finitions Gold, `jazz` → Jackrabbit, `esprit(s)` → tout, `8bit`, `bushranger`, `victory crown`, `pacman`, `sega`… |
| Filtres | Tous · Possédés · Manquants · Maîtrisés · Non maîtrisés · Possédés non maîtrisés (compteurs en direct) |
| Tri | Par famille (regroupe les finitions) · A→Z · Par statut |
| Exporter | **Exporter** → `fortnite-esprits-collection-AAAA-MM-JJ.json` |
| Importer | **Importer** (ou glisser un `.json` sur la page) |
| Réinitialiser | **Réglages → Réinitialiser la collection** (confirmation demandée) |

Recherche et filtres se combinent ; le nombre de résultats reste toujours visible.

### Barre de progression et rail de récompenses

* Barre horizontale avec repères des paliers, **paliers obtenus / suivant / verrouillés**
  distingués visuellement, prochaine récompense mise en avant et nombre d'esprits restants.
* Sur mobile : rail compact défilable + libellés, sans défilement horizontal de page.
* Le rail se **recentre automatiquement sur le palier suivant** après chaque changement et au
  rechargement (`Palier en cours →` refait le recentrage à la demande).

### Format d'export

```json
{
  "app": "fortnite-spirits-tracker",
  "schemaVersion": 2,
  "catalogVersion": "C7S4-2026-10-26",
  "exportedAt": "2026-10-26T18:42:11.012Z",
  "summary": { "owned": 3, "mastered": 2, "startingMastery": 0, "totalMastered": 2, "masteryTarget": 70, "catalogEntries": 162 },
  "settings": { "startingMastery": 0 },
  "spirits": {
    "jonesy-base": { "owned": true, "mastered": true },
    "klombo-quack": { "owned": true, "mastered": false }
  }
}
```

Seuls des identifiants stables et des drapeaux par identifiant sont exportés : aucune copie du
catalogue, aucun code. Les identifiants ne changent pas quand un nom d'affichage change, donc les
anciennes sauvegardes restent valables.

### Comportement de l'import

* Accepte le schéma v2 (ci-dessus), le schéma v1 (`"spirits": { "id": true }`) et un simple tableau
  d'identifiants — les fichiers déjà exportés continuent de fonctionner.
* Validation **avant** toute modification : JSON invalide ou structure illisible → message d'erreur
  explicite et **collection courante intacte**.
* Confirmation demandée avant d'écraser des données existantes, avec les deux comptes.
  Les confirmations utilisent un `<dialog>` intégré (pas `window.confirm`), donc elles
  fonctionnent aussi dans un iframe sandboxé.
* Les identifiants absents du catalogue courant sont **conservés** (et ré-exportés), listés dans le
  rapport d'import et dans les Réglages.
* Progression, compteurs, filtres et fiches se mettent à jour immédiatement, sans rechargement.

Tout est stocké dans `localStorage` sous la clé `fortnite-spirits-tracker.v2`. Si le stockage est
bloqué (navigation privée, iframe sandboxé), le site fonctionne quand même le temps de la session
et invite à exporter une sauvegarde.

---

## 4. Organisation du projet

```
index.html              structure (en-tête, progression, contrôles, collection, dialogues)
styles.css              système de design complet + responsive + prefers-reduced-motion
app.js                  état, recherche/filtres/tri, progression, export/import
data/catalog.js         GÉNÉRÉ, chargé par la page (fonctionne en file:// — pas de fetch/CORS)
data/spirits.json       GÉNÉRÉ, catalogue lisible en JSON
data/sources.json       sources + incertitudes documentées (alimente le panneau Réglages)
assets/sprites/*.webp   162 rendus embarqués (~2,0 Mo au total, ~10 Ko chacun)
assets/fonts/*.woff2    4 fichiers Anton + Barlow Condensed (auto-hébergés, ~87 Ko)
tools/build_catalog.py  régénère data/spirits.json + data/catalog.js
tools/test.js           suite de tests jsdom (152 assertions)
```

Pourquoi `data/catalog.js` **et** `data/spirits.json` : une page statique qui `fetch()` du JSON
casse quand on l'ouvre directement depuis le disque (`file://`). Le build émet le même catalogue
sous forme d'affectation JS, donc le site fonctionne depuis GitHub Pages, n'importe quel hébergeur
statique, une clé USB ou un double-clic — et `spirits.json` reste la source lisible et diffable.

### Régénérer le catalogue

```bash
python3 tools/build_catalog.py      # réécrit data/spirits.json + data/catalog.js
```

Modifier les tables `FAMILIES` / `VARIANTS` / `MASTERY_REWARDS` en haut du script, puis relancer.
Incrémenter `CATALOG_VERSION` quand le roster change, pour que les collections importées puissent
être rapprochées.

### Lancer les tests

```bash
npm install          # jsdom uniquement, en dev
node tools/test.js   # 152 assertions
```

---

## 5. Déploiement GitHub Pages

Le site est entièrement statique, rien à construire.

```bash
git add . && git commit -m "Tracker esprits Ch7 S4" && git push
```

Puis **Settings → Pages → Source : Deploy from a branch → `main` / `/ (root)`**. En cas d'hébergement
dans un sous-dossier (`user.github.io/repo/`), tous les chemins de `index.html` étant relatifs, rien
ne change. Aucune dépendance `node_modules` à l'exécution.

---

## 6. Images et licences

* Rendus des esprits : **162 fichiers WebP (~2,0 Mo au total)**, téléchargés depuis
  [spritechecklist.org](https://spritechecklist.org/) et **embarqués localement** dans
  `assets/sprites/` : aucun appel externe, aucun hotlink, aucune image cassée si un site tiers
  change. Chaque entrée garde un champ `imageSource` pointant vers l'origine.
* L'art lui-même est **© Epic Games** (et ses partenaires : SEGA, CAPCOM, Bandai Namco, Atlus,
  Activision, Focus Features/Blumhouse pour les esprits de collaboration). Inclus pour un suivi de
  collection personnel et non commercial ; à retirer en cas de redistribution commerciale.
* Si une image échoue, la fiche affiche un remplacement étiqueté (`.img-fallback` : « Image
  indisponible » + les initiales de l'esprit) au lieu d'une icône cassée — l'entrée n'est jamais
  masquée.
* Les polices **Anton** et **Barlow Condensed** sont auto-hébergées (`assets/fonts/`, licence SIL
  Open Font) afin qu'aucune requête vers Google Fonts ne soit nécessaire.

## 7. Accessibilité et performance

* Fonctionne aussi en `file://` (catalogue en `data/catalog.js`, pas de `fetch`/CORS).
* Repères sémantiques, lien d'évitement, `aria-label` / `aria-pressed` / `role="progressbar"`,
  statut `aria-live` pour le nombre de résultats, `<dialog>` natif avec `Échap`, focus visible,
  contrastes AA.
* Clavier : `Tab` sur tous les contrôles, `/` pour la recherche, `Échap` pour fermer/vider.
* Aucun framework, aucune requête externe, aucune police distante, aucun analytics ; 162 images en
  `loading="lazy"`, un CSS, un JS.
* `prefers-reduced-motion` respecté ; lisible jusqu'à 320 px sans débordement horizontal.
