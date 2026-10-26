/* Test harness: loads the real index.html + catalog.js + app.js in jsdom and
   exercises search, filters, toggles, mastery rules, persistence, export/import.
   Run:  node tools/test.js                                             */
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
  const dom = new JSDOM(stripped, {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true
  });
  const { window } = dom;
  if (storageSeed) window.localStorage.setItem("fortnite-spirits-tracker.v2", JSON.stringify(storageSeed));
  window.eval(catalogJs);
  window.eval(appJs);
  return { dom, window, doc: window.document };
}

const tick = () => new Promise(r => setTimeout(r, 80));
const text = n => (n ? n.textContent.replace(/\s+/g, " ").trim() : "<null>");

function setSearch(window, value) {
  const input = window.document.getElementById("search");
  input.value = value;
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}
function clickChip(window, filter) {
  window.document.querySelector('.chip[data-filter="' + filter + '"]').dispatchEvent(
    new window.MouseEvent("click", { bubbles: true })
  );
}
function toggle(window, id, kind, checked) {
  const cb = window.document.querySelector(
    'input[data-id="' + id + '"][data-kind="' + kind + '"]'
  );
  cb.checked = checked;
  cb.dispatchEvent(new window.Event("change", { bubbles: true }));
  return cb;
}
const cardCount = window => window.document.querySelectorAll("[data-card-id]").length;
const masteredTotal = window => Number(window.document.getElementById("masteredTotal").textContent);

