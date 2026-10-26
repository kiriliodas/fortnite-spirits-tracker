/* =========================================================================
   Fortnite Spirits — Chapter 7 Season 4 collection tracker
   Vanilla JS, no dependencies, no network requests.

   Architecture
   ------------
   CATALOG  : immutable, loaded from data/catalog.js (generated from
              data/spirits.json). Never mutated at runtime.
   STATE    : the user's own collection (owned / mastered / starting count),
              persisted in localStorage and exportable as JSON.

   Mastery rules implemented here
   ------------------------------
   * A Sprite is mastered when it reached level 5 AND was extracted.
   * Mastery implies ownership: marking mastered also marks owned.
   * Removing ownership from a mastered Sprite clears its mastery.
   * Progress counts UNIQUE mastered Sprites: the tracker's marked entries
     plus a configurable "starting masteries" number for the Sprites the
     user had already mastered before using this tracker (default 15).
   ========================================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- config */
  var APP_ID = "fortnite-spirits-tracker";
  var SCHEMA_VERSION = 2;
  var STORAGE_KEY = "fortnite-spirits-tracker.v2";
  var DEFAULT_STARTING_MASTERY = 15;

  var CATALOG = window.SPIRIT_CATALOG;
  var SOURCES = window.SPIRIT_SOURCES || [];

  var root = document.documentElement;

  if (!CATALOG || !Array.isArray(CATALOG.spirits)) {
    root.innerHTML =
      '<body style="font-family:sans-serif;background:#0a0c11;color:#e8ecf4;padding:40px">' +
      "<h1>Catalog failed to load</h1><p>data/catalog.js is missing or corrupt. " +
      "Re-run <code>python3 tools/build_catalog.py</code> and reload.</p></body>";
    return;
  }

  var SPIRITS = CATALOG.spirits;
  var TOTAL = SPIRITS.length;
  var MASTERY_TARGET = Number(CATALOG.masteryTarget) || 70;
  var REWARDS = Array.isArray(CATALOG.masteryRewards) ? CATALOG.masteryRewards.slice().sort(function (a, b) { return a.level - b.level; }) : [];
  var CATALOG_VERSION = CATALOG.catalogVersion || "unknown";

  var byId = new Map();
  var variantOrder = new Map();
  var variantLabel = new Map();
  var familyList = CATALOG.families || [];
  var familyById = new Map();
  var familyOrder = new Map();

  SPIRITS.forEach(function (s) { byId.set(s.id, s); });
  (CATALOG.variants || []).forEach(function (v, i) {
    variantOrder.set(v.id, i);
    variantLabel.set(v.id, v.label);
  });
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
  function plural(n, one, many) { return n === 1 ? one : many; }

  /* -------------------------------------------------------- search support */
  function norm(value) {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  var COMMON_ALIASES = "spirit spirits sprite sprites pokemon pokedex collection companion";

  // build one normalized haystack per entry (name + family + variant + aliases)
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

  var SYNONYMS = { golden: "gold", golds: "gold", cheats: "cheat", cheater: "cheat" };

  function searchTokens(query) {
    return norm(query)
      .split(" ")
      .filter(Boolean)
      .map(function (t) { return SYNONYMS[t] || t; });
  }

  function matchesQuery(spirit, tokens) {
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (spirit._hay.indexOf(t) !== -1) continue;
      // tolerate plurals: "spirits" -> "spirit", "coins" -> "coin"
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
      unknown: new Map(), // ids from imports that are not in this catalog
      savedAt: null
    };
  }

  var state = blankState();

  function hasAnyData(st) {
    return !!(st && (st.owned.size || st.mastered.size || st.unknown.size));
  }

  /** Keep mastered ⊆ owned. */
  function enforceInvariant(st) {
    st.owned.forEach(function (id) {});
    Array.from(st.mastered).forEach(function (id) {
      if (!st.owned.has(id)) st.mastered.delete(id);
    });
    return st;
  }

  function saveState() {
    try {
      var payload = serialize(state, false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      state.savedAt = payload.exportedAt;
    } catch (err) {
      toast("Couldn't save to this browser's storage (it may be full or blocked). Export a backup.", "error");
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
  function serialize(st, forExport) {
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
   * Accepts v2 exports, v1 exports (id -> boolean) and bare arrays of ids.
   * Always returns a result object; never throws on malformed input.
   */
  function parseCollectionFile(data, opts) {
    opts = opts || {};
    var fail = function (message) { return { ok: false, error: message }; };

    if (data === null || typeof data !== "object") return fail("The file is not a JSON object.");
    if (Array.isArray(data)) {
      // bare array of ids -> treat as owned list
      data = { schemaVersion: 1, spirits: data };
    }

    var version = Number(data.schemaVersion);
    if (!isFinite(version)) version = data.spirits || data.collection ? 1 : NaN;
    if (!isFinite(version)) return fail("No schema version and no readable collection data were found.");
    if (version < 1) return fail("Unsupported schema version " + version + ".");

    var warnings = [];
    if (version > SCHEMA_VERSION) {
      warnings.push(
        "This file was written by a newer version of the tracker (schema v" + version +
        "). Recognised fields were restored; anything else was ignored."
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
          if (typeof v === "boolean") put(id, v, false); // v1 shape
          else if (v && typeof v === "object") put(id, v.owned, v.mastered);
          else if (v === null) put(id, true, false);
        });
      }
    } else if (data.spirits !== undefined || data.collection !== undefined) {
      return fail("The “spirits” field is present but is not an object or array.");
    }

    // settings / starting mastery
    var starting = null;
    if (data.settings && typeof data.settings.startingMastery !== "undefined") starting = Number(data.settings.startingMastery);
    else if (typeof data.startingMastery !== "undefined") starting = Number(data.startingMastery);
    else if (data.summary && typeof data.summary.startingMastery !== "undefined") starting = Number(data.summary.startingMastery);

    if (starting !== null && isFinite(starting)) {
      starting = clamp(Math.round(starting), 0, TOTAL);
      result.starting = starting;
    } else if (!opts.silent) {
      result.starting = state.starting;
    }

    if (data.catalogVersion && data.catalogVersion !== CATALOG_VERSION && !opts.silent) {
      warnings.push(
        "Saved against catalog “" + String(data.catalogVersion).slice(0, 40) + "” (this build uses “" +
        CATALOG_VERSION + "”). Entries that still exist were matched by ID."
      );
    }

    if (!matched && !unmatchedIds.length && data.settings === undefined && !data.summary) {
      return fail("No sprite entries were recognised in this file.");
    }

    if (unmatchedIds.length && !opts.silent) {
      warnings.push(
        unmatchedIds.length + " " + plural(unmatchedIds.length, "entry", "entries") +
        " could not be matched to the current catalog and " +
        (unmatchedIds.length === 1 ? "was" : "were") + " kept, not discarded."
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
  var ui = { query: "", filter: "all", sort: "family" };

  var el = {
    grid: $("grid"),
    empty: $("emptyState"),
    search: $("search"),
    clearSearch: $("clearSearch"),
    sort: $("sort"),
    resultCount: $("resultCount"),
    masteredTotal: $("masteredTotal"),
    masteryTarget: $("masteryTarget"),
    remaining: $("remainingLabel"),
    bar: $("progressBar"),
    barFill: $("barFill"),
    rewardStatus: $("rewardStatus"),
    rewardStatusText: $("rewardStatusText"),
    milestone: $("milestoneLabel"),
    startingText: $("startingText"),
    statOwned: $("statOwned"),
    statMastered: $("statMastered"),
    statMissing: $("statMissing"),
    statCompletion: $("statCompletion"),
    catalogTotal: $("catalogTotalLabel"),
    settingsDialog: $("settingsDialog"),
    reportDialog: $("reportDialog"),
    reportBody: $("reportBody"),
    importFile: $("importFile"),
    toastWrap: $("toastWrap")
  };

  /* ------------------------------------------------------------- rendering */
  function statusOf(id) {
    var owned = state.owned.has(id);
    var mastered = state.mastered.has(id);
    return mastered ? "mastered" : owned ? "owned" : "missing";
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
      if (tokens.length && !matchesQuery(s, tokens)) return false;
      return passesFilter(s);
    });
  }

  function sortByFamily(a, b) {
    var fa = familyOrder.get(a.familyId), fb = familyOrder.get(b.familyId);
    if (fa !== fb) return (fa || 0) - (fb || 0);
    return (variantOrder.get(a.variantId) || 0) - (variantOrder.get(b.variantId) || 0);
  }

  var STATUS_RANK = { mastered: 0, owned: 1, missing: 2 };

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
    var owned = state.owned.has(s.id);
    var mastered = state.mastered.has(s.id);
    var classes = "card" + (owned ? " is-owned" : "") + (mastered ? " is-mastered" : "");
    var fam = familyById.get(s.familyId) || {};
    var showSeries = s.series && s.series !== "Fortnite";

    return (
      '<article class="' + classes + '" data-card-id="' + esc(s.id) + '">' +
        '<div class="thumb">' +
          '<img src="' + esc(s.image) + '" alt="' + esc(s.name) + '" loading="lazy" decoding="async" width="300" height="300" data-initials="' + esc(s._initials) + '">' +
          '<span class="vchip" data-variant="' + esc(s.variantId) + '">' + esc(s.variant) + "</span>" +
          (showSeries ? '<span class="series-tag" title="' + esc(s.series) + ' crossover">' + esc(s.series) + "</span>" : "") +
          (mastered
            ? '<span class="crown" title="Mastered" aria-label="Mastered"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M3 8.5l3.6 2.7L12 5l5.4 6.2L21 8.5 19.2 18H4.8z"/></svg></span>'
            : "") +
        "</div>" +
        '<div class="card-body">' +
          '<h3 class="card-title" title="' + esc(s.name) + '">' + esc(s.name) + "</h3>" +
          '<p class="card-meta">' + esc(s.family) + " · " + esc(s.rarity) + "</p>" +
          '<div class="card-controls">' +
            '<label class="toggle toggle-owned' + (owned ? " is-on" : "") + '" title="I have collected this sprite">' +
              '<input type="checkbox" data-id="' + esc(s.id) + '" data-kind="owned" aria-label="Mark ' + esc(s.name) + ' as owned"' + (owned ? " checked" : "") + ">" +
              "<span>Owned</span>" +
            "</label>" +
            '<label class="toggle toggle-mastered' + (mastered ? " is-on" : "") + '" title="Extracted at level 5 (mastered)">' +
              '<input type="checkbox" data-id="' + esc(s.id) + '" data-kind="mastered" aria-label="Mark ' + esc(s.name) + ' as mastered (Level 5, extracted)"' + (mastered ? " checked" : "") + ">" +
              "<span>Mastered</span>" +
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
    var total = (fam.entryCount || items.length);
    var cls = "family-progress";
    if (mastered === total) cls += " is-mastered";
    else if (owned === total) cls += " is-complete";

    return (
      '<div class="family-head">' +
        '<span class="family-name">' + esc(fam.name) + "</span>" +
        '<span class="family-sub">' + esc(fam.rarity || "") +
          (fam.series && fam.series !== "Fortnite" ? " · " + esc(fam.series) : "") + "</span>" +
        '<span class="' + cls + '" data-family-progress="' + esc(famId) + '" title="Owned / mastered of ' + total + '">' +
          owned + "/" + total + ' <span aria-hidden="true">·</span> ' + mastered + "★" +
        "</span>" +
      "</div>"
    );
  }

  function renderGrid() {
    var list = currentList();
    var sorted = sortList(list);

    // result count
    var countText =
      sorted.length === TOTAL && !ui.query && ui.filter === "all"
        ? TOTAL + " sprites"
        : "Showing " + sorted.length + " of " + TOTAL + " sprites";
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
          '<section class="family" aria-label="' + esc((familyById.get(famId) || {}).name || famId) + ' family">' +
          familyHeaderHTML(famId, items) +
          '<div class="family-grid">' + items.map(cardHTML).join("") + "</div>" +
          "</section>";
      });
      el.grid.innerHTML = html;
    } else {
      el.grid.innerHTML = '<div class="grid-plain">' + sorted.map(cardHTML).join("") + "</div>";
    }
  }

  function updateProgress() {
    var tracked = state.mastered.size;
    var base = state.starting;
    var effective = base + tracked;
    var remaining = Math.max(0, MASTERY_TARGET - effective);
    var pct = clamp((effective / MASTERY_TARGET) * 100, 0, 100);

    el.masteredTotal.textContent = effective;
    el.masteryTarget.textContent = MASTERY_TARGET;
    el.remaining.textContent = remaining > 0
      ? remaining + " more to go"
      : "Target reached — reward unlocked";

    el.barFill.style.width = pct.toFixed(2) + "%";
    el.bar.setAttribute("aria-valuenow", String(Math.min(effective, MASTERY_TARGET)));
    el.bar.setAttribute("aria-valuemax", String(MASTERY_TARGET));

    var unlocked = effective >= MASTERY_TARGET;
    el.rewardStatus.dataset.state = unlocked ? "unlocked" : "locked";
    el.rewardStatusText.textContent = unlocked
      ? "Reward unlocked"
      : Math.round(pct) + "% to reward";

    // next milestone
    var next = null;
    for (var i = 0; i < REWARDS.length; i++) {
      if (REWARDS[i].level > effective) { next = REWARDS[i]; break; }
    }
    el.milestone.textContent = next
      ? "Next: " + next.reward + " at " + next.level + " (" + (next.level - effective) + " to go)"
      : "All " + MASTERY_TARGET + "-level mastery rewards unlocked";

    // starting-count line
    var parts = [base + " pre-tracked " + plural(base, "mastery", "masteries")];
    if (tracked) parts.push(tracked + " marked here");
    if (effective > TOTAL) parts.push("⚠ above the " + TOTAL + "-entry catalog");
    el.startingText.textContent = parts.join(" · ");

    // stats
    var owned = state.owned.size;
    el.statOwned.textContent = owned + "/" + TOTAL;
    el.statMastered.textContent = String(tracked);
    el.statMissing.textContent = String(TOTAL - owned);
    el.statCompletion.textContent = Math.round((owned / TOTAL) * 100) + "%";
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
      var base = chip.dataset.label || chip.textContent.replace(/\s*\d+$/, "").trim();
      chip.dataset.label = base;
      chip.innerHTML = esc(base) + ' <span class="n">' + (counts[key] != null ? counts[key] : "") + "</span>";
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
      node.innerHTML = owned + "/" + total + ' <span aria-hidden="true">·</span> ' + mastered + "★";
      node.classList.toggle("is-mastered", mastered === total);
      node.classList.toggle("is-complete", owned === total && mastered !== total);
    });
  }

  function updateCardDOM(id) {
    var node = el.grid.querySelector('[data-card-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (!node) return;
    var owned = state.owned.has(id);
    var mastered = state.mastered.has(id);
    node.classList.toggle("is-owned", owned);
    node.classList.toggle("is-mastered", mastered);

    node.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
      var isOwnedBox = cb.dataset.kind === "owned";
      cb.checked = isOwnedBox ? owned : mastered;
      cb.closest(".toggle").classList.toggle("is-on", isOwnedBox ? owned : mastered);
    });

    var crown = node.querySelector(".crown");
    if (mastered && !crown) {
      var thumb = node.querySelector(".thumb");
      if (thumb) {
        var span = document.createElement("span");
        span.className = "crown";
        span.setAttribute("title", "Mastered");
        span.setAttribute("aria-label", "Mastered");
        span.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M3 8.5l3.6 2.7L12 5l5.4 6.2L21 8.5 19.2 18H4.8z"/></svg>';
        thumb.appendChild(span);
      }
    } else if (!mastered && crown) {
      crown.remove();
    }
  }

  function renderAll() {
    renderGrid();
    updateProgress();
    updateChips();
  }

  /* --------------------------------------------------------- interactions */
  function setOwned(id, value) {
    if (!byId.has(id)) return;
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
    saveState();
    updateProgress();
    updateChips();
    if (id) updateCardDOM(id);
    updateFamilyHeaders();
    // Membership can change which entries pass the current view.
    if (ui.filter !== "all" || ui.sort === "status") {
      renderGrid();
      if (id) updateCardDOM(id);
      updateFamilyHeaders();
    }
    if (opts && opts.message) toast(opts.message, "warn");
  }

  el.grid.addEventListener("change", function (event) {
    var cb = event.target.closest("input[type=checkbox]");
    if (!cb) return;
    var id = cb.dataset.id;
    var kind = cb.dataset.kind;

    if (kind === "owned") {
      var lostMastery = setOwned(id, cb.checked);
      cb.closest(".toggle").classList.toggle("is-on", cb.checked);
      afterChange(id, lostMastery
        ? { message: "Mastery cleared: a mastered sprite must also be owned." }
        : null);
    } else {
      setMastered(id, cb.checked);
      cb.closest(".toggle").classList.toggle("is-on", cb.checked);
      afterChange(id, null);
    }
  });

  // graceful image failure
  el.grid.addEventListener("error", function (event) {
    var img = event.target;
    if (!img || img.tagName !== "IMG" || img.dataset.failed) return;
    img.dataset.failed = "1";
    img.style.display = "none";
    var wrap = img.parentElement;
    if (!wrap || wrap.querySelector(".img-fallback")) return;
    var fb = document.createElement("div");
    fb.className = "img-fallback";
    fb.innerHTML = "<span>" + esc(img.dataset.initials || "?") + "</span>Image unavailable";
    wrap.appendChild(fb);
  }, true);

  /* search + filters + sort controls */
  var searchTimer = null;
  el.search.addEventListener("input", function () {
    ui.query = el.search.value;
    el.clearSearch.hidden = !ui.query;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(renderGrid, 60);
  });

  el.clearSearch.addEventListener("click", function () {
    ui.query = "";
    el.search.value = "";
    el.clearSearch.hidden = true;
    el.search.focus();
    renderGrid();
  });

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      ui.filter = chip.dataset.filter;
      updateChips();
      renderGrid();
    });
  });

  el.sort.addEventListener("change", function () {
    ui.sort = el.sort.value;
    renderGrid();
  });

  $("resetViewBtn").addEventListener("click", function () {
    ui.query = "";
    ui.filter = "all";
    ui.sort = "family";
    el.search.value = "";
    el.sort.value = "family";
    el.clearSearch.hidden = true;
    updateChips();
    renderGrid();
  });

  // "/" focuses search, Escape clears it
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
    }, kind === "error" ? 5200 : 3400);
  }


  /* ---------------------------------------------------------- confirm */
  var confirmResolve = null;

  function confirmAction(opts) {
    var dlg = $("confirmDialog");
    var okBtn = $("confirmOk");
    $("confirmTitle").textContent = opts.title || "Are you sure?";
    $("confirmBody").textContent = opts.body || "";
    okBtn.textContent = opts.confirmLabel || "Confirm";
    okBtn.classList.toggle("is-danger", !!opts.danger);
    $("confirmCancel").textContent = opts.cancelLabel || "Cancel";

    if (!dlg || typeof dlg.showModal !== "function") {
      return Promise.resolve(window.confirm((opts.title || "") + "\n\n" + (opts.body || "")));
    }

    return new Promise(function (resolve) {
      confirmResolve = resolve;
      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        confirmResolve = null;
        try { dlg.close(); } catch (e) {}
        resolve(value);
      }
      // wire once per open
      okBtn.onclick = function () { finish(true); };
      $("confirmCancel").onclick = function () { finish(false); };
      dlg.oncancel = function (event) { event.preventDefault(); finish(false); };
      dlg.onclose = function () { finish(false); };

      dlg.showModal();
      window.setTimeout(function () { okBtn.focus(); }, 30);
    });
  }

  /* -------------------------------------------------------- export/import */
  function slugDate() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function exportCollection() {
    var payload = serialize(state, true);
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "fortnite-spirits-collection-" + slugDate() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast(
      "Exported " + payload.summary.owned + " owned · " + payload.summary.totalMastered +
      " mastered (" + MASTERY_TARGET + " target).",
      "success"
    );
  }

  function readFileText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("The file could not be read.")); };
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
      showReport({ ok: false, error: "That file isn't valid JSON. " + (err && err.message ? err.message : "") });
      return;
    }

    var parsed = parseCollectionFile(data, {});
    if (!parsed.ok) {
      showReport({ ok: false, error: parsed.error });
      return;
    }

    if (hasAnyData(state)) {
      var proceed = await confirmAction({
        title: "Replace your collection?",
        body: "Importing replaces what is currently stored in this browser.\n\n" +
          "Now: " + state.owned.size + " owned, " + (state.starting + state.mastered.size) + " mastered.\n" +
          "File: " + parsed.result.owned.size + " owned, " +
          (parsed.result.starting + parsed.result.mastered.size) + " mastered.",
        confirmLabel: "Import and replace"
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
        '<p class="err">Import failed</p>' +
        "<p>" + esc(info.error || "Unknown error.") + "</p>" +
        '<p class="hint">Your existing collection was left untouched. Import expects the JSON file produced by “Export Collection”.</p>';
    } else {
      var html =
        '<p class="ok">Collection imported.</p>' +
        "<ul class=\"source-list\">" +
        "<li><strong>" + info.owned + "</strong> sprites owned</li>" +
        "<li><strong>" + info.tracked + "</strong> marked mastered here + <strong>" + info.starting + "</strong> pre-tracked = <strong>" + info.mastered + "</strong> / " + MASTERY_TARGET + " toward the reward</li>" +
        "<li><strong>" + info.matched + "</strong> entries matched to the current catalog</li>" +
        "</ul>";
      if (info.warnings && info.warnings.length) {
        html += '<p class="warn">Notes</p><ul class="source-list">' +
          info.warnings.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>";
      }
      if (info.unmatched && info.unmatched.length) {
        html += '<p class="hint">Entries kept but not shown in the grid (not in catalog ' + esc(CATALOG_VERSION) + "):</p>" +
          '<ul class="report-list">' + info.unmatched.slice(0, 60).map(function (id) {
            return "<li>" + esc(id) + "</li>";
          }).join("") + (info.unmatched.length > 60 ? "<li>…and " + (info.unmatched.length - 60) + " more</li>" : "") + "</ul>";
      }
      body.innerHTML = html;
    }
    if (typeof el.reportDialog.showModal === "function") el.reportDialog.showModal();
    else toast(info.ok ? "Collection imported." : "Import failed: " + info.error, info.ok ? "success" : "error");
  }

  /* ------------------------------------------------------------- settings */
  function syncSettingsUI() {
    var input = $("startingInput");
    if (input) input.value = state.starting;

    $("dataSummary").textContent =
      state.owned.size + " owned · " + state.mastered.size + " mastered here · " +
      state.starting + " pre-tracked · saved " +
      (state.savedAt ? new Date(state.savedAt).toLocaleString() : "not yet");

    var unknownNode = $("unknownEntries");
    if (unknownNode) {
      if (state.unknown.size) {
        unknownNode.hidden = false;
        var ids = Array.from(state.unknown.keys());
        unknownNode.textContent =
          ids.length + " imported " + plural(ids.length, "entry", "entries") +
          " not in catalog " + CATALOG_VERSION + " (kept on export): " + ids.slice(0, 8).join(", ") +
          (ids.length > 8 ? "…" : "");
      } else {
        unknownNode.hidden = true;
        unknownNode.textContent = "";
      }
    }

    $("catalogSummary").textContent =
      "Fortnite " + (CATALOG.chapter || "") + " " + (CATALOG.season || "") + " “" + (CATALOG.seasonName || "") +
      "” · " + TOTAL + " entries · " + familyList.length + " families · catalog " + CATALOG_VERSION +
      " · verified " + (CATALOG.verifiedOn || "—") + " (patch " + (CATALOG.patch || "—") + ")";

    var list = $("sourceList");
    if (list && !list.childElementCount) {
      list.innerHTML = SOURCES.map(function (s) {
        return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(s.name) + "</a> — " + esc(s.usedFor || "") + "</li>";
      }).join("");
    }

    var disclosure = $("disclosureText");
    if (disclosure && Array.isArray(CATALOG.notes)) {
      disclosure.textContent = CATALOG.notes.join(" ");
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
    updateProgress();
    syncSettingsUI();
  });

  $("resetBtn").addEventListener("click", function () {
    confirmAction({
      title: "Reset the collection?",
      body: "This clears every owned and mastered mark and the import history stored in this browser. " +
            "Your starting mastery count is kept.\n\nExport a backup first if you're unsure.",
      confirmLabel: "Reset everything",
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      var starting = state.starting;
      state = blankState();
      state.starting = starting;
      saveState();
      renderAll();
      syncSettingsUI();
      toast("Collection reset.", "success");
    });
  });

  $("exportBtn").addEventListener("click", exportCollection);
  $("dialogExportBtn").addEventListener("click", exportCollection);
  $("importBtn").addEventListener("click", function () { el.importFile.click(); });
  $("dialogImportBtn").addEventListener("click", function () { el.importFile.click(); });

  el.importFile.addEventListener("change", function () {
    var file = el.importFile.files && el.importFile.files[0];
    el.importFile.value = ""; // allow re-importing the same filename
    importFile(file);
  });

  // drag & drop JSON onto the page
  ["dragenter", "dragover"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf("Files") !== -1) {
        e.preventDefault();
        document.body.style.outline = "2px dashed rgba(56,189,248,.55)";
        document.body.style.outlineOffset = "-6px";
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

  /* ----------------------------------------------------------------- boot */
  state = loadState();
  el.catalogTotal.textContent = TOTAL;
  el.masteryTarget.textContent = MASTERY_TARGET;

  var footerCatalog = $("footerCatalog");
  if (footerCatalog) footerCatalog.textContent = "Catalog " + CATALOG_VERSION;
  var footerVerified = $("footerVerified");
  if (footerVerified) footerVerified.textContent = "verified " + (CATALOG.verifiedOn || "—") + " (patch " + (CATALOG.patch || "—") + ")";

  renderAll();
  syncSettingsUI();

  // expose a tiny hook for automated tests / power users
  window.__spirits = {
    state: state,
    catalog: CATALOG,
    parseCollectionFile: parseCollectionFile,
    serialize: function () { return serialize(state, true); },
    getUI: function () { return { query: ui.query, filter: ui.filter, sort: ui.sort }; }
  };
})();
