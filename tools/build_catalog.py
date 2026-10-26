#!/usr/bin/env python3
"""
Builds data/spirits.json from the verified Chapter 7 Season 4 (Override) sprite roster.

Verified on 2026-10-26 against patch v42.40:
  * 27 base Sprites
  * 6 finish families (Gold, Cheat Master, Loot Hacker, Bounty Hunter, Trick or Treat) on 26 Sprites
  * 5 Quack forms (Jonesy, Bush, Adventure, Spooky Dash, Klombo) -> mastery rewards
  * Mega Man is the only base Sprite with no finishes at all
  * 162 total collection entries

Sources are listed in data/sources.json and referenced by key on each family.
"""
import json
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "spirits.json")
IMG_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites")

CATALOG_VERSION = "C7S4-2026-10-26"
VERIFIED_ON = "2026-10-26"
GAME = {
    "game": "Fortnite",
    "chapter": "Chapter 7",
    "season": "Season 4",
    "seasonName": "Override",
    "patch": "v42.40",
    "seasonEnd": "2026-10-31",
    "masteryTarget": 70,
    "masteryReward": "Pixel Polli — Mixtape Pixie style (70 Sprites mastered)",
}

VARIANTS = [
    {"id": "base", "label": "Base", "short": "Base", "namePrefix": "",
     "note": "Base form. Drop rates vary by source (Chests, Cheat Codes, bosses)."},
    {"id": "gold", "label": "Gold", "short": "Gold", "namePrefix": "Gold ",
     "note": "Gain 3x bonus Sprite XP from eliminations."},
    {"id": "cheatmaster", "label": "Cheat Master", "short": "Cheat Master", "namePrefix": "Cheat Master ",
     "note": "All inputs are correct when entering Cheat Codes found in the world."},
    {"id": "loothacker", "label": "Loot Hacker", "short": "Loot Hacker", "namePrefix": "Loot Hacker ",
     "note": "Better odds of items spawning from your Loot Hacks."},
    {"id": "bountyhunter", "label": "Bounty Hunter", "short": "Bounty Hunter", "namePrefix": "Bounty Hunter ",
     "note": "Chance to find Sprites when eliminating opponents; only gains XP from eliminations."},
    {"id": "trickortreat", "label": "Trick or Treat", "short": "Trick or Treat", "namePrefix": "Trick or Treat ",
     "note": "Fortnitemares finish. Chance to find candy when opening containers."},
    {"id": "quack", "label": "Quack", "short": "Quack", "namePrefix": "Quack ",
     "note": "Sprite Mastery reward (not a match drop); gives 50% of its XP to other carried Sprites."},
]

