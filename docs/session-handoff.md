# casino-gis — Session Handoff

**Last working session:** 2026-04-14
**Working directory:** `c:\Users\twhitehead\projects\casino-gis`
**Dev URL:** `http://localhost:3000/gis.html` (via `vercel dev`)
**Git remote:** `github.com/daemozzz/portfolio` (personal; company repo pending — do not treat this remote as the long-term home)

---

## TL;DR for the next session

The map works end-to-end: 90 venues plotted over your choice of 3 basemaps, with optional state-regulation or county-income choropleth underlays, plus federal AI reservation boundaries. Data is read-only from local geojson files served by one Vercel API endpoint. **Nothing is committed to git yet** — the user wanted to review once more before committing.

Pick up by:
1. Start `vercel dev` (`cd` to repo root, run `vercel dev`)
2. Open `http://localhost:3000/gis.html`
3. Read `MEMORY.md` in the Claude memory dir (context files already exist — see bottom of this doc)
4. Read this handoff doc
5. Ask the user what they want to tackle from the "Next most-valuable work" list below

---

## What's built (production-ready, tested in browser)

**Map infrastructure** — [gis.html](../gis.html) / [gis.css](../gis.css) / [gis.js](../gis.js):
- Standalone dark command-center theme, no portfolio dependencies, no external fonts
- MapLibre GL v5.5.0 from CDN
- Three basemaps with a switcher radio: Liberty (dark, default), Positron (light), Esri World Imagery (satellite). Basemap switching preserves all overlay state via `installCustomLayers()` re-install on `styledata`
- Navigation + scale controls, responsive mobile layout, favicon inline as SVG data URI

**Venue layer (primary data):**
- Clustering at zoom < 8 with accurate counts (source.setData() on every filter change — clusters reflect filtered data, not all data)
- 5 categories with uniform data-driven symbology (color + radius interpolated by zoom)
- Click → popup with name, category badge, city/state, address, website, extras, collapsible "All attributes" `<details>` section
- Closed venues (when `operational_status: "closed"` is present) get a pulsing red banner at the top of the popup + strikethrough on the name + 25% opacity on the marker

**Layer panel** (top-right floating panel):
- 4 sections: **Basemap** (3 radios), **Choropleth** (None / State regulation / County income — mutually exclusive radios), **Boundaries** (Tribal reservations checkbox), **Venue categories** (5 checkboxes with per-category counts)
- Inline legends expand under the selected choropleth
- Scrolls when content exceeds window height (`max-height: calc(100vh - 240px)`)
- Layer z-order (bottom → top): base tiles → county choropleth → state choropleth → tribal → clusters → cluster counts → venue points

**Filter bar** (below header):
- Text search (180ms debounced) on venue name
- **Custom state multi-select:** floating draggable panel (not a dropdown), opens/closes via button, persistent until explicitly closed, drag by header, searchable checkbox list with per-state counts, Select all / Clear buttons respect current search
- Min tables slider (disabled — field not yet in data)
- Min geocode score slider (0–1)
- Toggle chips: Hide closed, Has website
- Reset button clears everything including re-enabling all categories + resetting choropleth to None

**Header:** brand mark, "X venues" pill, "X shown" pill (hidden unless filtered), LIVE pulse indicator

**API** — [api/geodata.js](../api/geodata.js):
- Local-filesystem-first with GitHub raw fallback (important: the existing env vars assumed wrong username `daemoz`; I changed the default to `daemozzz`)
- Query params: `?file=<name>` / `?bbox=` / `?category=`
- Listing: `GET /api/geodata` returns a JSON manifest of available datasets from the local `/geodata` directory

**Data files** — all in [geodata/](../geodata/):
| File | Size | Records | Notes |
|---|---|---|---|
| `casinos_social_clubs.geojson` | 81 KB | 90 | Canonical venue data with full field-level `_meta.field_sources` block |
| `us_states.geojson` | 88 KB | 52 | Simplified state polygons for state choropleth |
| `state_regulation.json` | 4.6 KB | 52 | Gambling regulation lookup keyed by state name — **STUB DATA, only 10 seeded** |
| `us_counties_income.geojson` | 2.8 MB | 3,221 | **Full-resolution** county polygons (not simplified) joined with ACS 5-year 2018–2022 median household income. 3,208 have income data |
| `tribal_lands.geojson` | 286 KB | 312 | Federal American Indian Reservations (AIANNH Layer 2), server-simplified to ~1km tolerance |
| `sample-points.geojson` | 1.3 KB | — | Pre-existed, unused by us |

**Documentation** — [docs/](../docs/):
- [data-dictionary.md](data-dictionary.md) — canonical field reference for all datasets, with source URLs, known issues, maintenance checklist, and future-dataset wishlist

