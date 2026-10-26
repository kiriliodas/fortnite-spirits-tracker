# Fortnite Spirits — Chapter 7 Season 4 Collection Tracker

A fast, dependency-free, static collection tracker for **every Fortnite Chapter 7 Season 4
("Override") Sprite and finish** — 162 entries across 27 Sprites and 7 finish families — with
per-entry **owned** / **mastered** tracking, search, filters, mastery-reward progress toward the
**70-mastery** unlock, and JSON export/import for backups.

Open `index.html`. No build step, no server, no account, no network calls.

---

## 1. What's in the catalog (and how it was verified)

The in-game collectibles are called **Sprites**, not "Spirits" — that naming is kept in the
catalog, while "spirit"/"spirits" are wired in as search synonyms so either word works.

| Finish family | Entries | Notes |
|---|---|---|
| Base (Normal) | 27 | every Sprite has one |
| Gold | 26 | 3× Sprite XP from eliminations |
| Cheat Master | 26 | all Cheat Code inputs are correct |
| Loot Hacker | 26 | better item odds from Loot Hacks |
| Bounty Hunter | 26 | Sprite drops from eliminations; XP only from eliminations |
| Trick or Treat | 26 | Fortnitemares finish; candy from containers |
| Quack | 5 | **Sprite Mastery rewards**, not match drops |
| **Total** | **162** | |

The **only** base Sprite with no finishes at all is **Mega Man** (1 entry). The five Sprites with
a Quack form are **Jonesy, Bush, Adventure, Spooky Dash and Klombo** — they are unlocked by
mastering 40 / 45 / 50 / 55 / 60 Sprites respectively, so they are claimed from the Mastery
Reward tab rather than found in a match.