# slug -> family metadata. `quack` = mastery threshold for the Quack form (None if no Quack form).
FAMILIES = [
    # Rare
    dict(slug="jonesy", name="Jonesy", rarity="Rare", series="Fortnite", quack=40,
         aliases=["jonsey", "jones", "default jonesy", "starter"],
         note="Starter Sprite. Recovers some Health or Shield shortly after taking damage."),
    dict(slug="adventure", name="Adventure", rarity="Rare", series="Fortnite", quack=50,
         aliases=["adventurer", "the adventurer", "adventurer sprite"], note="Starter Sprite. Upgrades a random inventory item each level."),
    dict(slug="bush", name="Bush", rarity="Rare", series="Fortnite", quack=45,
         aliases=["bushranger", "bush ranger", "bushcamp", "bushranger sprite"], note="Starter Sprite. Spawns a bush on you."),
    dict(slug="8bit", name="8-Bit", rarity="Rare", series="Fortnite", quack=None,
         aliases=["8 bit", "8bit", "eight bit", "eightbit", "8 bit blaster", "blaster"],
         note="Guarantees an 8-Bit Shotgun in your first chest, with a score multiplier."),
    dict(slug="stormscout", name="Storm Scout", rarity="Rare", series="Fortnite", quack=None,
         aliases=["storm", "scout", "stormscout"], note="Overdrive after storm damage; reveals future storm circles at max level."),
    dict(slug="overshield", name="Overshield", rarity="Rare", series="Fortnite", quack=None,
         aliases=["over shield", "shield"], note="Grants Overshield, scaling with level."),
    dict(slug="megaman", name="Mega Man", rarity="Rare", series="Mega Man", quack=None,
         aliases=["megaman", "rockman", "capcom"],
         note="Reduced sliding friction. Uniquely has no variant finishes at all."),
    dict(slug="onigiri", name="Onigiri", rarity="Rare", series="Fortnite", quack=None,
         aliases=["rice ball", "design a sprite"], note="Design-A-Sprite contest winner. Overdrive after any consumable."),
    dict(slug="birthday", name="Birthday", rarity="Rare", series="Fortnite", quack=None,
         aliases=["cake", "party", "bday"], note="Released October 1, 2026 with Fortnitemares."),
    # Epic
    dict(slug="shadow", name="Shadow", rarity="Epic", series="Sonic the Hedgehog", quack=None,
         aliases=["sega", "hedgehog"], note="Automatically reloads your weapons over time."),
    dict(slug="tails", name="Tails", rarity="Epic", series="Sonic the Hedgehog", quack=None,
         aliases=["miles prower", "sega", "hedgehog"], note="Lets you hover in mid-air and cancels fall damage."),
    dict(slug="sonic", name="Sonic", rarity="Epic", series="Sonic the Hedgehog", quack=None,
         aliases=["sega", "hedgehog", "green hill"], note="Increases Sprint speed, scaling per level."),
    dict(slug="pond", name="Pond", rarity="Epic", series="Fortnite", quack=None,
         aliases=["frog", "design a sprite", "pine and kiri"], note="Design-A-Sprite contest winner. Faster swimming per level."),
    dict(slug="morgana", name="Morgana", rarity="Epic", series="Persona 5", quack=None,
         aliases=["persona", "panther", "cat"], note="Persona 5 collab. Increases the effectiveness of healing items."),
    dict(slug="dumpsterdive", name="Dumpster Dive", rarity="Epic", series="Fortnite", quack=None,
         aliases=["dumpster", "dive", "raccoon", "design a sprite"], note="Design-A-Sprite contest winner. Random loot from dumpsters."),
    dict(slug="honey", name="Honey", rarity="Epic", series="Fortnite", quack=None,
         aliases=["bee", "bees", "beehive", "design a sprite"], note="Design-A-Sprite winner, added Oct 15 2026. Bees attack attackers."),
    # Legendary
    dict(slug="killswitch", name="Killswitch", rarity="Legendary", series="Fortnite", quack=None,
         aliases=["kill switch", "hangtime", "bullet time"], note="Grants Hangtime with improved accuracy while aiming down sights."),
    dict(slug="jackrabbit", name="Jackrabbit", rarity="Legendary", series="Fortnite", quack=None,
         aliases=["rabbit", "bunny", "jump", "jazz jackrabbit", "jazz", "double jump"], note="Extra mid-air jump; cooldown falls per level."),
    dict(slug="xray", name="X-Ray", rarity="Legendary", series="Fortnite", quack=None,
         aliases=["x ray", "xray", "design a sprite", "wallhack"], note="Design-A-Sprite winner. Periodically marks nearby enemies."),
    dict(slug="blinky", name="Blinky", rarity="Legendary", series="PAC-MAN", quack=None,
         aliases=["pacman", "pac man", "ghost", "bandai namco"], note="PAC-MAN collab. Cloaks you briefly after taking damage."),
    dict(slug="crash", name="Crash Bandicoot", rarity="Legendary", series="Crash Bandicoot", quack=None,
         aliases=["crash", "bandicoot", "activision"], note="Crash Bandicoot collab Sprite."),
    dict(slug="vampire", name="Vampire", rarity="Legendary", series="Fortnite", quack=None,
         aliases=["vamp", "dracula", "fortnitemares"], note="Fortnitemares Sprite. Recover health when damaging an enemy."),
    dict(slug="deer", name="The Deer", rarity="Legendary", series="Fortnite", quack=None,
         aliases=["deer", "stag", "fortnitemares"], note="Fortnitemares Sprite. Melee attacks deal more damage."),
    # Mythic
    dict(slug="klombo", name="Klombo", rarity="Mythic", series="Fortnite", quack=60,
         aliases=["klombos", "dinosaur"], note="Grants random items per level; only levels up from Health/Shield consumables."),
    dict(slug="crown", name="Crown", rarity="Mythic", series="Fortnite", quack=None,
         aliases=["crowns", "victory royale", "win", "victory crown"], note="Bonus Crown Wins; only levels up by winning matches."),
    dict(slug="spookydash", name="Spooky Dash", rarity="Mythic", series="Fortnite", quack=55,
         aliases=["spooky", "dash", "phase", "fortnitemares"], note="Fortnitemares Sprite. Phase through objects with a mid-air dash."),
    dict(slug="onewishwillow", name="One Wish Willow", rarity="Mythic", series="Obsession", quack=None,
         aliases=["willow", "one wish", "obsession", "monkey paw", "emo", "fortnitemares"],
         note="Obsession (Fortnitemares 2026) collab. Extracts eliminated players' equipped Sprites."),
]