**Infrastructure decisions baked in:**
- `.gitignore` excludes `.vercel` and `.scratch/` (scratch is where temp fetches go)
- `package.json` no longer has `"dev": "vercel dev"` (that caused recursive invocation — `vercel dev` reads the dev script and recursively calls itself)
- Vercel project is linked to `daemoz-1485s-projects/casino-gis` (NOT `portfolio-three-lac-36` — that's the old project). The user's personal portfolio API lives in the old project; this tool lives in the new one
- Vercel CLI is installed globally

---

## Decisions that are locked in

See memory files for full context, but the short versions:

1. **Audience:** marketing + execs. Non-technical. Read-only tool. No editing UI.
2. **Venue taxonomy is bounded** to the existing 5 categories. No sportsbooks, online, lottery.
3. **Per-field provenance** lives in `_meta.field_sources` blocks inside each geojson (survives git, ignored by MapLibre). Human-readable mirror lives in `docs/data-dictionary.md`.
4. **Symbology:** uniform across all categories. No per-category rule divergence. Cross-cutting filters on top of the map. User explicitly picked this over a nested tree approach.
5. **Architecture target:** thin API adapters, config-driven layer manifest, PostGIS long-term. *Not building these now.* Stay POC-grade until real data sources and users arrive.
6. **County choropleth is full-resolution** (2.8 MB). User explicitly prefers slower loads over topological gaps — important because a crude every-3rd-point decimation left 50-mile-wide slivers between counties in the first version.
7. **Spatial requirements:** buffer-from-point and drive-time are nice-to-have, NOT required. Don't prioritize.
8. **Personal remote** (`daemozzz/portfolio`) is a scratchpad. The real home is a company Azure DevOps / git repo that doesn't exist yet.

---

## In-flight / uncommitted

**Nothing is committed.** `git status` shows the following ready to commit when the user approves:

**Group 1 — feature work:**
- `gis.html` `gis.css` `gis.js` (new)
- `api/geodata.js` (modified: local-first fallback, `?category=` filter)
- `package.json` (modified: removed recursive `dev` script)
- `.gitignore` (modified: added `.scratch/`)

**Group 2 — data + docs:**
- `geodata/casinos_social_clubs.geojson` (with `_meta.field_sources`)
- `geodata/state_regulation.json`
- `geodata/us_states.geojson`
- `geodata/tribal_lands.geojson`
- `geodata/us_counties_income.geojson`
- `docs/data-dictionary.md`
- `docs/session-handoff.md` (this file)

**Group 3 — pre-existing in working tree, user's call:**
- `geodata/geocodio_upload.csv` — transient pipeline artifact
- `geodata/master_venues.csv` — **authoritative source CSV; useful lineage but may contain internal data you don't want on a public GitHub**
- `casino-gis.code-workspace` — VS Code workspace file

**Before committing:** user should confirm `master_venues.csv` is OK to publish. The personal remote is public.

---

## Next most-valuable work (priority-ordered)

These are the items I'd pick up next, in order. Each includes enough context that a fresh session can start work immediately.

### 1. Fix the outstanding browser warnings
- **WebGL `texImage` deprecation** — benign, inside MapLibre GL itself. Fixed in MapLibre 5.6+. One-line CDN pin bump in [gis.html](../gis.html:11-13).
- **"null instead of number"** — from the `NaN → null` cleanup. Root cause likely the `case` expression on `operational_status` matching against null. Fix: wrap field reads in `coalesce` or guard with `has`.

### 2. Pull the user's existing "ref maps"
User's director has reference maps that already do demographic buffer/drive-time analysis. User said "i have ref maps that do this already we can cleanup." **Start the next session by asking where these live and what format.** This is a high-leverage pull because it's existing, validated internal data.

### 3. Add more demographics as additional choropleth options
Same pattern as county income. Use the same Census ACS API with different variable codes. Requires one-line additions:
- Population: `B01003_001E`
- Median age: `B01002_001E`
- Educational attainment: `B15003_022E` (bachelor's+)
- Poverty rate: `B17001_002E`

Each becomes a new radio option under the Choropleth section. Factor out the fetch+join helper in [gis.js](../gis.js).

### 4. AGA commercial revenue + NIGC tribal facility list
- AGA publishes annual state commercial gaming revenue as PDF/CSV. Best source for a revenue-weighted state choropleth (alternative to regulation type). Manual download.
- NIGC (National Indian Gaming Commission) publishes tribal gaming facility lists. Cross-check against our existing Tribal venues.

### 5. Validate and populate `state_regulation.json`
Currently 42/52 states are `unknown`. The schema + UI work; we need authoritative classification data. User's research, not mine — but flag it as a blocker for "serious" state-regulation storytelling.

### 6. Venue details side panel (alt to popup)
When a user clicks a venue, instead of a popup, open a right-side panel showing every field. The popup's "All attributes" `<details>` is a stopgap. A proper panel can also show: nearby venues, containing county income, containing reservation, parent regulation state. Foreshadows the future "joined" views.

### 7. Layer panel hamburger / hierarchy
User flagged this as future work when the overlay list grows. Not needed yet (6 items fits). Reassess when the overlay count exceeds ~12.

### 8. `/api/layers` manifest endpoint
Architectural prep for multi-source, config-driven UI. Build this once there's more than one venue dataset. See `project_architecture_direction.md` in memory.

---

## Gotchas the next session should know

1. **The Vercel dev project is NOT `portfolio-three-lac-36`.** It's `daemoz-1485s-projects/casino-gis`, auto-created when I ran `vercel dev`. The old portfolio Vercel project is a separate thing and will return 404 at root (by design — API-only).

2. **Do not re-run `vercel dev` if it's already running.** The user has had to authenticate once; credentials persist. But `vercel dev` will fail recursively if `package.json` has a `"dev": "vercel dev"` script — already fixed, don't reintroduce.

3. **MapLibre `setStyle()` wipes all custom sources, layers, AND click handlers.** The basemap switcher works because `installCustomLayers()` runs again on `styledata`. If you add new sources/layers/handlers in the future, add them inside that function, not outside.

4. **Source-level filtering, not layer-level.** We filter the venue data by re-setting `source.setData(filtered)` on every filter change. This keeps cluster counts accurate. Don't use `setFilter` on `venues-points` — it'll break cluster count math.

5. **The `NaN → null` JSON fix is permanent.** Early in the session I discovered the casinos geojson contained invalid `NaN` literals. I replaced them with `null`. That stays. If the user ever re-exports from their source pipeline, the NaN pattern may reappear — re-apply the cleanup before loading.

6. **`_meta` blocks on GeoJSON FeatureCollections are our convention, not GeoJSON spec.** MapLibre ignores them. RFC 7946 allows unknown members. They're for tooling and lineage.

7. **Test data I seeded was rolled back.** I briefly added `operational_status: "closed"` to 3 venues and cleared 2 websites for user testing. All 5 edits have been reverted. The geojson is now in its natural state.

8. **Census ACS works without a key** for low-volume requests. Our fetch is small (one call, ~3200 rows). If you add more ACS calls in one session, consider registering for a free key.

9. **Plotly's FIPS counties dataset doesn't have a `NAME` with "County" suffix** — it's just `Autauga`, not `Autauga County`. The popup appends " County" for display.

10. **Memory files survive across chats.** `C:\Users\twhitehead\.claude\projects\c--Users-twhitehead-projects-casino-gis\memory\` already contains 5 files the next session will auto-load via `MEMORY.md`. Don't duplicate that content in this handoff doc — cross-reference.

---

## Cold-start checklist for the next chat

Paste this as the first message to the next session:

> Read `docs/session-handoff.md` and all files referenced in `MEMORY.md` before doing anything. Then `vercel dev` should already be runnable from the repo root, and the map is at `http://localhost:3000/gis.html`. Confirm you can see the map load cleanly in the browser, then let's pick up from the "Next most-valuable work" list in the handoff doc.

And the session should, in order:

1. [ ] Read this file completely
2. [ ] Read `MEMORY.md` and the project memory files it links to (company pivot, architecture direction, scope decisions, user role, repo split)
3. [ ] Run `git status` to confirm nothing was committed mid-flight
4. [ ] Start `vercel dev` if not already running; verify `http://localhost:3000/gis.html` loads, all layers render, no console errors
5. [ ] Ask the user which item from the "Next most-valuable work" list they want first — don't assume
6. [ ] **Before** starting any data pull or schema work, check whether the user has provisioned their company git repo or Postgres — the answer changes scope significantly
7. [ ] Remember: user is GIS-fluent, prefers architectural discussion + tradeoffs over "what should I do?", and explicitly validates approaches they like

---

## Project memory files (auto-loaded on session start)

These live in `C:\Users\twhitehead\.claude\projects\c--Users-twhitehead-projects-casino-gis\memory\` and are indexed by `MEMORY.md`:

- `project_repo_split.md` — backend-only repo; frontend lived on Neocities (historical)
- `project_company_tool_pivot.md` — 2026-04-14 pivot from portfolio demo to internal tool
- `project_architecture_direction.md` — target: thin adapters, layer manifest, PostGIS
- `project_scope_decisions.md` — bounded taxonomy, read-only, no drive-time, per-field provenance
- `user_role_and_audience.md` — marketing/exec audience, user is GIS-fluent

The next session's first read should be this handoff doc; memory files load automatically.
