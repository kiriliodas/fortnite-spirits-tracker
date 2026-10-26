/* =========================================================================
   COLLECTION DES ESPRITS — Fortnite Chapitre 7 · Saison 4 (Override)
   Vanilla JS, zéro dépendance, zéro requête réseau.

   Architecture
   ------------
   CATALOG  : catalogue immuable chargé depuis data/catalog.js
              (généré depuis data/spirits.json). Jamais modifié à l'exécution.
   STATE    : collection personnelle (owned / mastered / starting),
              persistée dans localStorage et exportable en JSON.

   Règles de maîtrise
   ------------------
   * Un esprit est maîtrisé au niveau 5 APRÈS extraction.
   * Maîtrise ⇒ possession : cocher « Maîtrisé » coche « Possédé ».
   * Retirer la possession d'un esprit maîtrisé retire sa maîtrise.
   * La progression compte des esprits UNIQUES : les fiches cochées ici
     + un compteur « déjà maîtrisés hors tracker » (0 par défaut).
   ========================================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- config */
  var APP_ID = "fortnite-spirits-tracker";
  var SCHEMA_VERSION = 2;
  var STORAGE_KEY = "fortnite-spirits-tracker.v2"; // NE PAS renommer
  var DEFAULT_STARTING_MASTERY = 0;                // nouvelle collection vierge

  var CATALOG = window.SPIRIT_CATALOG;
  var SOURCES = window.SPIRIT_SOURCES || [];

  var root = document.documentElement;

  if (!CATALOG || !Array.isArray(CATALOG.spirits)) {
    root.innerHTML =
      '<body style="font-family:sans-serif;background:#061426;color:#eef5ff;padding:40px">' +
      "<h1>Catalogue introuvable</h1><p>Le fichier data/catalog.js est absent ou corrompu. " +
      "Relance <code>python3 tools/build_catalog.py</code> puis recharge la page.</p></body>";
    return;
  }

  var SPIRITS = CATALOG.spirits;
  var TOTAL = SPIRITS.length;
  var MASTERY_TARGET = Number(CATALOG.masteryTarget) || 70;
  var REWARDS = Array.isArray(CATALOG.masteryRewards)
    ? CATALOG.masteryRewards.slice().sort(function (a, b) { return a.level - b.level; })
    : [];
  var CATALOG_VERSION = CATALOG.catalogVersion || "unknown";

  var byId = new Map();
  var variantOrder = new Map();
  var familyList = CATALOG.families || [];
  var familyById = new Map();
  var familyOrder = new Map();

  SPIRITS.forEach(function (s) { byId.set(s.id, s); });
  (CATALOG.variants || []).forEach(function (v, i) { variantOrder.set(v.id, i); });
  familyList.forEach(function (f, i) {
    familyById.set(f.id, f);
    familyOrder.set(f.id, i);
  });

  /* ----------------------------------------------------------------- utils */
  function $(id) { return document.getElementById(id); }
  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function clamp(n, min, max) { return n < min ? min : n > max ? max : n; }
  function nf(n) { return Number(n).toLocaleString("fr-FR"); }

  /* ------------------------------------------------------------ reward icons */
  var ICONS = {
    xp: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.4l2.7 5.7 6.2.8-4.6 4.3 1.2 6.1L12 17.4 6.5 20.3l1.2-6.1L3.1 9.9l6.2-.8z"/></svg>',
    dust: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.6l1.9 5.1 5.1 1.9-5.1 1.9L12 17.6l-1.9-5.1L5 10.6l5.1-1.9z"/><path d="M18.4 16.2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
    locator: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 21s6.4-6.1 6.4-10.6A6.4 6.4 0 0 0 5.6 10.4C5.6 14.9 12 21 12 21z"/><circle cx="12" cy="10.2" r="2.3"/></svg>',
    lucky: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><circle cx="12" cy="8" r="3.3"/><circle cx="12" cy="16" r="3.3"/><circle cx="8" cy="12" r="3.3"/><circle cx="16" cy="12" r="3.3"/></svg>',
    taco: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3.4 17.6a8.6 8.6 0 0 1 17.2 0z"/><path d="M7 14.4h.01M12 13.2h.01M17 14.6h.01"/></svg>',
    extractor: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4.4 9.6 12 4.6l7.6 5v9.8H4.4z"/><path d="M12 17.4v-5.2"/><path d="m9.6 14.2 2.4-2.4 2.4 2.4"/></svg>',
    accelerator: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m6.6 12.6 5.4-5.4 5.4 5.4"/><path d="m6.6 18 5.4-5.4 5.4 5.4"/></svg>',
    llama: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="4.4" y="7.4" width="15.2" height="11.2" rx="1.6"/><path d="M4.4 11.6h15.2M12 7.4v11.2"/><path d="M9.4 4.6 12 7.4l2.6-2.8"/></svg>',
    outfit: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M9 4.4 4.8 6.8l1.6 3.4 1.9-.8v9.2h7.4v-9.2l1.9.8 1.6-3.4L15 4.4a3 3 0 0 1-6 0z"/></svg>',
    style: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><path d="M16.5 13v7M13 16.5h7"/></svg>',
    sprite: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><circle cx="12" cy="12" r="7.6"/><path d="M9.2 10.4h.01M14.8 10.4h.01"/><path d="M9.6 14.4a3 3 0 0 0 4.8 0"/></svg>'
  };

  /* -------------------------------------------------------- search support */
  function norm(value) {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  // alias communs (EN + FR) : « esprit » doit trouver les Sprites, etc.
  var COMMON_ALIASES = "spirit spirits sprite sprites esprit esprits creature creatures pokemon pokedex collection compagnon";

  SPIRITS.forEach(function (s) {
    var fam = familyById.get(s.familyId) || {};
    var parts = [
      s.name, s.family, s.variant, s.variantId, s.rarity, s.series, s.id,
      (fam.aliases || []).join(" "),
      COMMON_ALIASES
    ];
    s._hay = norm(parts.join(" "));
    s._initials = (s.family || s.name).replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  });

  var SYNONYMS = {
    golden: "gold", golds: "gold", dore: "gold", doree: "gold", dorees: "gold", dores: "gold",
    cheats: "cheat", cheater: "cheat", triche: "cheat", tricheur: "cheat",
    maitrise: "mastered", maitrisee: "mastered", maitrisees: "mastered", maitrises: "mastered",
    possede: "owned", possedee: "owned", possedees: "owned", possedes: "owned",
    manquant: "missing", manquants: "missing", manquante: "missing"
  };

  function searchTokens(query) {
    return norm(query).split(" ").filter(Boolean).map(function (t) { return SYNONYMS[t] || t; });
  }

  function matchesQuery(spirit, tokens) {
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (spirit._hay.indexOf(t) !== -1) continue;
      if (t.length > 3 && t.slice(-1) === "s" && spirit._hay.indexOf(t.slice(0, -1)) !== -1) continue;
      return false;
    }
    return true;
  }

  /* ---------------------------------------------------------------- state */
  function blankState() {
    return {
      owned: new Set(),
      mastered: new Set(),
      starting: DEFAULT_STARTING_MASTERY,
      unknown: new Map(),
      savedAt: null
    };
  }

  var state = blankState();

  function hasAnyData(st) {
    return !!(st && (st.owned.size || st.mastered.size || st.unknown.size || st.starting));
  }

  /** Garde l'invariant mastered ⊆ owned. */
  function enforceInvariant(st) {
    Array.from(st.mastered).forEach(function (id) {
      if (!st.owned.has(id)) st.mastered.delete(id);
    });
    return st;
  }

  function saveState() {
    try {
      var payload = serialize(state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      state.savedAt = payload.exportedAt;
    } catch (err) {
      toast("Impossible d'écrire dans le stockage du navigateur (plein ou bloqué). Pense à exporter une sauvegarde.", "error");
    }
  }

  function loadState() {
    var fresh = blankState();
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (err) { return fresh; }
    if (!raw) return fresh;
    var data;
    try { data = JSON.parse(raw); } catch (err) { return fresh; }
    var parsed = parseCollectionFile(data, { silent: true });
    if (!parsed.ok) return fresh;
    parsed.result.unknown.forEach(function (v, k) { fresh.unknown.set(k, v); });
    return enforceInvariant(parsed.result);
  }

  /* --------------------------------------------------------- (de)serialize */
  function serialize(st) {
    var spirits = {};
    var ids = new Set();
    st.owned.forEach(function (id) { ids.add(id); });
    st.mastered.forEach(function (id) { ids.add(id); });

    Array.from(ids)
      .filter(function (id) { return byId.has(id); })
      .sort()
      .forEach(function (id) {
        var entry = { owned: st.owned.has(id), mastered: st.mastered.has(id) };
        if (entry.mastered) entry.owned = true;
        spirits[id] = entry;
      });

    var unknown = {};
    st.unknown.forEach(function (v, k) { unknown[k] = { owned: !!v.owned, mastered: !!v.mastered }; });

    var trackedMastered = st.mastered.size;
    var payload = {
      app: APP_ID,
      schemaVersion: SCHEMA_VERSION,
      catalogVersion: CATALOG_VERSION,
      exportedAt: new Date().toISOString(),
      summary: {
        owned: st.owned.size,
        mastered: trackedMastered,
        startingMastery: st.starting,
        totalMastered: st.starting + trackedMastered,
        masteryTarget: MASTERY_TARGET,
        catalogEntries: TOTAL
      },
      settings: { startingMastery: st.starting },
      spirits: spirits
    };
    if (Object.keys(unknown).length) payload.unmatchedSpirits = unknown;
    return payload;
  }

  /**
   * Accepte les exports v2, v1 (id -> booléen) et les tableaux d'identifiants.
   * Retourne toujours un objet résultat ; ne lève jamais d'exception.
   */
  function parseCollectionFile(data, opts) {
    opts = opts || {};
    var fail = function (message) { return { ok: false, error: message }; };

    if (data === null || typeof data !== "object") return fail("Le fichier n'est pas un objet JSON.");
    if (Array.isArray(data)) data = { schemaVersion: 1, spirits: data };

    var version = Number(data.schemaVersion);
    if (!isFinite(version)) version = data.spirits || data.collection ? 1 : NaN;
    if (!isFinite(version)) return fail("Aucune version de schéma et aucune collection lisible dans ce fichier.");
    if (version < 1) return fail("Version de schéma " + version + " non prise en charge.");

    var warnings = [];
    if (version > SCHEMA_VERSION) {
      warnings.push(
        "Fichier produit par une version plus récente du tracker (schéma v" + version +
        "). Les champs reconnus ont été restaurés, le reste a été ignoré."
      );
    }

    var rawSpirits = data.spirits || data.collection;
    var result = blankState();
    var matched = 0;
    var unmatchedIds = [];

    function put(id, owned, mastered) {
      if (typeof id !== "string" || !id) return;
      owned = !!owned;
      mastered = !!mastered;
      if (mastered) owned = true;
      if (!owned && !mastered) return;
      if (byId.has(id)) {
        matched++;
        if (owned) result.owned.add(id);
        if (mastered) result.mastered.add(id);
      } else {
        unmatchedIds.push(id);
        result.unknown.set(id, { owned: owned, mastered: mastered });
      }
    }

    if (rawSpirits && typeof rawSpirits === "object") {
      if (Array.isArray(rawSpirits)) {
        rawSpirits.forEach(function (id) {
          if (typeof id === "string") put(id, true, false);
          else if (id && typeof id === "object" && id.id) put(id.id, id.owned !== false, id.mastered);
        });
      } else {
        Object.keys(rawSpirits).forEach(function (id) {
          var v = rawSpirits[id];
          if (typeof v === "boolean") put(id, v, false);
          else if (v && typeof v === "object") put(id, v.owned, v.mastered);
          else if (v === null) put(id, true, false);
        });
      }
    } else if (data.spirits !== undefined || data.collection !== undefined) {
      return fail("Le champ « spirits » est présent mais n'est ni un objet ni un tableau.");
    }

    var starting = null;
    if (data.settings && typeof data.settings.startingMastery !== "undefined") starting = Number(data.settings.startingMastery);
    else if (typeof data.startingMastery !== "undefined") starting = Number(data.startingMastery);
    else if (data.summary && typeof data.summary.startingMastery !== "undefined") starting = Number(data.summary.startingMastery);

    if (starting !== null && isFinite(starting)) {
      result.starting = clamp(Math.round(starting), 0, TOTAL);
    } else if (!opts.silent) {
      result.starting = state.starting;
    }

    if (data.catalogVersion && data.catalogVersion !== CATALOG_VERSION && !opts.silent) {
      warnings.push(
        "Sauvegarde issue du catalogue « " + String(data.catalogVersion).slice(0, 40) +
        " » (cette version utilise « " + CATALOG_VERSION + " »). Les fiches encore présentes ont été associées par identifiant."
      );
    }

    if (!matched && !unmatchedIds.length && data.settings === undefined && !data.summary) {
      return fail("Aucune fiche d'esprit n'a été reconnue dans ce fichier.");
    }

    if (unmatchedIds.length && !opts.silent) {
      warnings.push(
        unmatchedIds.length + (unmatchedIds.length === 1 ? " fiche n'a pas pu être associée" : " fiches n'ont pas pu être associées") +
        " au catalogue actuel : elles ont été conservées, pas supprimées."
      );
    }

    if (data.unmatchedSpirits && typeof data.unmatchedSpirits === "object") {
      Object.keys(data.unmatchedSpirits).forEach(function (id) {
        if (byId.has(id)) return;
        var v = data.unmatchedSpirits[id] || {};
        result.unknown.set(id, { owned: !!v.owned, mastered: !!v.mastered });
      });
    }

    return {
      ok: true,
      result: enforceInvariant(result),
      warnings: warnings,
      unmatched: unmatchedIds,
      matched: matched
    };
  }

  /* ------------------------------------------------------------ UI state */
  var ui = { query: "", filter: "all", sort: "family", family: "all", variant: "all" };

  var el = {
    grid: $("grid"),
    empty: $("emptyState"),
    search: $("search"),
    clearSearch: $("clearSearch"),
    sort: $("sort"),
    familyFilter: $("familyFilter"),
    variantFilter: $("variantFilter"),
    resultCount: $("resultCount"),
    masteredTotal: $("masteredTotal"),
    masteryTarget: $("masteryTarget"),
    remaining: $("remainingLabel"),
    percent: $("progressPercent"),
    bar: $("progressBar"),
    barFill: $("barFill"),
    rewardStatus: $("rewardStatus"),
    rewardStatusText: $("rewardStatusText"),
    nextRewardName: $("nextRewardName"),
    nextRewardMeta: $("nextRewardMeta"),
    milestone: $("milestoneLabel"),
    rewardRail: $("rewardRail"),
    rewardCount: $("rewardCount"),
    startingText: $("startingText"),
    statOwned: $("statOwned"),
    statMastered: $("statMastered"),
    statMissing: $("statMissing"),
    statCompletion: $("statCompletion"),
    settingsDialog: $("settingsDialog"),
    reportDialog: $("reportDialog"),
    reportBody: $("reportBody"),
    importFile: $("importFile"),
    toastWrap: $("toastWrap")
  };

  /* ------------------------------------------------------------- rendering */
  var STATUS_RANK = { mastered: 0, owned: 1, missing: 2 };
  var STATUS_LABEL = { mastered: "Maîtrisé", owned: "Possédé", missing: "Manquant" };

  function statusOf(id) {
    if (state.mastered.has(id)) return "mastered";
    return state.owned.has(id) ? "owned" : "missing";
  }

  function passesFilter(spirit) {
    var owned = state.owned.has(spirit.id);
    var mastered = state.mastered.has(spirit.id);
    switch (ui.filter) {
      case "owned": return owned;
      case "missing": return !owned;
      case "mastered": return mastered;
      case "unmastered": return !mastered;
      case "owned-unmastered": return owned && !mastered;
      default: return true;
    }
  }

  function currentList() {
    var tokens = searchTokens(ui.query);
    return SPIRITS.filter(function (s) {
      if (ui.family !== "all" && s.familyId !== ui.family) return false;
      if (ui.variant !== "all" && s.variantId !== ui.variant) return false;
      if (tokens.length && !matchesQuery(s, tokens)) return false;
      return passesFilter(s);
    });
  }

  function sortByFamily(a, b) {
    var fa = familyOrder.get(a.familyId), fb = familyOrder.get(b.familyId);
    if (fa !== fb) return (fa || 0) - (fb || 0);
    return (variantOrder.get(a.variantId) || 0) - (variantOrder.get(b.variantId) || 0);
  }

  function sortList(list) {
    if (ui.sort === "az") {
      return list.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    if (ui.sort === "status") {
      return list.slice().sort(function (a, b) {
        var d = STATUS_RANK[statusOf(a.id)] - STATUS_RANK[statusOf(b.id)];
        return d !== 0 ? d : a.name.localeCompare(b.name);
      });
    }
    return list.slice().sort(sortByFamily);
  }

  function cardHTML(s) {
    var st = statusOf(s.id);
    var owned = st !== "missing";
    var mastered = st === "mastered";
    var classes = "card rarity-" + String(s.rarity || "").toLowerCase() +
      (mastered ? " is-mastered is-owned" : owned ? " is-owned" : "");
    var showSeries = s.series && s.series !== "Fortnite";
    var stateLabel = mastered ? "Maîtrisé" : owned ? "Possédé" : "Manquant";

    return (
      '<article class="' + classes + '" data-card-id="' + esc(s.id) + '" data-status="' + st + '">' +
        '<div class="thumb">' +
          '<img src="' + esc(s.image) + '" alt="' + esc(s.name) + '" loading="lazy" decoding="async" width="300" height="300" data-initials="' + esc(s._initials) + '">' +
          '<span class="vchip" data-variant="' + esc(s.variantId) + '">' + esc(s.variant) + "</span>" +
          (showSeries ? '<span class="series-tag" title="Crossover ' + esc(s.series) + '">' + esc(s.series) + "</span>" : "") +
          '<span class="state-tag" data-state="' + st + '">' + stateLabel + "</span>" +
          (mastered ? '<span class="crown" title="Maîtrisé (niveau 5 extrait)" aria-label="Maîtrisé"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M3 8.5l3.6 2.7L12 5l5.4 6.2L21 8.5 19.2 18H4.8z"/></svg></span>' : "") +
          '<span class="rarity-bar" aria-hidden="true"></span>' +
        "</div>" +
        '<div class="card-body">' +
          '<h3 class="card-title" title="' + esc(s.name) + '">' + esc(s.name) + "</h3>" +
          '<p class="card-meta">' + esc(s.family) + " · " + esc(s.rarity) + "</p>" +
          '<div class="card-controls">' +
            '<label class="toggle toggle-owned' + (owned ? " is-on" : "") + '" title="J\'ai cet esprit dans ma collection">' +
              '<input type="checkbox" data-id="' + esc(s.id) + '" data-kind="owned" aria-label="Marquer ' + esc(s.name) + ' comme possédé"' + (owned ? " checked" : "") + ">" +
              "<span>Possédé</span>" +
            "</label>" +
            '<label class="toggle toggle-mastered' + (mastered ? " is-on" : "") + '" title="Niveau 5 atteint puis extrait">' +
              '<input type="checkbox" data-id="' + esc(s.id) + '" data-kind="mastered" aria-label="Marquer ' + esc(s.name) + ' comme maîtrisé (niveau 5, extrait)"' + (mastered ? " checked" : "") + ">" +
              "<span>Maîtrisé</span>" +
            "</label>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function familyHeaderHTML(famId, items) {
    var fam = familyById.get(famId) || { name: famId, rarity: "", series: "" };
    var owned = items.filter(function (s) { return state.owned.has(s.id); }).length;
    var mastered = items.filter(function (s) { return state.mastered.has(s.id); }).length;
    var total = fam.entryCount || items.length;
    var cls = "family-progress";
    if (mastered === total) cls += " is-mastered";
    else if (owned === total) cls += " is-complete";

    return (
      '<div class="family-head" data-rarity="' + esc(String(fam.rarity || "").toLowerCase()) + '">' +
        '<span class="family-name">' + esc(fam.name) + "</span>" +
        '<span class="family-sub">' + esc(fam.rarity || "") +
          (fam.series && fam.series !== "Fortnite" ? " · " + esc(fam.series) : "") + "</span>" +
        '<span class="' + cls + '" data-family-progress="' + esc(famId) + '" title="Possédés / maîtrisés sur ' + total + '">' +
          owned + "/" + total + " · " + mastered + " &starf;" +
        "</span>" +
      "</div>"
    );
  }

  function refreshAnimation() {
    if (!el.grid) return;
    el.grid.classList.remove("is-refreshing");
    void el.grid.offsetWidth;
    el.grid.classList.add("is-refreshing");
    window.setTimeout(function () { el.grid.classList.remove("is-refreshing"); }, 260);
  }

  function renderGrid(opts) {
    opts = opts || {};
    var list = currentList();
    var sorted = sortList(list);

    var countText = sorted.length === TOTAL && !ui.query && ui.filter === "all" &&
      ui.family === "all" && ui.variant === "all"
      ? TOTAL + " esprits"
      : sorted.length + " sur " + TOTAL + " esprits";
    el.resultCount.innerHTML = "<b>" + countText + "</b>";

    el.empty.hidden = sorted.length !== 0;
    if (!sorted.length) {
      el.grid.innerHTML = "";
      return;
    }

    if (ui.sort === "family") {
      var byFamily = new Map();
      sorted.forEach(function (s) {
        if (!byFamily.has(s.familyId)) byFamily.set(s.familyId, []);
        byFamily.get(s.familyId).push(s);
      });
      var html = "";
      byFamily.forEach(function (items, famId) {
        html +=
          '<section class="family" aria-label="Famille ' + esc((familyById.get(famId) || {}).name || famId) + '">' +
          familyHeaderHTML(famId, items) +
          '<div class="family-grid">' + items.map(cardHTML).join("") + "</div>" +
          "</section>";
      });
      el.grid.innerHTML = html;
    } else {
      el.grid.innerHTML = '<div class="grid-plain">' + sorted.map(cardHTML).join("") + "</div>";
    }

    if (opts.animate) refreshAnimation();
  }

  /* -------------------------------------------------------- progression */
  function effectiveMastered() { return state.starting + state.mastered.size; }

  function rewardStateOf(reward, effective) {
    if (reward.level <= effective) return "claimed";
    return reward.id === nextRewardId(effective) ? "next" : "locked";
  }

  function nextRewardId(effective) {
    for (var i = 0; i < REWARDS.length; i++) {
      if (REWARDS[i].level > effective) return REWARDS[i].id;
    }
    return null;
  }

  function nextRewardFor(effective) {
    for (var i = 0; i < REWARDS.length; i++) {
      if (REWARDS[i].level > effective) return REWARDS[i];
    }
    return null;
  }

  /** Centre un palier dans le rail (calcul de distance robuste). */
  function centerRailNode(node, smooth) {
    var rail = el.rewardRail;
    if (!node || !rail) return;
    var nr = node.getBoundingClientRect();
    var rr = rail.getBoundingClientRect();
    if (!rr.width) return;
    var delta = (nr.left - rr.left) - (rr.width - nr.width) / 2;
    var max = Math.max(0, rail.scrollWidth - rail.clientWidth);
    var target = Math.max(0, Math.min(max, rail.scrollLeft + delta));
    if (rail.scrollTo) rail.scrollTo({ left: target, behavior: smooth === false ? "auto" : "smooth" });
    else rail.scrollLeft = target;
  }

  function lastClaimedNode() {
    var claimed = el.rewardRail.querySelectorAll('[data-state="claimed"]');
    return claimed.length ? claimed[claimed.length - 1] : null;
  }

  function renderRewards(effective, scrollToNext) {
    if (!el.rewardRail) return;
    var nextId = nextRewardId(effective);
    var html = REWARDS.map(function (r) {
      var st = r.level <= effective ? "claimed" : r.id === nextId ? "next" : "locked";
      var icon = r.image
        ? '<img src="' + esc(r.image) + '" alt="" loading="lazy" decoding="async" width="64" height="64">'
        : (ICONS[r.type] || ICONS.sprite);
      var stateText = st === "claimed" ? "obtenu" : st === "next" ? "prochain palier" : "verrouillé";
      return (
        '<div class="rw' + (r.featured ? " is-featured" : "") + '" data-state="' + st + '" data-type="' + esc(r.type) + '" data-reward-id="' + esc(r.id) + '"' +
          ' role="listitem" tabindex="0" aria-label="' + esc(r.reward) + ' — ' + r.level + ' esprits maîtrisés, ' + stateText + '">' +
          (st === "next" ? '<span class="rw-flag">Suivant</span>' : "") +
          '<span class="rw-check" aria-hidden="true"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11"/></svg></span>' +
          '<span class="rw-icon" aria-hidden="true">' + icon +
            '<span class="rw-threshold">' + r.level + "</span>" +
          "</span>" +
          '<span class="rw-name">' + esc(r.short || r.reward) + "</span>" +
        "</div>"
      );
    }).join("");
    el.rewardRail.innerHTML = html;
    if (el.rewardCount) el.rewardCount.textContent = REWARDS.length;

    if (scrollToNext) {
      centerRailNode(el.rewardRail.querySelector('[data-state="next"]') || lastClaimedNode(),
                     scrollToNext !== "instant");
    }
  }

  var lastMasteredShown = null;

  function bump(node) {
    if (!node) return;
    node.classList.remove("is-bumped");
    void node.offsetWidth;
    node.classList.add("is-bumped");
    window.setTimeout(function () { node.classList.remove("is-bumped"); }, 420);
  }

  function updateProgress(opts) {
    opts = opts || {};
    var tracked = state.mastered.size;
    var base = state.starting;
    var effective = base + tracked;
    var remaining = Math.max(0, MASTERY_TARGET - effective);
    var pct = clamp((effective / MASTERY_TARGET) * 100, 0, 100);

    el.masteredTotal.textContent = effective;
    if (lastMasteredShown !== null && lastMasteredShown !== effective && opts.animate) {
      bump(el.masteredTotal);
      bump(el.statMastered);
    }
    lastMasteredShown = effective;
    el.masteryTarget.textContent = MASTERY_TARGET;
    if (el.percent) el.percent.textContent = Math.round(pct);

    el.remaining.textContent = remaining > 0
      ? remaining + (remaining === 1 ? " esprit encore à maîtriser" : " esprits encore à maîtriser")
      : "Objectif atteint — récompense débloquée";

    el.barFill.style.width = pct.toFixed(2) + "%";
    el.bar.setAttribute("aria-valuenow", String(Math.min(effective, MASTERY_TARGET)));
    el.bar.setAttribute("aria-valuemax", String(MASTERY_TARGET));

    var unlocked = effective >= MASTERY_TARGET;
    el.rewardStatus.dataset.state = unlocked ? "unlocked" : "locked";
    el.rewardStatusText.textContent = unlocked
      ? "Objectif atteint"
      : "Palier final : " + MASTERY_TARGET;

    var next = nextRewardFor(effective);
    if (el.nextRewardName) {
      el.nextRewardName.textContent = next ? next.reward : "Tous les paliers sont atteints";
    }
    if (el.nextRewardMeta) {
      if (next) {
        var delta = next.level - effective;
        el.nextRewardMeta.textContent = "palier " + next.level + " · encore " + delta +
          (delta === 1 ? " esprit" : " esprits");
      } else {
        el.nextRewardMeta.textContent = "";
      }
    }
    if (el.milestone) {
      var claimedTiers = REWARDS.filter(function (r) { return r.level <= effective; });
      var last = claimedTiers.length ? claimedTiers[claimedTiers.length - 1] : null;
      el.milestone.textContent = last
        ? "Dernier palier atteint : " + (last.short || last.reward) + " (" + last.level + ")"
        : "Aucun palier atteint pour l'instant";
    }

    var parts = [];
    if (base > 0) parts.push(base + " déjà maîtrisé" + (base === 1 ? "" : "s") + " hors tracker");
    else parts.push("Aucun esprit pré-coché : la collection démarre vierge");
    if (tracked) parts.push(tracked + " coché" + (tracked === 1 ? "" : "s") + " dans le tracker");
    if (effective > TOTAL) parts.push("⚠ au-delà des " + TOTAL + " fiches du catalogue");
    el.startingText.textContent = parts.join(" · ");

    var owned = state.owned.size;
    el.statOwned.innerHTML = owned + '<span class="stat-total">/' + TOTAL + "</span>";
    el.statMastered.textContent = tracked;
    el.statMissing.textContent = TOTAL - owned;
    el.statCompletion.innerHTML = Math.round((owned / TOTAL) * 100) + '<span class="stat-total">%</span>';

    renderRewards(effective, opts.scrollRail);
  }

  function updateChips() {
    var counts = {
      all: TOTAL,
      owned: state.owned.size,
      missing: TOTAL - state.owned.size,
      mastered: state.mastered.size,
      unmastered: TOTAL - state.mastered.size,
      "owned-unmastered": state.owned.size - state.mastered.size
    };
    document.querySelectorAll(".chip").forEach(function (chip) {
      var key = chip.dataset.filter;
      if (!chip.dataset.label) chip.dataset.label = chip.textContent.replace(/\s*\d+$/, "").trim();
      chip.innerHTML = esc(chip.dataset.label) + ' <span class="n">' + (counts[key] != null ? counts[key] : "") + "</span>";
      var active = key === ui.filter;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function updateFamilyHeaders() {
    document.querySelectorAll("[data-family-progress]").forEach(function (node) {
      var famId = node.dataset.familyProgress;
      var items = SPIRITS.filter(function (s) { return s.familyId === famId; });
      var owned = items.filter(function (s) { return state.owned.has(s.id); }).length;
      var mastered = items.filter(function (s) { return state.mastered.has(s.id); }).length;
      var total = items.length;
      node.innerHTML = owned + "/" + total + " · " + mastered + " &starf;";
      node.classList.toggle("is-mastered", mastered === total);
      node.classList.toggle("is-complete", owned === total && mastered !== total);
    });
  }

  function updateCardDOM(id) {
    var sel = '[data-card-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]';
    var node = el.grid.querySelector(sel);
    if (!node) return;

    var st = statusOf(id);
    var owned = st !== "missing";
    var mastered = st === "mastered";

    node.classList.toggle("is-owned", owned);
    node.classList.toggle("is-mastered", mastered);
    node.dataset.status = st;

    node.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
      var isOwnedBox = cb.dataset.kind === "owned";
      cb.checked = isOwnedBox ? owned : mastered;
      cb.closest(".toggle").classList.toggle("is-on", isOwnedBox ? owned : mastered);
    });

    var tag = node.querySelector(".state-tag");
    if (tag) {
      tag.dataset.state = st;
      tag.textContent = STATUS_LABEL[st];
    }

    var crown = node.querySelector(".crown");
    if (mastered && !crown) {
      var thumb = node.querySelector(".thumb");
      if (thumb) {
        var span = document.createElement("span");
        span.className = "crown";
        span.setAttribute("title", "Maîtrisé (niveau 5 extrait)");
        span.setAttribute("aria-label", "Maîtrisé");
        span.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M3 8.5l3.6 2.7L12 5l5.4 6.2L21 8.5 19.2 18H4.8z"/></svg>';
        var bar = thumb.querySelector(".rarity-bar");
        if (bar) thumb.insertBefore(span, bar); else thumb.appendChild(span);
      }
    } else if (!mastered && crown) {
      crown.remove();
    }
  }

  function flashCard(id, kind) {
    var node = el.grid.querySelector('[data-card-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (!node) return;
    var cls = kind === "mastered" ? "pop-mastered" : "pop-owned";
    node.classList.remove("pop-owned", "pop-mastered");
    // force reflow so the animation can replay
    void node.offsetWidth;
    node.classList.add(cls);
    window.setTimeout(function () { node.classList.remove(cls); }, 800);
  }

  function renderAll(opts) {
    renderGrid();
    updateProgress({ scrollRail: (opts && opts.scrollRail) || "instant" });
    updateChips();
  }

  /* --------------------------------------------------------- interactions */
  function setOwned(id, value) {
    if (!byId.has(id)) return false;
    var lostMastery = false;
    if (value) {
      state.owned.add(id);
    } else {
      state.owned.delete(id);
      if (state.mastered.delete(id)) lostMastery = true;
    }
    return lostMastery;
  }

  function setMastered(id, value) {
    if (!byId.has(id)) return;
    if (value) {
      state.mastered.add(id);
      state.owned.add(id);
    } else {
      state.mastered.delete(id);
    }
  }

  function afterChange(id, opts) {
    opts = opts || {};
    saveState();
    updateProgress({ scrollRail: false, animate: true });
    updateChips();

    if (ui.filter !== "all" || ui.sort === "status") {
      renderGrid();
    }
    if (id) {
      updateCardDOM(id);
      if (opts.flash) flashCard(id, opts.flash);
    }
    updateFamilyHeaders();
    if (opts.message) toast(opts.message, "warn");
  }

  el.grid.addEventListener("change", function (event) {
    var cb = event.target.closest("input[type=checkbox]");
    if (!cb) return;
    var id = cb.dataset.id;
    var kind = cb.dataset.kind;

    if (kind === "owned") {
      var lostMastery = setOwned(id, cb.checked);
      cb.closest(".toggle").classList.toggle("is-on", cb.checked);
      afterChange(id, {
        flash: cb.checked ? "owned" : null,
        message: lostMastery ? "Maîtrise retirée : un esprit maîtrisé doit aussi être possédé." : null
      });
    } else {
      setMastered(id, cb.checked);
      cb.closest(".toggle").classList.toggle("is-on", cb.checked);
      afterChange(id, { flash: cb.checked ? "mastered" : null });
    }
  });

  // image indisponible → repli lisible, la fiche reste affichée
  el.grid.addEventListener("error", function (event) {
    var img = event.target;
    if (!img || img.tagName !== "IMG" || img.dataset.failed) return;
    img.dataset.failed = "1";
    img.style.display = "none";
    var wrap = img.parentElement;
    if (!wrap || wrap.querySelector(".img-fallback")) return;
    var fb = document.createElement("div");
    fb.className = "img-fallback";
    fb.style.cssText = "display:grid;place-items:center;gap:4px;padding:10px;text-align:center;color:#7e97b8;font-size:10px";
    fb.innerHTML = "<span style=\"font-family:var(--font-display);font-size:20px;color:#9fe3ff\">" +
      esc(img.dataset.initials || "?") + "</span>Image indisponible";
    wrap.appendChild(fb);
  }, true);

  /* recherche / filtres / tri */
  var searchTimer = null;
  el.search.addEventListener("input", function () {
    ui.query = el.search.value;
    el.clearSearch.hidden = !ui.query;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function () { renderGrid({ animate: true }); }, 70);
  });

  el.clearSearch.addEventListener("click", function () {
    ui.query = "";
    el.search.value = "";
    el.clearSearch.hidden = true;
    el.search.focus();
    renderGrid({ animate: true });
  });

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      ui.filter = chip.dataset.filter;
      updateChips();
      renderGrid({ animate: true });
    });
  });

  el.sort.addEventListener("change", function () {
    ui.sort = el.sort.value;
    renderGrid({ animate: true });
  });

  if (el.familyFilter) {
    el.familyFilter.addEventListener("change", function () {
      ui.family = el.familyFilter.value;
      renderGrid({ animate: true });
    });
  }
  if (el.variantFilter) {
    el.variantFilter.addEventListener("change", function () {
      ui.variant = el.variantFilter.value;
      renderGrid({ animate: true });
    });
  }

  $("resetViewBtn").addEventListener("click", function () {
    ui.query = "";
    ui.filter = "all";
    ui.sort = "family";
    ui.family = "all";
    ui.variant = "all";
    el.search.value = "";
    el.sort.value = "family";
    if (el.familyFilter) el.familyFilter.value = "all";
    if (el.variantFilter) el.variantFilter.value = "all";
    el.clearSearch.hidden = true;
    updateChips();
    renderGrid({ animate: true });
  });

  // « / » focus recherche, « Échap » vide la recherche
  document.addEventListener("keydown", function (event) {
    var tag = (event.target.tagName || "").toLowerCase();
    var typing = tag === "input" || tag === "textarea" || tag === "select" || event.target.isContentEditable;
    if (event.key === "/" && !typing) {
      event.preventDefault();
      el.search.focus();
      el.search.select();
    } else if (event.key === "Escape" && event.target === el.search && el.search.value) {
      ui.query = "";
      el.search.value = "";
      el.clearSearch.hidden = true;
      renderGrid();
    }
  });

  /* -------------------------------------------------------------- toasts */
  function toast(message, kind) {
    if (!el.toastWrap) return;
    var node = document.createElement("div");
    node.className = "toast";
    node.dataset.kind = kind || "info";
    node.textContent = message;
    el.toastWrap.appendChild(node);
    window.setTimeout(function () {
      node.style.transition = "opacity 200ms";
      node.style.opacity = "0";
      window.setTimeout(function () { node.remove(); }, 220);
    }, kind === "error" ? 5200 : 3200);
  }

  /* ---------------------------------------------------------- confirmation */
  function confirmAction(opts) {
    var dlg = $("confirmDialog");
    var okBtn = $("confirmOk");
    $("confirmTitle").textContent = opts.title || "Confirmer";
    $("confirmBody").textContent = opts.body || "";
    okBtn.textContent = opts.confirmLabel || "Confirmer";
    okBtn.classList.toggle("is-danger", !!opts.danger);
    $("confirmCancel").textContent = opts.cancelLabel || "Annuler";

    if (!dlg || typeof dlg.showModal !== "function") {
      return Promise.resolve(window.confirm((opts.title || "") + "\n\n" + (opts.body || "")));
    }

    return new Promise(function (resolve) {
      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        try { dlg.close(); } catch (e) {}
        resolve(value);
      }
      okBtn.onclick = function () { finish(true); };
      $("confirmCancel").onclick = function () { finish(false); };
      dlg.oncancel = function (event) { event.preventDefault(); finish(false); };
      dlg.onclose = function () { finish(false); };
      dlg.showModal();
      window.setTimeout(function () { okBtn.focus(); }, 30);
    });
  }

  /* -------------------------------------------------------- export / import */
  function slugDate() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function exportCollection() {
    var payload = serialize(state);
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "fortnite-esprits-collection-" + slugDate() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast("Export : " + payload.summary.owned + " possédés · " + payload.summary.totalMastered +
      " maîtrisés (objectif " + MASTERY_TARGET + ").", "success");
  }

  function readFileText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Le fichier n'a pas pu être lu.")); };
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.readAsText(file);
    });
  }

  async function importFile(file) {
    if (!file) return;

    var text;
    try {
      text = (await readFileText(file)).trim();
    } catch (err) {
      showReport({ ok: false, error: err.message });
      return;
    }

    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      showReport({ ok: false, error: "Ce fichier n'est pas du JSON valide. " + (err && err.message ? err.message : "") });
      return;
    }

    var parsed = parseCollectionFile(data, {});
    if (!parsed.ok) {
      showReport({ ok: false, error: parsed.error });
      return;
    }

    if (hasAnyData(state)) {
      var proceed = await confirmAction({
        title: "Remplacer ta collection ?",
        body: "L'import remplace ce qui est enregistré dans ce navigateur.\n\n" +
          "Actuellement : " + state.owned.size + " possédés, " + (state.starting + state.mastered.size) + " maîtrisés.\n" +
          "Fichier : " + parsed.result.owned.size + " possédés, " +
          (parsed.result.starting + parsed.result.mastered.size) + " maîtrisés.",
        confirmLabel: "Importer et remplacer"
      });
      if (!proceed) return;
    }

    state = parsed.result;
    state.savedAt = new Date().toISOString();
    saveState();
    renderAll();
    syncSettingsUI();
    showReport({
      ok: true,
      matched: parsed.matched,
      owned: state.owned.size,
      mastered: state.starting + state.mastered.size,
      tracked: state.mastered.size,
      starting: state.starting,
      warnings: parsed.warnings,
      unmatched: parsed.unmatched
    });
  }

  function showReport(info) {
    var body = el.reportBody;
    if (!info.ok) {
      body.innerHTML =
        '<p class="err">Import impossible</p>' +
        "<p>" + esc(info.error || "Erreur inconnue.") + "</p>" +
        '<p class="hint">Ta collection actuelle n\'a pas été modifiée. L\'import attend le fichier JSON produit par « Exporter ».</p>';
    } else {
      var html =
        '<p class="ok">Collection importée.</p>' +
        '<ul class="source-list">' +
        "<li><strong>" + info.owned + "</strong> esprits possédés</li>" +
        "<li><strong>" + info.tracked + "</strong> cochés maîtrisés ici + <strong>" + info.starting +
          "</strong> déjà maîtrisés hors tracker = <strong>" + info.mastered + "</strong> / " + MASTERY_TARGET + " vers la récompense</li>" +
        "<li><strong>" + info.matched + "</strong> fiches associées au catalogue actuel</li>" +
        "</ul>";
      if (info.warnings && info.warnings.length) {
        html += '<p class="warn">À noter</p><ul class="source-list">' +
          info.warnings.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>";
      }
      if (info.unmatched && info.unmatched.length) {
        html += '<p class="hint">Fiches conservées mais non affichées (absentes du catalogue ' + esc(CATALOG_VERSION) + ") :</p>" +
          '<ul class="report-list">' + info.unmatched.slice(0, 60).map(function (id) {
            return "<li>" + esc(id) + "</li>";
          }).join("") + (info.unmatched.length > 60 ? "<li>…et " + (info.unmatched.length - 60) + " autres</li>" : "") + "</ul>";
      }
      body.innerHTML = html;
    }
    if (typeof el.reportDialog.showModal === "function") el.reportDialog.showModal();
    else toast(info.ok ? "Collection importée." : "Import impossible : " + info.error, info.ok ? "success" : "error");
  }

  /* ------------------------------------------------------------- réglages */
  function syncSettingsUI() {
    var input = $("startingInput");
    if (input) input.value = state.starting;

    $("dataSummary").textContent =
      state.owned.size + " possédés · " + state.mastered.size + " maîtrisés ici · " +
      state.starting + " déjà maîtrisés hors tracker · enregistré " +
      (state.savedAt ? new Date(state.savedAt).toLocaleString("fr-FR") : "pas encore");

    var unknownNode = $("unknownEntries");
    if (unknownNode) {
      if (state.unknown.size) {
        unknownNode.hidden = false;
        var ids = Array.from(state.unknown.keys());
        unknownNode.textContent = ids.length + " fiche(s) importée(s) absente(s) du catalogue " +
          CATALOG_VERSION + " (conservées à l'export) : " + ids.slice(0, 8).join(", ") + (ids.length > 8 ? "…" : "");
      } else {
        unknownNode.hidden = true;
        unknownNode.textContent = "";
      }
    }

    $("catalogSummary").textContent =
      "Fortnite " + (CATALOG.chapter || "") + " " + (CATALOG.season || "") + " « " + (CATALOG.seasonName || "") +
      " » · " + TOTAL + " fiches · " + familyList.length + " familles · " + REWARDS.length +
      " paliers de maîtrise · catalogue " + CATALOG_VERSION + " · vérifié le " +
      (CATALOG.verifiedOn || "—") + " (patch " + (CATALOG.patch || "—") + ")";

    var list = $("sourceList");
    if (list && !list.childElementCount) {
      list.innerHTML = SOURCES.map(function (s) {
        return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(s.name) + "</a> — " + esc(s.usedFor || "") + "</li>";
      }).join("");
    }

    var disclosure = $("disclosureText");
    if (disclosure && Array.isArray(CATALOG.notes)) {
      disclosure.innerHTML = CATALOG.notes.map(function (n) {
        return "<li>" + esc(n) + "</li>";
      }).join("");
    }
  }

  el.settingsDialog.addEventListener("submit", function (event) {
    event.preventDefault();
    el.settingsDialog.close();
  });

  function openSettings() {
    syncSettingsUI();
    if (typeof el.settingsDialog.showModal === "function") el.settingsDialog.showModal();
    else el.settingsDialog.setAttribute("open", "");
  }

  $("settingsBtn").addEventListener("click", openSettings);
  $("editStartingBtn").addEventListener("click", function () {
    openSettings();
    var input = $("startingInput");
    if (input) { input.focus(); input.select(); }
  });

  $("startingInput").addEventListener("input", function () {
    var value = Number(this.value);
    if (!isFinite(value)) return;
    state.starting = clamp(Math.round(value), 0, TOTAL);
    saveState();
    updateProgress({ scrollRail: true, animate: true });
    syncSettingsUI();
  });

  $("resetBtn").addEventListener("click", function () {
    confirmAction({
      title: "Réinitialiser la collection ?",
      body: "Toutes les cases possédé / maîtrisé et l'historique d'import stockés dans ce navigateur seront effacés.\n\n" +
            "Exporte une sauvegarde avant si tu as un doute.",
      confirmLabel: "Tout réinitialiser",
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      var starting = state.starting;
      state = blankState();
      state.starting = starting;
      saveState();
      renderAll();
      syncSettingsUI();
      toast("Collection réinitialisée.", "success");
    });
  });

  $("exportBtn").addEventListener("click", exportCollection);
  $("dialogExportBtn").addEventListener("click", exportCollection);
  $("importBtn").addEventListener("click", function () { el.importFile.click(); });
  $("dialogImportBtn").addEventListener("click", function () { el.importFile.click(); });

  el.importFile.addEventListener("change", function () {
    var file = el.importFile.files && el.importFile.files[0];
    el.importFile.value = "";
    importFile(file);
  });

  var newestBtn = $("rewardsNewestBtn");
  if (newestBtn) {
    newestBtn.addEventListener("click", function () {
      var node = el.rewardRail.querySelector('[data-state="next"]') || lastClaimedNode();
      if (node) {
        centerRailNode(node, true);
        node.focus({ preventScroll: true });
      }
    });
  }

  // glisser-déposer d'un JSON sur la page
  ["dragenter", "dragover"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf("Files") !== -1) {
        e.preventDefault();
        document.body.style.outline = "2px dashed rgba(46,230,246,.6)";
        document.body.style.outlineOffset = "-7px";
      }
    });
  });
  ["dragleave", "drop"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (evt === "drop") {
        e.preventDefault();
        var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) importFile(file);
      }
      document.body.style.outline = "";
    });
  });

  /* ---------------------------------------------------------------- filtres UI */
  function populateSelects() {
    if (el.variantFilter) {
      var vHtml = '<option value="all">Toutes</option>';
      (CATALOG.variants || []).forEach(function (v) {
        var n = SPIRITS.filter(function (s) { return s.variantId === v.id; }).length;
        if (!n) return;
        vHtml += '<option value="' + esc(v.id) + '">' + esc(v.label) + " (" + n + ")</option>";
      });
      el.variantFilter.innerHTML = vHtml;
    }
    if (el.familyFilter) {
      var fHtml = '<option value="all">Toutes</option>';
      familyList.forEach(function (f) {
        fHtml += '<option value="' + esc(f.id) + '">' + esc(f.name) + " (" + f.entryCount + ")</option>";
      });
      el.familyFilter.innerHTML = fHtml;
    }
  }

  /* ------------------------------------------------------------------ boot */
  state = loadState();
  populateSelects();

  var catalogTotalLabel = $("catalogTotalLabel");
  if (catalogTotalLabel) catalogTotalLabel.textContent = TOTAL;
  el.masteryTarget.textContent = MASTERY_TARGET;

  var footerCatalog = $("footerCatalog");
  if (footerCatalog) footerCatalog.textContent = "Catalogue " + CATALOG_VERSION;
  var footerVerified = $("footerVerified");
  if (footerVerified) footerVerified.textContent = "vérifié le " + (CATALOG.verifiedOn || "—") +
    " (patch " + (CATALOG.patch || "—") + ")";

  renderAll();
  syncSettingsUI();

  // pour tests automatisés / usage avancé
  window.__spirits = {
    state: state,
    catalog: CATALOG,
    rewards: REWARDS,
    parseCollectionFile: parseCollectionFile,
    serialize: function () { return serialize(state); },
    getUI: function () { return { query: ui.query, filter: ui.filter, sort: ui.sort, family: ui.family, variant: ui.variant }; }
  };
})();