ALL_VARIANT_IDS = [v["id"] for v in VARIANTS]
FAMILY_ORDER = {f["slug"]: i for i, f in enumerate(FAMILIES)}

# which finishes each family has, verified from the live Sprite directory (162 rows)
def variants_for(fam):
    if fam["slug"] == "megaman":
        return ["base"]
    out = ["base", "gold", "cheatmaster", "loothacker", "bountyhunter", "trickortreat"]
    if fam.get("quack"):
        out.append("quack")
    return out



# ---------------------------------------------------------------------------
# Full Sprite Mastery reward track, Chapter 7 Season 4 (Override), patch v42.40.
# 35 tiers, verified against the Fortnite Wiki "Sprites > Sprites Mastery
# Rewards" page (pages 1-5) and cross-checked against IGN, Beebom, Game Rant,
# theclick.gg and allthings.how. Tiers 1-28 are the four launch/expansion
# pages; tiers 35-70 are the final v42.40 page.
#
# `type` drives the icon shown in the reward rail; `amount` is the quantity
# where the game grants more than one; `image` points at bundled art where a
# real sprite render exists (the five Quack Sprites).
# ---------------------------------------------------------------------------
MASTERY_REWARDS = [
    {"id": "r01", "level": 1,  "type": "xp",         "amount": 40000, "reward": "40 000 XP de saison", "short": "40 000 XP"},
    {"id": "r02", "level": 2,  "type": "locator",    "amount": 3,     "reward": "3 Cheat Code Locators", "short": "3 Locators"},
    {"id": "r03", "level": 3,  "type": "dust",       "amount": 5000,  "reward": "5 000 Sprite Dust", "short": "5 000 Dust"},
    {"id": "r04", "level": 4,  "type": "taco",       "amount": 4,     "reward": "4 Spicy Tacos", "short": "4 Tacos"},
    {"id": "r05", "level": 5,  "type": "xp",         "amount": 40000, "reward": "40 000 XP de saison", "short": "40 000 XP"},
    {"id": "r06", "level": 6,  "type": "dust",       "amount": 5000,  "reward": "5 000 Sprite Dust", "short": "5 000 Dust"},
    {"id": "r07", "level": 7,  "type": "extractor",  "amount": 2,     "reward": "2 Portable Extractors", "short": "2 Extractors"},
    {"id": "r08", "level": 8,  "type": "accelerator","amount": 3,     "reward": "3 Extraction Accelerators", "short": "3 Accelerators"},
    {"id": "r09", "level": 9,  "type": "xp",         "amount": 40000, "reward": "40 000 XP de saison", "short": "40 000 XP"},
    {"id": "r10", "level": 10, "type": "locator",    "amount": 3,     "reward": "3 Cheat Code Locators", "short": "3 Locators"},
    {"id": "r11", "level": 11, "type": "dust",       "amount": 5000,  "reward": "5 000 Sprite Dust", "short": "5 000 Dust"},
    {"id": "r12", "level": 12, "type": "extractor",  "amount": 2,     "reward": "2 Portable Extractors", "short": "2 Extractors"},
    {"id": "r13", "level": 13, "type": "xp",         "amount": 40000, "reward": "40 000 XP de saison", "short": "40 000 XP"},
    {"id": "r14", "level": 14, "type": "llama",      "amount": 2,     "reward": "2 Llama Supply Drops", "short": "2 Llamas"},
    {"id": "r15", "level": 15, "type": "dust",       "amount": 5000,  "reward": "5 000 Sprite Dust", "short": "5 000 Dust"},
    {"id": "r16", "level": 16, "type": "locator",    "amount": 2,     "reward": "2 Cheat Code Locators", "short": "2 Locators"},
    {"id": "r17", "level": 17, "type": "xp",         "amount": 40000, "reward": "40 000 XP de saison", "short": "40 000 XP"},
    {"id": "r18", "level": 18, "type": "taco",       "amount": 5,     "reward": "5 Spicy Tacos", "short": "5 Tacos"},
    {"id": "r19", "level": 19, "type": "accelerator","amount": 3,     "reward": "3 Extraction Accelerators", "short": "3 Accelerators"},
    {"id": "r20", "level": 20, "type": "xp",         "amount": 40000, "reward": "40 000 XP de saison", "short": "40 000 XP"},
    {"id": "r21", "level": 21, "type": "lucky",      "amount": 1,     "reward": "1 Lucky Locator", "short": "Lucky Locator"},
    {"id": "r22", "level": 22, "type": "accelerator","amount": 3,     "reward": "3 Extraction Accelerators", "short": "3 Accelerators"},
    {"id": "r23", "level": 23, "type": "xp",         "amount": 40000, "reward": "40 000 XP de saison", "short": "40 000 XP"},
    {"id": "r24", "level": 24, "type": "extractor",  "amount": 2,     "reward": "2 Portable Extractors", "short": "2 Extractors"},
    {"id": "r25", "level": 25, "type": "llama",      "amount": 2,     "reward": "2 Llama Supply Drops", "short": "2 Llamas"},
    {"id": "r26", "level": 26, "type": "dust",       "amount": 5000,  "reward": "5 000 Sprite Dust", "short": "5 000 Dust"},
    {"id": "r27", "level": 27, "type": "xp",         "amount": 40000, "reward": "40 000 XP de saison", "short": "40 000 XP"},
    {"id": "r28", "level": 28, "type": "outfit",     "amount": 1,     "reward": "Pixel Polli (tenue)", "short": "Pixel Polli",
     "featured": True, "note": "Tenue Epic, débloquée à 28 esprits maîtrisés."},
    {"id": "r35", "level": 35, "type": "lucky",      "amount": 1,     "reward": "1 Lucky Locator", "short": "Lucky Locator"},
    {"id": "r40", "level": 40, "type": "sprite",     "amount": 1,     "reward": "Quack Jonesy Sprite", "short": "Quack Jonesy",
     "image": "assets/sprites/s4_jonesy_quack.webp", "featured": True},
    {"id": "r45", "level": 45, "type": "sprite",     "amount": 1,     "reward": "Quack Bush Sprite", "short": "Quack Bush",
     "image": "assets/sprites/s4_bush_quack.webp", "featured": True},
    {"id": "r50", "level": 50, "type": "sprite",     "amount": 1,     "reward": "Quack Adventure Sprite", "short": "Quack Adventure",
     "image": "assets/sprites/s4_adventure_quack.webp", "featured": True},
    {"id": "r55", "level": 55, "type": "sprite",     "amount": 1,     "reward": "Quack Spooky Dash Sprite", "short": "Quack Spooky Dash",
     "image": "assets/sprites/s4_spookydash_quack.webp", "featured": True},
    {"id": "r60", "level": 60, "type": "sprite",     "amount": 1,     "reward": "Quack Klombo Sprite", "short": "Quack Klombo",
     "image": "assets/sprites/s4_klombo_quack.webp", "featured": True},
    {"id": "r70", "level": 70, "type": "style",      "amount": 1,     "reward": "Pixel Polli — style Mixtape Pixie", "short": "Style Mixtape Pixie",
     "featured": True, "note": "Style supplémentaire de la tenue Pixel Polli (objectif final de la saison)."},
]