Verification was done against several independent sources (full list with what each was used for
is in `data/sources.json` and in the app's **Settings → Catalog** panel):

* [Sprite Checklist](https://spritechecklist.org/) — per-entry verification of all 162 rows and
  the source of the bundled per-Sprite renders.
* [VICE — All Fortnite Chapter 7 Season 4 Sprites](https://www.vice.com/en/article/all-fortnite-chapter-7-season-4-sprites-complete-list/)
  — total and per-collection counts (27 / 26 / 26 / 26 / 26 / 26 / 5 = 162).
* [Fortnite Wiki (weirdgloop)](https://fortnite.weirdgloop.org/w/Chapter_7:_Season_4) — release
  dates, per-update additions, item names/rarities.
* [Gaming Route](https://gamingroute.com/fortnite-sprites-list-chapter-7-season-4/) and
  [FN Sprite Tracker](https://fnsprites.app/sprites) — independent confirmation of "27 Sprites
  obtainable in Season 4" and the 162-row total.
* [Beebom](https://beebom.com/what-does-mastering-a-sprite-do-in-fortnite/) +
  [Game Rant](https://gamerant.com/fortnite-ch7-s4-quack-sprites-mastery-reward-how-to-get-effect/)
  — the full mastery reward track, including the 70-mastery Pixel Polli style and the Quack
  thresholds.
* [Beebom](https://beebom.com/how-to-get-obsession-one-wish-willow-sprite-in-fortnite/) /
  [Game Rant](https://gamerant.com/fortnite-blinky-sprite-location-how-to-get-effect-pac-man-ghost-locations/)
  — crossover origins (One Wish Willow = *Obsession*; Blinky = PAC-MAN).

### Names that differ between sources

Several trackers still use **pre-launch** labels. This catalog uses the in-game names, and the
old labels are searchable as aliases:

| In-game name (used here) | Older / pre-launch label |
|---|---|
| Jackrabbit | Jazz Jackrabbit |
| Bush | Bushranger / Bush Ranger |
| 8-Bit | 8-Bit Blaster |
| Adventure | The Adventurer |
| Crown | Victory Crown |

### Deliberately excluded

* **Chapter 7 Season 3 Sprites** (Dream, Zero Point, Grim Reaper, Ironmouse, Pollo, Duck, Ghost,
  Fire, Water, Earth, Fishy, …). They stay in a player's collection but are not equippable in
  Season 4 and do not feed the Season 4 mastery track.
* **Never-released placeholders** (Bullet, Cube, Head Shot, Meowscles, Squibbly) and the
  cancelled Bullet Sprite slot that became Onigiri.

### Still uncertain (stated openly, nothing invented)

1. The **Quack thresholds (40/45/50/55/60)** and the **70-mastery** Pixel Polli style are
   reported consistently by multiple guides but Epic has not documented the numbers in patch
   notes. They match the in-game reward page screenshots, so they are implemented as given.
2. **Drop rates** are not published by Epic, so none are displayed.
3. The season is locked at 162 rows as of patch **v42.40**, but Epic could still add or remove
   rows before the season ends (Oct 31, 2026). The catalog carries a version stamp
   (`C7S4-2026-10-26`) and the importer reports entries that don't match the current build.
4. There is **no Jonesy "Spirit" sub-family** in the game. Jonesy has exactly seven rows: Base,
   Gold, Cheat Master, Loot Hacker, Bounty Hunter, Trick or Treat and Quack. Names such as
   "Golden Jonesy Spirit", "King of Cheats Jonesy Spirit", "Pirate of Plunder Jonesy Spirit" or
   "Trick-or-Treat Jonesy Spirit" from the brief **do not exist in any verified source** and were
   not added. (`Golden` maps to the Gold finish, and `Trick or Treat` is the Fortnitemares finish.)

---

## 2. Mastery semantics (what the numbers mean)

* A Sprite is **Mastered** when it reaches **Level 5 and is extracted** (or you win with it
  equipped). Hitting level 5 and dying does not count. Mastery is permanent on the account even
  though the Sprite itself resets to Level 1.
* **Mastery implies ownership** — ticking *Mastered* also ticks *Owned*.
* **Un-ticking *Owned* on a mastered Sprite clears its mastery** (with an explanatory toast),
  because a mastered Sprite you don't own is contradictory.
* Each entry counts **once**: the counter is driven by unique IDs, never by clicks.
* **The 15-spirit starting value.** The identities of the 15 Sprites already mastered are not
  known, so they are *not* faked onto arbitrary entries. Instead the tracker keeps a configurable
  **pre-tracked mastery count** (default **15**), shown as `15 / 70 mastered · 55 more to go`.
  Change it in **Settings → Starting mastery count**, or with the `change` link under the progress
  bar. Effective progress = `pre-tracked count + entries marked mastered here`.
* A separate, easily confused milestone: extracting **30 Sprites at any level** unlocks the
  Pixel Sprite Trainer Back Bling. It is an *extraction* milestone, not a mastery one, so it is
  not part of this progress bar.
* Reward track milestones (28 → Pixel Polli Outfit, 40/45/50/55/60 → Quack Sprites, 70 → Pixel
  Polli "Mixtape Pixie" style) are surfaced as the "Next: …" line.

---

## 3. Using it

| Action | How |
|---|---|
| Mark owned / mastered | checkbox on each card (keyboard reachable) |
| Search | type in the search box; `/` focuses it, `Esc` clears it |
| Search aliases | `golden` → Gold finishes, `jazz jackrabbit` → Jackrabbit, `spirits` → everything, `8bit`, `x ray`, `bushranger`, `victory crown`, `pacman`, `sega`, `bee`, … |
| Filters | All · Owned · Missing · Mastered · Not mastered · Owned, not mastered (with live counts) |
| Sort | By family (groups variants together) · A→Z · By status |
| Export | **Export Collection** → `fortnite-spirits-collection-YYYY-MM-DD.json` |
| Import | **Import Collection** or drag a `.json` file onto the page |
| Reset | **Settings → Reset collection** (asks first, keeps the starting count) |

Filters and search combine; the result count is always visible.

### Export format

```json
{
  "app": "fortnite-spirits-tracker",
  "schemaVersion": 2,
  "catalogVersion": "C7S4-2026-10-26",
  "exportedAt": "2026-10-26T18:42:11.012Z",
  "summary": { "owned": 3, "mastered": 2, "startingMastery": 15, "totalMastered": 17, "masteryTarget": 70, "catalogEntries": 162 },
  "settings": { "startingMastery": 15 },
  "spirits": {
    "jonesy-base": { "owned": true, "mastered": true },
    "klombo-quack": { "owned": true, "mastered": false }
  }
}
```

Only stable IDs and per-ID flags are exported — no catalog duplication, no code. IDs never
change if a display name changes, so old backups keep working.

### Import behaviour

* Accepts schema v2 (above), schema v1 (`"spirits": { "id": true }`) and a bare array of IDs.
* Validates before touching anything; malformed JSON or an unreadable structure shows an
  explanatory error and **leaves the current collection untouched**.
* Asks for confirmation before replacing existing data, showing both counts. Confirmations use an
  in-page `<dialog>` (not `window.confirm`), so they work even in sandboxed iframes where native
  modals are blocked.
* Newer schema versions are parsed for the fields it understands and the rest is reported, not
  silently dropped.
* IDs that don't exist in the current catalog are **kept** (and re-exported), listed by ID in the
  import report and in Settings.
* Progress, counters, chips and card states refresh immediately — no reload.

All collection data lives in `localStorage` under `fortnite-spirits-tracker.v2`. If storage is
blocked (private mode, sandboxed iframe), the app still works for the session and tells you to
export a backup.

---

## 4. Project layout

```
index.html              markup (header, progress, controls, collection, dialogs)
styles.css              dark theme, responsive grid, no external fonts/assets
app.js                  state, search/filter/sort, progress, import/export
data/catalog.js         GENERATED, loaded by the page (works from file:// — no fetch/CORS)
data/spirits.json       GENERATED, catalog source of truth in readable JSON
data/sources.json       source list + documented uncertainties (feeds the Settings panel)
assets/sprites/*.webp   162 bundled Sprite renders (~2.0 MB total, ~10 KB each)
tools/build_catalog.py  regenerates data/spirits.json + data/catalog.js
tools/test.js           jsdom test suite (117 assertions)
```

Why `data/catalog.js` **and** `data/spirits.json`: a static page that `fetch()`es JSON breaks when
opened straight from disk (`file://`). The build step emits the same catalog as a plain JS
assignment, so the site works from GitHub Pages, any static host, a USB stick, or a double-click —
while `spirits.json` stays as the human-readable, diffable source of truth.

### Regenerating the catalog

```bash
python3 tools/build_catalog.py      # rewrites data/spirits.json + data/catalog.js
```

Edit the `FAMILIES` / `VARIANTS` tables at the top of that script (names, rarities, series,
aliases, abilities, Quack thresholds), then re-run it. Bump `CATALOG_VERSION` when the roster
changes so imported collections can be reconciled against it.

### Running the tests

```bash
npm install          # jsdom only, dev-only
node tools/test.js   # 117 assertions
```

---

## 5. Deploying to GitHub Pages

The site is fully static; there is nothing to build.

```bash
git add . && git commit -m "Fortnite Spirits tracker" && git push
```

Then **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**. If you host the
project in a subdirectory (`user.github.io/repo/`), all paths in `index.html` are relative, so it
works unchanged. The folder contains no `node_modules` dependency at runtime.

---

## 6. Images and licensing

* Sprite renders: **162 WebP files (~2.0 MB total)** downloaded from
  [spritechecklist.org](https://spritechecklist.org/) and **bundled locally** in
  `assets/sprites/`, so the collection loads with no external requests, no hotlinking and no
  broken images if a third-party site changes. Each entry keeps an `imageSource` field pointing at
  the origin.
* The art itself is **© Epic Games** (and its collaborators: SEGA, CAPCOM, Bandai Namco, Atlus,
  Activision, Focus Features/Blumhouse for the crossover Sprites). It is included for personal,
  non-commercial collection tracking; treat it as fan-use material and remove it if you intend to
  redistribute the project commercially.
* If an image ever fails to load, the card renders a labelled `.img-fallback` ("Image unavailable"
  plus the Sprite's initials) instead of a broken icon — the entry itself is never hidden.

## 7. Accessibility & performance

* Works over `file://` too (the catalog ships as `data/catalog.js`, so no `fetch`/CORS needed).
* Semantic landmarks, skip link, `aria-label`/`aria-pressed`/`role="progressbar"`, `aria-live`
  status for the result count, native `<dialog>` with `Escape`, visible focus rings, AA contrast.
* Keyboard: `Tab` through every control, `/` to search, `Esc` to clear.
* No frameworks, no fonts, no analytics; 162 `loading="lazy"` images, one CSS file, one JS file.
* `prefers-reduced-motion` respected; single-column-friendly down to 320 px with no horizontal
  overflow.
