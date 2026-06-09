# Session handoff — last updated 2026-04-30

> Supersedes the 2026-04-29 version. Read this file + `MEMORY.md` first.

## Quick cold-start

1. Open `http://localhost:3000/gis.html` — should show ~1,400 verified points by default ("Only verified" toggle is now ON by default; toggle off to see all 2,656 features).
2. If dev server down, run `vercel dev` from repo root.
3. Read **"NEXT-CHAT focus: Phase 2 Google Places enrichment"** below — that's the priority.
4. Ask user which item to tackle — don't assume.

---

## Sessions 2026-04-29 → 2026-04-30 — what shipped

### 1. Frontend polish (legend rev) — completed earlier session
- Halo legend renamed `LEGEND` (was "HALO MEANING")
- Mid-grey body background for swatch contrast (`#475569`)
- New halo color scheme: **green** `#22c55e` for poker-confirmed (was white), pure **white** for tables-confirmed, black for confirmed-no, **no outline** for unknown
- Racetrack fill flipped to **pink** `#ec4899` (was green) to free up green for poker
- Layer panel Racetrack swatch updated to match

### 2. Filter ribbon restructure — completed earlier session
- Two-column layout: left (Search/State/Min Tables/Min Geocode) flowing horizontally, vertically centered against right column's 2-row stack
- Right column top row = 6 toggle chips; bottom row = 3 action buttons (Open table / Select area / Reset)
- No dashed separator. Reduced padding throughout. Ribbon visibly thinner

### 3. Attribute table polish — completed earlier session
- CSV button shrunk to icon `⤓`, Clear shrunk to `✕` (icon-only with tooltips)
- Spacer dropped — toolbar packs flush on one row
- Cap banner for >500 row renders ("Showing first 500 of N — refine filters or search by name")

### 4. State regulation update — completed earlier session
- `state_regulation.json` now has all 51 entries classified, **0 unknowns** (was 35)
- Distribution: 23 commercial, 11 tribal, 11 limited, 7 prohibited
- Each state has `notes` field with regulator + key venue context
- Added `last_reviewed: 2026-04-29`, sources documented in `_meta`
- Online poker explicitly OUT OF SCOPE (brick-and-mortar lens only)

### 5. Master miscategorization fix — completed earlier session
- 97 rows reclassified Casino/Casino Hotel → Tribal in 11 tribal-only states
- Tribal venues on map: 199 → 273 (+74 visible after coords applied)
- `category_corrected:Casino->Tribal_per_state_regulation` tag in operational_notes
- Backup: `master_venues.csv.miscat_bak`

### 6. Comprehensive duplicate cleanup (`dedupe_v2.py`) — major work today
Four-pass cleanup beyond what `dedupe_master.py` caught:

