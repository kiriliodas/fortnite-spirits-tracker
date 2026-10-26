/* Suite de tests : charge le vrai index.html + catalog.js + app.js dans jsdom et
   vérifie recherche, filtres, statuts, règles de maîtrise, persistance,
   export/import et le rail des 35 récompenses de maîtrise.
   Lancer : node tools/test.js                                              */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const catalogJs = fs.readFileSync(path.join(ROOT, "data", "catalog.js"), "utf8");
const appJs = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; failures.push(name + (extra ? " — " + extra : "")); console.log("  ✗ " + name + (extra ? " — " + extra : "")); }
}
function eq(name, actual, expected) {
  ok(name + " (got " + JSON.stringify(actual) + ")", actual === expected, "expected " + JSON.stringify(expected));
}
function section(t) { console.log("\n" + t); }

function boot(storageSeed) {
  const stripped = html
    .replace(/<script src="data\/catalog\.js"><\/script>/, "")
    .replace(/<script src="app\.js"><\/script>/, "");
  const dom = new JSDOM(stripped, { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
  const { window } = dom;
  if (storageSeed) window.localStorage.setItem("fortnite-spirits-tracker.v2", JSON.stringify(storageSeed));
  window.eval(catalogJs);
  window.eval(appJs);
  return { dom, window, doc: window.document };
}

const tick = () => new Promise(r => setTimeout(r, 90));
const text = n => (n ? n.textContent.replace(/\s+/g, " ").trim() : "<null>");

function setSearch(window, value) {
  const input = window.document.getElementById("search");
  input.value = value;
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}
function clickChip(window, filter) {
  window.document.querySelector('.chip[data-filter="' + filter + '"]').dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
}
function toggle(window, id, kind, checked) {
  const cb = window.document.querySelector('input[data-id="' + id + '"][data-kind="' + kind + '"]');
  cb.checked = checked;
  cb.dispatchEvent(new window.Event("change", { bubbles: true }));
  return cb;
}
function setSelect(window, id, value) {
  const s = window.document.getElementById(id);
  s.value = value;
  s.dispatchEvent(new window.Event("change", { bubbles: true }));
}
const cardCount = window => window.document.querySelectorAll("[data-card-id]").length;
const masteredTotal = window => Number(window.document.getElementById("masteredTotal").textContent);
const tiles = window => Array.from(window.document.querySelectorAll(".rw"));
const tileState = (window, level) => {
  const t = tiles(window).find(n => n.querySelector(".rw-threshold").textContent === String(level));
  return t ? t.dataset.state : "<none>";
};

(async function run() {
  /* ---------------------------------------------------------------- boot */
  section("1. Chargement initial — collection vierge");
  const A = boot();
  const { window: w, doc } = A;
  await tick();
  eq("162 cartes rendues", cardCount(w), 162);
  eq("compteur maîtrisés à 0 par défaut", masteredTotal(w), 0);
  eq("libellé restant", text(doc.getElementById("remainingLabel")), "70 esprits encore à maîtriser");
  eq("cible 70", text(doc.getElementById("masteryTarget")), "70");
  eq("pourcentage initial", text(doc.getElementById("progressPercent")), "0");
  eq("possédés", text(doc.getElementById("statOwned")), "0/162");
  eq("à obtenir", text(doc.getElementById("statMissing")), "162");
  eq("complétion", text(doc.getElementById("statCompletion")), "0%");
  eq("badge récompense verrouillée", doc.getElementById("rewardStatus").dataset.state, "locked");
  eq("aucune carte possédée", doc.querySelectorAll(".card.is-owned").length, 0);
  eq("aucune carte maîtrisée", doc.querySelectorAll(".card.is-mastered").length, 0);
  eq("27 groupes de familles", doc.querySelectorAll(".family").length, 27);
  eq("162 images", doc.querySelectorAll(".card img").length, 162);
  ok("fichiers images présents sur disque", Array.from(doc.querySelectorAll(".card img"))
     .every(i => fs.existsSync(path.join(ROOT, i.getAttribute("src")))));
  ok("stockage localStorage vide au départ", w.localStorage.getItem("fortnite-spirits-tracker.v2") === null);

  /* ------------------------------------------------------- rail récompenses */
  section("2. Rail des récompenses de maîtrise");
  eq("35 paliers affichés", tiles(w).length, 35);
  eq("compteur de paliers dans l'en-tête", text(doc.getElementById("rewardCount")), "35");
  eq("palier 1 = prochain", tileState(w, 1), "next");
  eq("palier 28 verrouillé", tileState(w, 28), "locked");
  eq("palier 70 verrouillé", tileState(w, 70), "locked");
  eq("aucun palier obtenu", tiles(w).filter(t => t.dataset.state === "claimed").length, 0);
  const levels = tiles(w).map(t => Number(t.querySelector(".rw-threshold").textContent));
  eq("seuils dans l'ordre", levels.join(","), "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,35,40,45,50,55,60,70");
  ok("seuil 28 = Pixel Polli", text(tiles(w).find(t => t.querySelector(".rw-threshold").textContent === "28")).includes("Pixel Polli"));
  ok("Quack Jonesy au palier 40", text(tiles(w).find(t => t.querySelector(".rw-threshold").textContent === "40")).includes("Quack Jonesy"));
  ok("palier 70 = style Mixtape Pixie", text(tiles(w).find(t => t.querySelector(".rw-threshold").textContent === "70")).includes("Mixtape Pixie"));
  ok("images Quack locales dans le rail", Array.from(doc.querySelectorAll(".rw-icon img")).length === 5 &&
     Array.from(doc.querySelectorAll(".rw-icon img")).every(i => fs.existsSync(path.join(ROOT, i.getAttribute("src")))));
  eq("prochaine récompense annoncée", text(doc.getElementById("nextRewardName")).split(" · ")[0], "40 000 XP de saison");

  /* -------------------------------------------------------------- recherche */
  section("3. Recherche");
  setSearch(w, "Jonesy"); await tick();
  eq('recherche "Jonesy"', cardCount(w), 7);
  ok("Quack Jonesy inclus", text(doc.getElementById("grid")).includes("Quack Jonesy Sprite"));
  setSearch(w, "golden"); await tick();
  eq('recherche "golden" (alias de Gold)', cardCount(w), 26);
  setSearch(w, "dore"); await tick();
  eq('recherche FR "dore"', cardCount(w), 26);
  setSearch(w, "esprits"); await tick();
  eq('recherche FR "esprits"', cardCount(w), 162);
  setSearch(w, "cheat master"); await tick();
  eq('recherche "cheat master"', cardCount(w), 26);
  setSearch(w, "JONESY"); await tick();
  eq("insensible à la casse", cardCount(w), 7);
  setSearch(w, "x ray"); await tick();
  eq('recherche "x ray"', cardCount(w), 6);
  setSearch(w, "8bit"); await tick();
  eq('recherche "8bit"', cardCount(w), 6);
  setSearch(w, "klombo quack"); await tick();
  eq("recherche multi-termes", cardCount(w), 1);
  setSearch(w, "zzzz"); await tick();
  eq("aucun résultat", cardCount(w), 0);
  ok("état vide affiché", doc.getElementById("emptyState").hidden === false);
  setSearch(w, ""); await tick();
  eq("recherche vidée", cardCount(w), 162);

  /* ---------------------------------------------------------------- filtres */
  section("4. Filtres");
  clickChip(w, "missing");   eq("manquants", cardCount(w), 162);
  clickChip(w, "owned");     eq("possédés", cardCount(w), 0);
  clickChip(w, "mastered");  eq("maîtrisés", cardCount(w), 0);
  clickChip(w, "unmastered");eq("non maîtrisés", cardCount(w), 162);
  clickChip(w, "owned-unmastered"); eq("possédés non maîtrisés", cardCount(w), 0);
  clickChip(w, "all");

  section("4b. Filtres famille / variante");
  setSelect(w, "variantFilter", "quack");
  eq("variante Quack", cardCount(w), 5);
  setSelect(w, "variantFilter", "gold");
  eq("variante Gold", cardCount(w), 26);
  setSelect(w, "variantFilter", "all");
  setSelect(w, "familyFilter", "jonesy");
  eq("famille Jonesy", cardCount(w), 7);
  setSelect(w, "familyFilter", "megaman");
  eq("famille Mega Man (sans variante)", cardCount(w), 1);
  setSelect(w, "familyFilter", "all");
  eq("retour à 162", cardCount(w), 162);

  /* -------------------------------------------------------------- possession */
  section("5. Possession & maîtrise");
  toggle(w, "jonesy-base", "owned", true);
  eq("possédés après 1", text(doc.getElementById("statOwned")), "1/162");
  eq("complétion après 1", text(doc.getElementById("statCompletion")), "1%");
  ok("carte marquée .is-owned", doc.querySelector('[data-card-id="jonesy-base"]').classList.contains("is-owned"));
  ok("étiquette d'état = Possédé", text(doc.querySelector('[data-card-id="jonesy-base"] .state-tag')) === "Possédé");

  toggle(w, "jonesy-base", "mastered", true);
  eq("compteur maîtrisés 0 → 1", masteredTotal(w), 1);
  eq("pourcentage arrondi", text(doc.getElementById("progressPercent")), "1");
  ok("emblème de maîtrise", !!doc.querySelector('[data-card-id="jonesy-base"] .crown'));
  ok("carte marquée .is-mastered", doc.querySelector('[data-card-id="jonesy-base"]').classList.contains("is-mastered"));
  eq("palier 1 obtenu", tileState(w, 1), "claimed");
  eq("palier 2 devient le prochain", tileState(w, 2), "next");

  toggle(w, "sonic-gold", "mastered", true);
  eq("maîtrise implique possession", text(doc.getElementById("statOwned")), "2/162");
  ok("case possédé cochée automatiquement",
     doc.querySelector('input[data-id="sonic-gold"][data-kind="owned"]').checked === true);
  eq("compteur après 2e maîtrise", masteredTotal(w), 2);

  toggle(w, "sonic-gold", "owned", false);
  eq("retirer la possession retire la maîtrise", masteredTotal(w), 1);
  ok("case maîtrisé décochée", doc.querySelector('input[data-id="sonic-gold"][data-kind="mastered"]').checked === false);
  ok("emblème retiré", !doc.querySelector('[data-card-id="sonic-gold"] .crown'));

  toggle(w, "jonesy-base", "mastered", false);
  eq("décocher la maîtrise laisse la possession", text(doc.getElementById("statOwned")), "1/162");
  eq("compteur revenu à 0", masteredTotal(w), 0);

  /* --------------------------------------------- recherche + filtre combinés */
  section("6. Combinaisons recherche + filtres");
  toggle(w, "jonesy-gold", "owned", true);
  setSearch(w, "jonesy"); await tick();
  clickChip(w, "owned"); eq("Jonesy + possédés", cardCount(w), 2);
  clickChip(w, "missing"); eq("Jonesy + manquants", cardCount(w), 5);
  setSelect(w, "variantFilter", "quack");
  eq("Jonesy + manquants + Quack", cardCount(w), 1);
  setSelect(w, "variantFilter", "all");
  clickChip(w, "all");
  setSearch(w, ""); await tick();

  /* ----------------------------------------------------------------- tri */
  section("7. Tri");
  const sortSelect = doc.getElementById("sort");
  sortSelect.value = "az";
  sortSelect.dispatchEvent(new w.Event("change", { bubbles: true }));
  const names = Array.from(doc.querySelectorAll(".card-title")).map(n => n.textContent);
  ok("A→Z croissant", names.join("|") === names.slice().sort((a, b) => a.localeCompare(b)).join("|"));
  sortSelect.value = "status";
  sortSelect.dispatchEvent(new w.Event("change", { bubbles: true }));
  ok("statut : possédés en premier", doc.querySelector(".card").classList.contains("is-owned"));
  sortSelect.value = "family";
  sortSelect.dispatchEvent(new w.Event("change", { bubbles: true }));
  eq("retour aux 27 familles", doc.querySelectorAll(".family").length, 27);

  /* -------------------------------------------------------------- export */
  section("8. Export");
  const payload = w.__spirits.serialize();
  eq("identifiant d'application", payload.app, "fortnite-spirits-tracker");
  eq("version de schéma", payload.schemaVersion, 2);
  eq("version du catalogue", payload.catalogVersion, w.SPIRIT_CATALOG.catalogVersion);
  ok("horodatage ISO", !isNaN(Date.parse(payload.exportedAt)));
  eq("seules les fiches cochées sont exportées", Object.keys(payload.spirits).length, 2);
  eq("summary.owned", payload.summary.owned, 2);
  eq("summary.totalMastered", payload.summary.totalMastered, 0);
  eq("startingMastery exporté", payload.settings.startingMastery, 0);
  ok("pas de duplication du catalogue", JSON.stringify(payload).length < 2000);

  /* ---------------------------------------------------------- persistance */
  section("9. Persistance après rechargement");
  const raw = JSON.parse(w.localStorage.getItem("fortnite-spirits-tracker.v2"));
  ok("localStorage contient la fiche", raw.spirits["jonesy-gold"].owned === true);
  const B = boot(raw);
  await tick();
  eq("possédés rechargés", text(B.doc.getElementById("statOwned")), "2/162");
  eq("maîtrisés rechargés", masteredTotal(B.window), 0);
  ok("carte rechargée", B.doc.querySelector('[data-card-id="jonesy-gold"]').classList.contains("is-owned"));

  /* ------------------------------------------------------------- import */
  section("10. Import");
  const v2 = {
    app: "fortnite-spirits-tracker", schemaVersion: 2, catalogVersion: "C7S4-2026-10-26",
    exportedAt: new Date().toISOString(), settings: { startingMastery: 0 },
    spirits: {
      "klombo-base": { owned: true, mastered: true },
      "klombo-gold": { owned: true, mastered: false },
      "mega-man-gone": { owned: true, mastered: false }
    }
  };
  let parsed = B.window.__spirits.parseCollectionFile(v2, {});
  ok("import v2 accepté", parsed.ok === true);
  eq("possédés importés", parsed.result.owned.size, 2);
  eq("maîtrisés importés", parsed.result.mastered.size, 1);
  eq("identifiant inconnu conservé", parsed.result.unknown.size, 1);
  ok("avertissement sur les fiches inconnues", parsed.warnings.some(x => x.includes("pas pu être associé")));

  const legacy15 = {
    app: "fortnite-spirits-tracker", schemaVersion: 2,
    settings: { startingMastery: 15 },
    spirits: { "pond-base": { owned: true, mastered: true } }
  };
  parsed = B.window.__spirits.parseCollectionFile(legacy15, {});
  ok("ancienne sauvegarde à 15 conservée", parsed.ok && parsed.result.starting === 15);
  eq("total maîtrisé d'une ancienne sauvegarde", parsed.result.starting + parsed.result.mastered.size, 16);

  const v1 = { spirits: { "crown-base": true, "crown-gold": false } };
  parsed = B.window.__spirits.parseCollectionFile(v1, {});
  ok("format v1 (booléens) accepté", parsed.ok && parsed.result.owned.has("crown-base"));
  eq("valeur false ignorée", parsed.result.owned.has("crown-gold"), false);

  parsed = B.window.__spirits.parseCollectionFile(["bush-base", "bush-gold"], {});
  ok("tableau d'identifiants accepté", parsed.ok && parsed.result.owned.size === 2);

  const future = { schemaVersion: 9, settings: { startingMastery: 20 }, spirits: { "pond-base": { owned: true, mastered: true } } };
  parsed = B.window.__spirits.parseCollectionFile(future, {});
  ok("schéma plus récent accepté", parsed.ok === true);
  ok("avertissement de version", parsed.warnings.some(x => x.includes("plus récente")));
  eq("startingMastery du schéma récent", parsed.result.starting, 20);

  [ [null, "null"], [{ foo: 1 }, "objet sans collection"], [{ schemaVersion: 0, spirits: {} }, "schéma 0"], [{ spirits: "nope" }, "spirits non objet"] ]
    .forEach(([input, label]) => {
      const r = B.window.__spirits.parseCollectionFile(input, {});
      ok("rejette " + label, r.ok === false && typeof r.error === "string" && r.error.length > 4);
    });

  /* -------------------------------------- cohérence barre / stats / paliers */
  section("11. Cohérence progression ↔ paliers (D)");
  const C = boot();
  await tick();
  const setStarting = (win, doc, value) => {
    const input = doc.getElementById("startingInput");
    input.value = String(value);
    input.dispatchEvent(new win.Event("input", { bubbles: true }));
  };

  // juste avant un palier
  setStarting(C.window, C.doc, 27);
  eq("27 → compteur", masteredTotal(C.window), 27);
  eq("27 → palier 28 devient le prochain (pas encore obtenu)", tileState(C.window, 28), "next");
  eq("27 → palier 27 obtenu", tileState(C.window, 27), "claimed");
  eq("27 → palier 35 encore verrouillé", tileState(C.window, 35), "locked");
  eq("27 → 27 paliers obtenus", tiles(C.window).filter(t => t.dataset.state === "claimed").length, 27);
  eq("27 → pourcentage", text(C.doc.getElementById("progressPercent")), "39");
  eq("27 → reste 43", text(C.doc.getElementById("remainingLabel")), "43 esprits encore à maîtriser");

  // atteinte exacte
  setStarting(C.window, C.doc, 28);
  eq("28 → palier 28 obtenu", tileState(C.window, 28), "claimed");
  eq("28 → palier 35 devient le prochain", tileState(C.window, 35), "next");
  ok("28 → carte Pixel Polli marquée obtenue",
     tiles(C.window).find(t => t.querySelector(".rw-threshold").textContent === "28").dataset.state === "claimed");
  eq("28 → 40 %", text(C.doc.getElementById("progressPercent")), "40");

  // au-delà de plusieurs paliers
  setStarting(C.window, C.doc, 55);
  eq("55 → 33 paliers obtenus (28 + 35/40/45/50/55)", tiles(C.window).filter(t => t.dataset.state === "claimed").length, 33);
  eq("55 → palier 55 obtenu", tileState(C.window, 55), "claimed");
  eq("55 → palier 60 prochain", tileState(C.window, 60), "next");
  eq("55 → reste 15", text(C.doc.getElementById("remainingLabel")), "15 esprits encore à maîtriser");

  // objectif atteint
  setStarting(C.window, C.doc, 70);
  eq("70 → récompense débloquée", C.doc.getElementById("rewardStatus").dataset.state, "unlocked");
  eq("70 → 35 paliers obtenus", tiles(C.window).filter(t => t.dataset.state === "claimed").length, 35);
  eq("70 → aucun prochain", tiles(C.window).filter(t => t.dataset.state === "next").length, 0);
  eq("70 → barre à 100 %", parseFloat(C.doc.getElementById("barFill").style.width), 100);
  eq("70 → texte objectif", text(C.doc.getElementById("remainingLabel")), "Objectif atteint — récompense débloquée");
  ok("70 → mention aucun pré-coché conservée", text(C.doc.getElementById("startingText")).includes("déjà maîtrisés"));

  // au-delà de l'objectif
  setStarting(C.window, C.doc, 90);
  eq("90 → compteur réel", masteredTotal(C.window), 90);
  ok("90 → barre plafonnée", parseFloat(C.doc.getElementById("barFill").style.width) === 100);
  eq("90 → tous les paliers obtenus", tiles(C.window).filter(t => t.dataset.state === "claimed").length, 35);

  // progression mixte : pré-cochés + fiches cochées
  setStarting(C.window, C.doc, 26);
  toggle(C.window, "klombo-base", "mastered", true);
  toggle(C.window, "crown-base", "mastered", true);
  eq("26 + 2 fiches = 28", masteredTotal(C.window), 28);
  eq("la fiche cochée débloque le palier 28", tileState(C.window, 28), "claimed");

  // après rechargement, les paliers restent corrects
  const savedRaw = JSON.parse(C.window.localStorage.getItem("fortnite-spirits-tracker.v2"));
  const D = boot(savedRaw);
  await tick();
  eq("après reload → compteur", masteredTotal(D.window), 28);
  eq("après reload → palier 28 obtenu", tileState(D.window, 28), "claimed");
  eq("après reload → palier 35 prochain", tileState(D.window, 35), "next");

  // import d'une collection existante → paliers mis à jour
  const imported = D.window.__spirits.parseCollectionFile({
    schemaVersion: 2, settings: { startingMastery: 0 },
    spirits: Object.fromEntries(Array.from({ length: 12 }, (_, i) =>
      [["jonesy", "adventure", "bush", "sonic", "tails", "shadow", "crown", "klombo", "pond", "honey", "vampire", "deer"][i] + "-base",
       { owned: true, mastered: true }]))
  }, {});
  const E = boot({ schemaVersion: 2, settings: imported.result.starting, spirits: Object.fromEntries(
    Array.from(imported.result.mastered).map(id => [id, { owned: true, mastered: true }])) });
  await tick();
  eq("import → compteur 12", masteredTotal(E.window), 12);
  eq("import → palier 12 obtenu", tileState(E.window, 12), "claimed");
  eq("import → palier 13 prochain", tileState(E.window, 13), "next");

  /* -------------------------------------------------- image indisponible */
  section("12. Image indisponible");
  const img = E.doc.querySelector('[data-card-id="sonic-base"] img');
  img.dispatchEvent(new E.window.Event("error", { bubbles: false }));
  ok("repli affiché", !!E.doc.querySelector('[data-card-id="sonic-base"] .img-fallback'));
  ok("texte « Image indisponible »", text(E.doc.querySelector('[data-card-id="sonic-base"] .img-fallback')).includes("Image indisponible"));

  /* ------------------------------------------------------ intégrité catalogue */
  section("13. Intégrité du catalogue");
  const CAT = w.SPIRIT_CATALOG;
  eq("162 fiches", CAT.spirits.length, 162);
  eq("27 familles", CAT.families.length, 27);
  eq("27 base", CAT.counts.base, 27);
  eq("26 Gold", CAT.counts.gold, 26);
  eq("5 Quack", CAT.counts.quack, 5);
  ok("identifiants uniques", new Set(CAT.spirits.map(s => s.id)).size === 162);
  ok("chaque fiche a famille / variante / rareté", CAT.spirits.every(s => s.family && s.variant && s.rarity));
  eq("Mega Man = 1 fiche", CAT.spirits.filter(s => s.familyId === "megaman").length, 1);
  eq("Jonesy = 7 fiches", CAT.spirits.filter(s => s.familyId === "jonesy").length, 7);
  eq("objectif de maîtrise 70", CAT.masteryTarget, 70);
  eq("35 récompenses vérifiées", CAT.masteryRewards.length, 35);
  ok("tous les paliers ont un type", CAT.masteryRewards.every(r => typeof r.type === "string"));
  ok("seuils croissants", CAT.masteryRewards.every((r, i, a) => i === 0 || r.level > a[i - 1].level));
  ok("paliers mis en avant", CAT.masteryRewards.filter(r => r.featured).length === 7);

  /* ------------------------------------------------------------------ aucun */
  console.log("\n" + "=".repeat(58));
  console.log(`PASS ${pass}   FAIL ${fail}`);
  if (fail) {
    console.log("\nÉchecs :");
    failures.forEach(f => console.log(" - " + f));
    process.exitCode = 1;
  }
})();