def build():
    spirits = []
    families_out = []
    missing_images = []
    for fam in FAMILIES:
        vids = variants_for(fam)
        families_out.append({
            "id": fam["slug"],
            "name": fam["name"],
            "rarity": fam["rarity"],
            "series": fam["series"],
            "note": fam["note"],
            "aliases": fam["aliases"],
            "entryCount": len(vids),
            "quackMasteryLevel": fam.get("quack"),
            "sources": ["checklist", "vice", "wiki"],
        })
        for vid in vids:
            vmeta = next(v for v in VARIANTS if v["id"] == vid)
            name = f'{vmeta["namePrefix"]}{fam["name"]} Sprite'
            suffix = "basic" if vid == "base" else vid
            img = f's4_{fam["slug"]}_{suffix}.webp'
            if not os.path.exists(os.path.join(IMG_DIR, img)):
                missing_images.append(img)
            spirits.append({
                "id": f'{fam["slug"]}-{vid}',
                "name": name,
                "familyId": fam["slug"],
                "family": fam["name"],
                "rarity": fam["rarity"],
                "series": fam["series"],
                "variantId": vid,
                "variant": vmeta["label"],
                "image": f"assets/sprites/{img}",
                "imageSource": "https://spritechecklist.org/",
                "aliases": [],
            })

    counts = {v: sum(1 for s in spirits if s["variantId"] == v) for v in ALL_VARIANT_IDS}
    doc = {
        "catalogVersion": CATALOG_VERSION,
        "verifiedOn": VERIFIED_ON,
        "game": GAME,
        **GAME,
        "counts": {"total": len(spirits), "base": counts["base"], "families": len(families_out), **counts},
        "variants": VARIANTS,
        "families": families_out,
        "spirits": spirits,
        "masteryRewards": MASTERY_REWARDS,
        "masteryRewardPages": [
            {"page": 1, "label": "Page 1", "from": 1, "to": 8},
            {"page": 2, "label": "Page 2", "from": 9, "to": 14},
            {"page": 3, "label": "Page 3", "from": 15, "to": 21},
            {"page": 4, "label": "Page 4", "from": 22, "to": 28},
            {"page": 5, "label": "Page 5 (v42.40)", "from": 35, "to": 70},
        ],
        "rewardTrackSource": {
            "patch": "v42.40",
            "tiers": len(MASTERY_REWARDS),
            "verifiedAgainst": [
                "Fortnite Wiki — Sprites / Sprites Mastery Rewards (pages 1-5)",
                "IGN — Sprites Checklist (Chapter 7 Season 4)",
                "Beebom — What Does Mastering a Sprite Do in Fortnite?",
                "Game Rant — All Sprite Mastery Rewards / Quack Sprites",
                "theclick.gg — Chapter 7 Season 4 Sprite Mastery Rewards",
                "allthings.how — Every Sprite Mastery Track Reward",
            ],
            "discrepancy": "Tier 16 (Cheat Code Locators) is listed as 3x by IGN and 2x by the Fortnite Wiki, Game Rant, Beebom and allthings.how; 2x is used here. Tiers 1-28 are one continuous track; 35-70 form the final v42.40 page.",
        },
        "notes": [
            "Dans le jeu, ces créatures s'appellent des « Sprites » ; le tracker accepte « esprit(s) » comme synonyme de recherche.",
            "Catalogue vérifié le 26/10/2026 sur le patch v42.40. Epic a figé le roster de la saison à 162 entrées.",
            "Une maîtrise = atteindre le niveau 5 PUIS extraire l'esprit. Le niveau 5 seul ne compte pas.",
            "Extraire 30 esprits (à n'importe quel niveau) débloque aussi le Back Bling Pixel Sprite Trainer : c'est un palier d'extraction, distinct du track de maîtrise.",
            "Certains trackers utilisent encore les noms d'avant-sortie : Jazz Jackrabbit (= Jackrabbit), Bushranger (= Bush), 8-Bit Blaster (= 8-Bit), The Adventurer (= Adventure), Victory Crown (= Crown). Les noms du jeu sont utilisés ici, les anciens restent cherchables.",
            "Exclus volontairement : les esprits de la saison 3 (Dream, Zero Point, Grim Reaper, Ironmouse, Pollo, Duck, Ghost, Fire, Water, Earth, Fishy) et les placeholders jamais sortis (Bullet, Cube, Head Shot, Meowscles, Squibbly). Aucun n'est obtenable en saison 4.",
        ],
    }
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")
    # also emit data/catalog.js so the page works from file:// with no fetch/CORS
    src_path = os.path.join(os.path.dirname(os.path.abspath(OUT)), "sources.json")
    sources = []
    if os.path.exists(src_path):
        with open(src_path, encoding="utf-8") as f:
            sources = json.load(f).get("primary", [])
    js = "/* AUTO-GENERATED from data/spirits.json by tools/build_catalog.py — do not edit by hand. */\n"
    js += "window.SPIRIT_CATALOG = " + json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + ";\n"
    js += "window.SPIRIT_SOURCES = " + json.dumps(sources, ensure_ascii=False, separators=(",", ":")) + ";\n"
    with open(os.path.join(os.path.dirname(os.path.abspath(OUT)), "catalog.js"), "w", encoding="utf-8") as f:
        f.write(js)

    print(f"wrote {len(spirits)} spirits / {len(families_out)} families")
    print("counts:", doc["counts"])
    if missing_images:
        print("MISSING IMAGES:", missing_images)


if __name__ == "__main__":
    build()