| Pass | What | Result |
|---|---|---|
| 1 | OSM polygon-explosion garbage (e.g. "The Reserve" × 10 OSM polygons of a residential building falsely tagged amenity=casino) | **26 rows removed**: 4 clusters absorbed into nearby real venues, 1 garbage-name cluster deleted entirely (The Reserve), 7 isolated reduced to single canonical |
| 2 | Wikidata coord propagation bug (single Wikidata coord propagated to multiple master rows fuzzy-matching on name+state — e.g. Osage Casino Bartlesville/Hominy/Sand Springs all got Ponca City's coord) | **4 rows had bad coords cleared** (Osage Casino × 3, Comanche Spur). Now `needs_research`. |
| 3+4 | Same-name AND different-name proximity merge (within 50m). Combined fuzzy gate (max of token_sort/set/partial >= 70 after corp + venue-type suffix strip) | **144 clusters merged, 156 rows absorbed**. **46 suspicious clusters tagged `shared_address:`** for human review (rebrands like Las Vegas Club / Circa, Horseshoe Cleveland / JACK Cleveland) |

**Master**: 3,762 → **3,580 rows** (-182). **Map features**: 2,842 → **2,656** (-186). Backup: `master_venues.csv.dedupe2_bak`.

### 7. OSM trust audit (`verify_osm_trust.py`) — completed today
3-pass audit responding to user's "what dataset did 'The Reserve' come from?" concern:

| Pass | What | Result |
|---|---|---|
| 1 | Flag every OSM-only row (data_source = "osm" only) with `low_trust:osm_only_no_corroboration` + `manual_review=True` | **776 rows flagged** |
| 2 | NV cross-check: fuzzy-match each NV OSM-only row against cached NGCB licensee data | **19 validated** (real licensed casinos), **6 flagged `potentially_closed:no_NGCB_active_match`** |
| 3 | International (no-state) flag: `international_osm` tag added | **578 rows tagged** |

**6 NV potentially-closed rows** identified as needing human triage (mix of true closures, mis-tagged nightclubs, restricted-gaming taverns, and one false-positive — The Palazzo licensed under Venetian's NGCB record but didn't fuzzy-match).

Backup: `master_venues.csv.osmflag_bak`.

### 8. Mexican state-code normalization — completed today
- 4 rows had Mexican state values in master's `state` field (`SO`, `CHIHUAHUA`, `N.L.`, etc.) — normalized to `MX`
- Originals preserved as `mx_state:<original>` tag in operational_notes
- Backup: `master_venues.csv.mxfix_bak`

### 9. Pokerpilgrims category-code verification — completed earlier session
- User pulled live `wpgmza_category_data` from pokerpilgrims map page via DevTools
- Code 4 was wrong in adapter (had "Tribal", actual is "Small Cardroom" = "Poker / Card Club")
- Real damage: only 2 rows. Both fixed; adapter map corrected for future re-imports.

### 10. Phase 1 — manual_review smart re-classification (`reclassify_manual_review.py`) — completed today
Re-evaluated every `manual_review=True` row against tiered ruleset:
- CLEAR if 2+ data sources AND no concern tags (multi-source corroborated)
- CLEAR if regulator source (NGCB/CGCC) AND no concern tags (regulator-authoritative)
- KEEP if has any of: `shared_address:`, `potentially_closed:`, `low_trust:`, `osm_polygon_cluster:` tags
- KEEP if `geocode_status='closed'` (flag is moot, but kept for consistency)

| | Before | After |
|---|---|---|
| Master rows flagged | 2,320 | **1,745** (-575) |
| Map features in "Only unverified" | 1,788 | **1,244** (-544, **30%**) |

**Cleared breakdown**: 458 multi-source, 117 regulator-authoritative.
**Kept breakdown**: 880 concern-tag (legitimate review needed), 823 single non-regulator (Phase 2 candidates), 42 closed.

Backup: `master_venues.csv.reclass_bak`.

### 11. Filter rename: "Only unverified" → "Only verified" (default ON) — completed today
- Inverted semantics: shows only `manual_review !== "True"` rows
- Default ON (clean initial map view for marketing/exec audience)
- Reset button restores default-ON
- Tooltip updated to describe verification meaning

---

## Current master state (end of 2026-04-30)

| | Count |
|---|---|
| **Master total** | **3,580** |
| Map features (geocoded) | **2,656** |
| `needs_research` (no coords) | ~700 |
| Closed (filtered out by default) | ~50 |
| Same-address dupes remaining | 0 |
| Flagged `manual_review=True` | 1,745 |
| Flagged `shared_address:` (rebrand-ambiguous, human review) | 87 |
| Flagged `low_trust:osm_only_no_corroboration` | 776 |
| Flagged `potentially_closed:no_NGCB_active_match` | 6 |
| Flagged `international_osm` (no-state OSM rows, kept per directive) | 578 |

**Categories on map** (post-cleanup, post-recategorization):
- Poker / Card Club: 1,115
- Casino: 1,046
- Tribal: 265
- Casino Hotel: 200
- Racetrack: 30

---

## Backups (all local, reversible)

`geodata/master_venues.csv.*`:
- Earlier session: `.bak`, `.audit_bak`, `.pregeocodio_bak`, `.round2_bak`, `.prenominatim_bak`, `.osm_review_bak`, `.review_bulk_bak`, `.bucket_b_bak`, `.wiki_bak`
- Earlier session: `.wikidata_bak`, `.ngcb_bak`, `.cgcc_bak`, `.dedupe_bak`, `.pp_recat_bak`
- 2026-04-29: `.miscat_bak`
- 2026-04-30 chain: `.dedupe2_bak` → `.osmflag_bak` → `.mxfix_bak` → `.reclass_bak`

Each step reversible from the relevant snapshot.

---

# 🎯 NEXT-CHAT focus: Phase 2 Google Places enrichment

**Decision made this session**: Phase 2 will use **Google Places API (New)** — not scraping. Research confirmed it's **effectively $0** within Google Cloud's recurring monthly free credit ($200/month) + 10K free per SKU. Full pass on our 1,599 candidate rows = ~$35 of usage = **fits inside one month's free allowance**. Quarterly refresh stays at $0 recurring.

## Why this and not scraping

The user originally asked for free non-API methods. Research surfaced that:
- All major Places APIs (Yelp, HERE, Foursquare, Azure Maps) have free tiers but US casino coverage drops 20-40% vs Google
- Google Maps scraping is ToS-violating, anti-bot detection tightened in 2026, maintenance burden high
- Google's own free tier (recurring monthly) covers our entire dataset with margin
- The "$0 outcome" is the same; the cost difference is engineering pain vs API key setup

## Phase 2 architecture (planned, not yet built)

`scrapers/google_places/google_places_pipeline.py` — same shape as NGCB pipeline:

| Phase | What | Cache |
|---|---|---|
| 1 | Build candidate list (1,599 rows: 776 low_trust OSM + 823 single-source non-regulator) | `candidates.json` |
| 2 | searchText one call per row → `place_id`, formatted_address, business_status | `place_ids.json` |
| 3 | Place Details one call per matched place_id → phone, website, hours | `details.json` |
| 4 | Merge to master: append `google` to data_source, fill website/phone, store hours+place_id in operational_notes; flip `geocode_status=closed` if `business_status=CLOSED_PERMANENTLY`; clear manual_review on validated | `master_venues.csv.googlemerge_bak` |

**Field mask** (cost-optimized): `places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours`

**Match validation**: accept top searchText result if fuzzy name ≥ 85 OR coords within 200m. Else tag `google_no_match`.

**Throttle**: 10 qps. Total wall clock: ~5 min for 1,599 × 2 calls.

**Expected outcome (estimated)**:
- ~70% match + active → clear `manual_review`, gain phone/website/hours (~1,100 rows)
- ~5-10% match + permanently_closed → flip to `geocode_status=closed` (~80-150 rows real closures)
- ~20-25% no match → tag `google_no_match`, keep flagged (~400-450 rows)

## Google Cloud setup status — DONE 2026-04-30

✅ Project: "My First Project" (`bionic-repeater-418704`), billing attached
✅ Places API (New) enabled
✅ API key created, restricted to Places API (New) only — labeled "Maps Platform API Key"
✅ Budget alert configured at $5/month
✅ Env var `GOOGLE_PLACES_API_KEY` set in user-scope on Windows
✅ Smoke test passed (queried Bellagio, returned correct address)

**Phase 2 build is unblocked.** Open in next chat = scope confirmation + script build.

## Field-mask decision needed in next chat

Cost impact at 1,599 candidate calls:

- **Tier 1 only** (essentials + pro): ~$35 of usage. Fields: id, displayName, formattedAddress, addressComponents, location, businessStatus, nationalPhoneNumber, websiteUri, regularOpeningHours, googleMapsUri, types
- **Tier 1 + Tier 2** (adds Enterprise atmosphere fields): ~$48 of usage. Adds: rating, userRatingCount, priceLevel, editorialSummary

Both fit easily inside the monthly free credit. **Recommendation: ship with Tier 1 + Tier 2 — marginal cost, but `rating`/`userRatingCount` give the marketing team a meaningful new "which casinos have 4.5+ stars and 1000+ reviews" lens that no other source provides.**

Field mask for Tier 1 + Tier 2:
```
places.id,places.displayName,places.formattedAddress,
places.addressComponents,places.location,places.businessStatus,
places.nationalPhoneNumber,places.websiteUri,
places.regularOpeningHours,places.googleMapsUri,places.types,
places.rating,places.userRatingCount,places.priceLevel,
places.editorialSummary
```

## Scope decision needed in next chat

- **Targeted (1,599 candidates)**: only manual_review-flagged rows. Validates the suspicious set.
- **Blanket (3,580 rows)**: enriches everything with phone/website/hours/rating regardless of trust state. Recommended for comprehensive marketing contact data.

## CRITICAL: 50-row pilot test BEFORE the full pass

**Do not run the full pass without a pilot first.** Reason: I told the user the $200/month Maps Platform credit was guaranteed. Subsequent investigation showed I can't verify that in 2026 — Google restructured pricing March 2025, may have retired the $200 recurring credit for new accounts. The user's Credits page shows only an expired one-time $300 trial; no active credit balance.

**What we know for sure**:
- The per-SKU 10K/month free quota IS active. Our 3,580 calls per SKU fit inside it with massive margin.
- The $200 recurring credit may or may not apply.
- Either way, the math suggests $0 actual cost — but verify before committing.

**Pilot plan**:
1. Build the full pipeline normally
2. Add a `--limit 50` flag for the first run
3. Run pipeline with limit=50 on a small subset of candidate rows
4. Wait ~24 hours for billing to update
5. Check `console.cloud.google.com/billing` → Reports → April 2026 → does Subtotal show $0.00 actual cost?
6. If $0.00: free tier is doing its job, proceed with full pass
7. If anything > $0: we know the per-call rate, decide whether to continue or recalibrate scope

User has lowered budget alert to $1 (was $5) so any non-trivial cost triggers email immediately. 50-call pilot caps unprotected exposure at ~$1.50 worst case.

## Open Phase 2 questions deferred to next chat

- **Number of tables**: Google Places doesn't return this. Pokerpilgrims has it for ~280 rows. Could add Phase 3 to scrape "we have N tables" patterns from venue homepages we get from Google. Defer until Phase 2 lands.
- **Contact emails**: Places doesn't return them. Casino emails are typically marketing@/info@ on website Contact pages. Phase 3 if wanted.

---

## Other backlog (from prior sessions, still outstanding)

### Pre-work question — STILL UNRESOLVED
- **Has the user provisioned company git repo or Postgres yet?** Per `project_company_tool_pivot.md` memory + 2026-04-28 user confirmation: NOT provisioned. Plan: nail data + GUI first, migrate later. **Re-ask at start of next session.**

### Manual judgment items
- **6 NV "potentially closed" rows** flagged today need human triage:
  - VEN-2461 The Palazzo (likely false positive — licensed under Venetian)
  - VEN-2460 Tix4Tonight - Slots A Fun (real closure, flip to closed)
  - VEN-2446 Encore Beach Club (mis-tagged nightclub, drop)
  - VEN-2388/2391/2393 (restricted-gaming taverns, drop or recategorize)
- **87 `shared_address:` tagged rows** — rebrand vs different-venue ambiguity
- **27 outstanding Geocodio rows** in `geodata/geocodio_input.csv` (mostly TBD per CGCC + leftover)

### Coverage gaps
- **Central City CO** — master has only 4 rows; missing Reserve Casino Hotel + several others. Need a Colorado regulator scrape.
- **Backlog states with OSM-only data** awaiting future regulator scrapes: MT 39, CO 11, OR 11, WA 11, OK 11, SD 10, NM 9, IL 8, MI 6, LA 6, MN 4, AZ 3
- **`docs/data-dictionary.md`** still hasn't been updated for new attribute patterns (cgcc_tables, low_trust, mx_state, merged_from, etc.)

### Strategic
- **`curl_cffi` decision** — would unblock PokerAtlas/Bravo/CardPlayer aggregators. Still open.
- **PostGIS migration** — premature at 3,580 rows but threshold approaches. Still pending company-tool DB provisioning.
- **Frontend split** for personal-portfolio vs company deployment per `project_repo_split.md` memory — dual deployment plan still in scope.

---

## Repo state / operational notes

- **vercel dev** running on port 3000; will need restart next session
- **Python 3.12.10** at `C:\Users\twhitehead\AppData\Local\Programs\Python\Python312\python.exe`
- **Pip deps installed**: requests, beautifulsoup4, lxml, pandas, rapidfuzz, pdfplumber. **For Phase 2**: need to install `requests` (already there) and possibly `google-cloud-discovery-engine` or just use raw HTTPS calls (lighter dependency footprint)
- **Git**: massive uncommitted state across `scrapers/`, `geodata/`, `docs/`, `gis.html`, `gis.js`, `gis.css`. Still no remote pushes.
- **Master CSV schema stable** — still 25 columns. New attribute patterns live in `operational_notes` per the no-source-specific-columns policy.

---

## Memory files (auto-loaded on session start)

- `project_repo_split.md`, `project_company_tool_pivot.md`, `project_architecture_direction.md`, `project_scope_decisions.md`, `user_role_and_audience.md`
- `feedback_no_source_ids_in_schema.md` — don't add wikidata_qid / osm_id columns
- `feedback_use_existing_mechanisms_over_manual_review.md` — bridge source signals (P576 etc.) into existing schema fields automatically

---

## Cold-start sequence for next session

1. Read this file completely — Phase 2 priority is at the top
2. Read `MEMORY.md` and the linked memory files
3. `git status` (expected: many files uncommitted across scrapers/, geodata/, docs/, gis.*)
4. Start `vercel dev`; verify `http://localhost:3000/gis.html` loads ~1,400 verified points by default (toggle "Only verified" off to see all 2,656)
5. **Re-ask the pre-work question**: company git/Postgres provisioning still pending? (Per project_company_tool_pivot.md)
6. **Verify Phase 2 setup is intact**: `$env:GOOGLE_PLACES_API_KEY` should print the key in PowerShell. If empty, ask user to re-set with `[Environment]::SetEnvironmentVariable(...)`.
7. **Confirm scope before building**:
   - Targeted (1,599 manual_review rows) OR Blanket (all 3,580 rows)?
   - Field mask: Tier 1 only OR Tier 1 + Tier 2 (recommended — adds rating, userRatingCount, priceLevel, editorialSummary at marginal cost)?
8. **Build `scrapers/google_places/google_places_pipeline.py`** per the architecture. Show user the script for review BEFORE running. Otherwise pick from "Other backlog" above.
7. User style: GIS-fluent, prefers architectural discussion + tradeoffs. Validates explicitly ("yeah, go", "good fix"). Corrects directly when off-track. **Strongly prefers no-recurring-cost solutions** — re-confirm Phase 2 fits inside Google's free tier before any spend.