(async function run() {
  /* ---------------------------------------------------------------- boot */
  section("1. Initial load");
  const A = boot();
  const { window: w, doc } = A;
  await tick();
  eq("catalog total in header", text(doc.getElementById("catalogTotalLabel")), "162");
  eq("all 162 cards rendered", cardCount(w), 162);
  eq("initial mastered counter", masteredTotal(w), 15);
  eq("remaining label", text(doc.getElementById("remainingLabel")), "55 more to go");
  eq("mastery target shown", text(doc.getElementById("masteryTarget")), "70");
  eq("owned stat", text(doc.getElementById("statOwned")), "0/162");
  eq("missing stat", text(doc.getElementById("statMissing")), "162");
  eq("completion stat", text(doc.getElementById("statCompletion")), "0%");
  eq("reward badge state", doc.getElementById("rewardStatus").dataset.state, "locked");
  ok("all cards start .card without .is-owned", doc.querySelectorAll(".card.is-owned").length === 0);
  ok("27 family groups rendered", doc.querySelectorAll(".family").length === 27);
  ok("every card has an image", doc.querySelectorAll(".card img").length === 162);
  ok("images resolve to bundled files", (() => {
    const srcs = Array.from(doc.querySelectorAll(".card img")).map(i => i.getAttribute("src"));
    return srcs.every(s => fs.existsSync(path.join(ROOT, s)));
  })());

  /* -------------------------------------------------------------- search */
  section("2. Search");
  setSearch(w, "Jonesy");
  await tick();
  eq('search "Jonesy" result count', cardCount(w), 7);
  ok('search "Jonesy" includes Quack Jonesy', text(doc.getElementById("grid")).includes("Quack Jonesy Sprite"));
  ok('search "Jonesy" result label', text(doc.getElementById("resultCount")).includes("Showing 7 of 162"));

  setSearch(w, "golden");
  await tick();
  eq('search "golden" finds gold finishes', cardCount(w), 26);
  ok('search "golden" found Gold Jonesy', text(doc.getElementById("grid")).includes("Gold Jonesy Sprite"));

  setSearch(w, "cheat master");
  await tick();
  eq('search "cheat master"', cardCount(w), 26);

  setSearch(w, "JONESY");
  await tick();
  eq("search is case-insensitive", cardCount(w), 7);

  setSearch(w, "spirits");
  await tick();
  eq('search "spirits" (wrong in-game term) still matches', cardCount(w), 162);

  setSearch(w, "x ray");
  await tick();
  eq('search "x ray" (punctuation-insensitive)', cardCount(w), 6);

  setSearch(w, "8bit");
  await tick();
  eq('search "8bit" alias', cardCount(w), 6);

  setSearch(w, "klombo quack");
  await tick();
  eq("multi-token search narrows", cardCount(w), 1);

  setSearch(w, "zzzz");
  await tick();
  eq("empty result count", cardCount(w), 0);
  ok("empty state visible", doc.getElementById("emptyState").hidden === false);

  setSearch(w, "");
  await tick();
  eq("clearing search restores 162", cardCount(w), 162);

  /* ------------------------------------------------------------- filters */
  section("3. Filters");
  clickChip(w, "missing");
  eq("missing filter = 162", cardCount(w), 162);
  clickChip(w, "owned");
  eq("owned filter = 0", cardCount(w), 0);
  clickChip(w, "mastered");
  eq("mastered filter = 0", cardCount(w), 0);
  clickChip(w, "all");

  /* ------------------------------------------------------- toggle owned */
  section("4. Ownership toggling");
  let cb = toggle(w, "jonesy-base", "owned", true);
  eq("owned stat after 1", text(doc.getElementById("statOwned")), "1/162");
  eq("missing stat after 1", text(doc.getElementById("statMissing")), "161");
  eq("completion after 1", text(doc.getElementById("statCompletion")), "1%");
  ok("card marked .is-owned", doc.querySelector('[data-card-id="jonesy-base"]').classList.contains("is-owned"));
  ok("owned chip count updated", text(doc.querySelector('.chip[data-filter="owned"]')).endsWith("1"));

  clickChip(w, "owned");
  eq("owned filter shows 1", cardCount(w), 1);
  clickChip(w, "missing");
  eq("missing filter shows 161", cardCount(w), 161);
  clickChip(w, "all");

  /* ------------------------------------------------------ toggle mastery */
  section("5. Mastery toggling + dependency rules");
  toggle(w, "jonesy-base", "mastered", true);
  eq("mastered counter 15 -> 16", masteredTotal(w), 16);
  eq("remaining label 54", text(doc.getElementById("remainingLabel")), "54 more to go");
  ok("crown badge added", !!doc.querySelector('[data-card-id="jonesy-base"] .crown'));
  ok("card marked .is-mastered", doc.querySelector('[data-card-id="jonesy-base"]').classList.contains("is-mastered"));
  eq("mastered stat", text(doc.getElementById("statMastered")), "1");

  // mastering an un-owned sprite must auto-own it
  toggle(w, "sonic-gold", "mastered", true);
  eq("auto-own on mastery: owned stat", text(doc.getElementById("statOwned")), "2/162");
  const sonicOwned = doc.querySelector('input[data-id="sonic-gold"][data-kind="owned"]');
  ok("auto-own checkbox is checked", sonicOwned.checked === true);
  ok("auto-own toggle styled on", sonicOwned.closest(".toggle").classList.contains("is-on"));
  eq("mastered counter after 2nd", masteredTotal(w), 17);

  // removing ownership must clear mastery
  toggle(w, "sonic-gold", "owned", false);
  eq("un-owning clears mastery (counter)", masteredTotal(w), 16);
  eq("un-owning clears mastery (stat)", text(doc.getElementById("statMastered")), "1");
  ok("mastery checkbox cleared", doc.querySelector('input[data-id="sonic-gold"][data-kind="mastered"]').checked === false);
  ok("crown removed", !doc.querySelector('[data-card-id="sonic-gold"] .crown'));

  // mastery-off keeps ownership
  toggle(w, "jonesy-base", "mastered", false);
  eq("mastery off returns counter to 15", masteredTotal(w), 15);
  eq("ownership preserved after mastery off", text(doc.getElementById("statOwned")), "1/162");

  /* -------------------------------------------------- combined filter/search */
  section("6. Search + filter combinations");
  toggle(w, "jonesy-gold", "owned", true);
  setSearch(w, "jonesy");
  await tick();
  clickChip(w, "owned");
  eq("Jonesy + owned", cardCount(w), 2);
  clickChip(w, "owned-unmastered");
  eq("Jonesy + owned-not-mastered", cardCount(w), 2);
  clickChip(w, "missing");
  eq("Jonesy + missing", cardCount(w), 5);
  clickChip(w, "all");
  setSearch(w, "");
  await tick();

  /* ------------------------------------------------------------- sorting */
  section("7. Sorting");
  const sortSelect = doc.getElementById("sort");
  sortSelect.value = "az";
  sortSelect.dispatchEvent(new w.Event("change", { bubbles: true }));
  const names = Array.from(doc.querySelectorAll(".card-title")).map(n => n.textContent);
  ok("A→Z sorts ascending", names.join("|") === names.slice().sort((a, b) => a.localeCompare(b)).join("|"));
  sortSelect.value = "status";
  sortSelect.dispatchEvent(new w.Event("change", { bubbles: true }));
  ok("status sort puts owned first",
     doc.querySelector(".card").classList.contains("is-owned"));
  sortSelect.value = "family";
  sortSelect.dispatchEvent(new w.Event("change", { bubbles: true }));
  eq("family sort restores groups", doc.querySelectorAll(".family").length, 27);

  /* ------------------------------------------------------------- export */
  section("8. Export payload");
  const payload = w.__spirits.serialize();
  eq("app id", payload.app, "fortnite-spirits-tracker");
  eq("schema version", payload.schemaVersion, 2);
  ok("catalog version present", payload.catalogVersion === w.SPIRIT_CATALOG.catalogVersion);
  ok("export timestamp is ISO", !isNaN(Date.parse(payload.exportedAt)));
  ok("only owned/mastered ids exported", Object.keys(payload.spirits).length === 2);
  ok("flags preserved", payload.spirits["jonesy-base"].owned === true && payload.spirits["jonesy-gold"].owned === true);
  eq("summary owned", payload.summary.owned, 2);
  eq("summary totalMastered", payload.summary.totalMastered, 15);
  eq("starting mastery exported", payload.settings.startingMastery, 15);
  ok("no catalog duplication", JSON.stringify(payload).length < 2000);

  /* -------------------------------------------------------- persistence */
  section("9. Persistence across reload");
  const raw = JSON.parse(w.localStorage.getItem("fortnite-spirits-tracker.v2"));
  eq("localStorage has owned entry", raw.spirits["jonesy-gold"].owned, true);
  const B = boot(raw);
  await tick();
  eq("reloaded owned stat", text(B.doc.getElementById("statOwned")), "2/162");
  eq("reloaded mastered counter", masteredTotal(B.window), 15);
  ok("reloaded card state", B.doc.querySelector('[data-card-id="jonesy-gold"]').classList.contains("is-owned"));

  /* ------------------------------------------------------------- import */
  section("10. Import");
  const v2 = {
    app: "fortnite-spirits-tracker",
    schemaVersion: 2,
    catalogVersion: "C7S4-2026-10-26",
    exportedAt: new Date().toISOString(),
    settings: { startingMastery: 15 },
    spirits: {
      "klombo-base": { owned: true, mastered: true },
      "klombo-gold": { owned: true, mastered: false },
      "mega-man-gone": { owned: true, mastered: false }
    }
  };
  let parsed = B.window.__spirits.parseCollectionFile(v2, {});
  ok("v2 import accepted", parsed.ok === true);
  eq("v2 import owned", parsed.result.owned.size, 2);
  eq("v2 import mastered", parsed.result.mastered.size, 1);
  eq("v2 unknown id kept", parsed.result.unknown.size, 1);
  ok("v2 unknown warning present", parsed.warnings.some(x => x.includes("could not be matched")));

  const v1 = { spirits: { "crown-base": true, "crown-gold": false } };
  parsed = B.window.__spirits.parseCollectionFile(v1, {});
  ok("v1 boolean format accepted", parsed.ok && parsed.result.owned.has("crown-base"));
  eq("v1 false value ignored", parsed.result.owned.has("crown-gold"), false);

  parsed = B.window.__spirits.parseCollectionFile(["bush-base", "bush-gold"], {});
  ok("bare id array accepted", parsed.ok && parsed.result.owned.size === 2);

  const future = {
    schemaVersion: 9,
    settings: { startingMastery: 20 },
    spirits: { "pond-base": { owned: true, mastered: true } }
  };
  parsed = B.window.__spirits.parseCollectionFile(future, {});
  ok("newer schema still parsed", parsed.ok === true);
  ok("newer schema warns", parsed.warnings.some(x => x.includes("newer version")));
  eq("newer schema starting mastery", parsed.result.starting, 20);

  const bad = [
    [null, "null"],
    [{ foo: 1 }, "unrelated object"],
    [{ schemaVersion: 0, spirits: {} }, "schema 0"],
    [{ spirits: "nope" }, "spirits as string"]
  ];
  bad.forEach(([input, label]) => {
    const r = B.window.__spirits.parseCollectionFile(input, {});
    ok("rejects " + label, r.ok === false && typeof r.error === "string" && r.error.length > 4);
  });
  let threw = false;
  try { JSON.parse("{not json"); } catch (e) { threw = true; }
  ok("malformed JSON throws (caught by import UI)", threw);

  // apply an import the way the UI does, then verify UI refresh
  const C = boot();
  await tick();
  C.window.eval("window.__test_apply = null;");
  const importPayload = {
    app: "fortnite-spirits-tracker",
    schemaVersion: 2,
    catalogVersion: "C7S4-2026-10-26",
    settings: { startingMastery: 10 },
    spirits: {
      "sonic-base": { owned: true, mastered: true },
      "tails-base": { owned: true, mastered: true },
      "shadow-base": { owned: true, mastered: false }
    }
  };
  const p = C.window.__spirits.parseCollectionFile(importPayload, {});
  // simulate the UI's post-import path by writing to storage and rebooting
  C.window.localStorage.setItem("fortnite-spirits-tracker.v2", JSON.stringify({
    app: "fortnite-spirits-tracker", schemaVersion: 2, catalogVersion: "C7S4-2026-10-26",
    settings: { startingMastery: 10 }, spirits: importPayload.spirits
  }));
  const D = boot(JSON.parse(C.window.localStorage.getItem("fortnite-spirits-tracker.v2")));
  await tick();
  eq("imported owned stat", text(D.doc.getElementById("statOwned")), "3/162");
  eq("imported mastered counter (10 + 2)", masteredTotal(D.window), 12);
  eq("imported remaining label", text(D.doc.getElementById("remainingLabel")), "58 more to go");
  ok("imported mastery icon on card", !!D.doc.querySelector('[data-card-id="sonic-base"] .crown'));
  eq("imported starting input", D.doc.getElementById("startingInput").value, "10");
  eq("parsed import matches", p.result.mastered.size, 2);

  /* -------------------------------------------------- image fallback */
  section("11. Broken image fallback");
  const img = D.doc.querySelector('[data-card-id="sonic-base"] img');
  img.dispatchEvent(new D.window.Event("error", { bubbles: false }));
  ok("fallback rendered", !!D.doc.querySelector('[data-card-id="sonic-base"] .img-fallback'));
  ok("fallback text mentions unavailable", text(D.doc.querySelector('[data-card-id="sonic-base"] .img-fallback')).includes("Image unavailable"));
  ok("original img hidden", img.style.display === "none");

  /* -------------------------------------------------- mastery threshold */
  section("12. Mastery threshold maths");
  const E = boot();
  await tick();
  const input = E.doc.getElementById("startingInput");
  input.value = "55";
  input.dispatchEvent(new E.window.Event("input", { bubbles: true }));
  eq("starting 55 -> counter 55", masteredTotal(E.window), 55);
  eq("remaining 15", text(E.doc.getElementById("remainingLabel")), "15 more to go");
  eq("badge still locked", E.doc.getElementById("rewardStatus").dataset.state, "locked");
  input.value = "70";
  input.dispatchEvent(new E.window.Event("input", { bubbles: true }));
  eq("starting 70 -> reward unlocked", E.doc.getElementById("rewardStatus").dataset.state, "unlocked");
  eq("reward text", text(E.doc.getElementById("remainingLabel")), "Target reached — reward unlocked");
  eq("bar caps at 100%", parseFloat(E.doc.getElementById("barFill").style.width), 100);
  input.value = "999";
  input.dispatchEvent(new E.window.Event("input", { bubbles: true }));
  eq("starting count clamped to catalog size", masteredTotal(E.window), 162);
  // a starting count equal to the catalog plus tracked masteries can exceed the catalog
  E.doc.querySelector('input[data-id="jonesy-base"][data-kind="mastered"]').dispatchEvent(
    Object.assign(new E.window.Event("change", { bubbles: true }), {})
  );
  const jb = E.doc.querySelector('input[data-id="jonesy-base"][data-kind="mastered"]');
  jb.checked = true;
  jb.dispatchEvent(new E.window.Event("change", { bubbles: true }));
  eq("over-catalog mastered total", masteredTotal(E.window), 163);
  ok("warning about exceeding catalog", text(E.doc.getElementById("startingText")).includes("above the 162-entry catalog"));

  /* ------------------------------------------------------ catalog sanity */
  section("13. Catalog integrity");
  const CAT = w.SPIRIT_CATALOG;
  eq("162 entries", CAT.spirits.length, 162);
  eq("27 families", CAT.families.length, 27);
  eq("base count", CAT.counts.base, 27);
  eq("gold count", CAT.counts.gold, 26);
  eq("quack count", CAT.counts.quack, 5);
  ok("ids unique", new Set(CAT.spirits.map(s => s.id)).size === 162);
  ok("every spirit has family + variant + rarity", CAT.spirits.every(s => s.family && s.variant && s.rarity));
  ok("Mega Man has exactly 1 entry", CAT.spirits.filter(s => s.familyId === "megaman").length === 1);
  ok("Jonesy has 7 entries", CAT.spirits.filter(s => s.familyId === "jonesy").length === 7);
  ok("mastery target is 70", CAT.masteryTarget === 70);
  ok("70-level reward is the Pixel Polli style",
     CAT.masteryRewards.find(r => r.level === 70).reward.includes("Pixel Polli"));

  /* -------------------------------------------------------------- done */
  console.log("\n" + "=".repeat(58));
  console.log(`PASS ${pass}   FAIL ${fail}`);
  if (fail) {
    console.log("\nFailures:");
    failures.forEach(f => console.log(" - " + f));
    process.exitCode = 1;
  }
})();
