# casino-gis Data Dictionary

Canonical reference for every dataset bundled in [`/geodata`](../geodata/).
Each dataset ships as a standalone file with an embedded `_meta` block — this
document is the human-readable mirror.

**Conventions:**
- Every file is valid GeoJSON (RFC 7946) with a top-level `_meta` property.
  MapLibre ignores `_meta`; it exists for tooling, lineage, and humans.
- Field-level provenance lives in `_meta.field_sources[field_name]` on datasets
  where fields come from mixed sources.
- Dates are ISO-8601 (`YYYY-MM-DD`).
- When a field is not yet populated, `last_updated` is `null` and the source
  reads `not yet populated`.

---

## `casinos_social_clubs.geojson`

**Description:** US casinos, card clubs, tribal gaming venues, and racetracks.
**Record type:** `Point` features.
**Current count:** 90.
**Canonical ID:** `venue_id` (format `VEN-NNN`).

| Field | Type | Source | Description |
|---|---|---|---|
| `venue_id` | string | internal | Stable internal identifier. Never reuse. |
| `venue_name` | string | zoominfo + research | Venue legal or trade name. |
| `venue_category` | enum | internal research | One of: `Casino`, `Casino Hotel`, `Tribal`, `Racetrack`, `Poker / Card Club`. |
| `website` | string | zoominfo + research | Primary website, no protocol. Empty string if none. |
| `street` | string | zoominfo | Street address. |
| `city` | string | zoominfo | City name. |
| `state` | string | zoominfo | US state, **full name** (not USPS abbreviation). |
| `zip` | string | zoominfo | ZIP or ZIP+4. |
| `county` | string | zoominfo | County name. |
| `contact_known` | string | internal research | `True` / `False`-ish string (legacy format). |
| `naics_code` | string\|null | zoominfo | NAICS industry classification code. |
| `num_employees` | string\|null | zoominfo | Approximate employee count. |
| `revenue_range` | string\|null | zoominfo | Bucketed revenue (e.g. `$25 mil. - $50 mil.`). |
| `geocode_accuracy_type` | string | geocodio | Geocoder match descriptor (`rooftop`, `range`, etc.). |
| `geocode_accuracy_score` | string | geocodio | Confidence score 0–1 as a string. |
| `manual_review` | string\|null | internal | Whether the record was hand-verified. |
| `operational_notes` | string\|null | internal research | Freeform analyst notes. |
| `data_source` | string | internal | Origin vendor tag for the full record. |
| `operational_status` | enum | *not yet populated* | Future: `active` / `closed` / `unknown`. Drives closed-venue prominence in the UI when present. |

**Known issues:**
- `geocode_accuracy_score` and `num_employees` are strings, not numbers. Filters
  cast with `parseFloat`/`parseInt`. Normalize on DB migration.
- `zip` is sometimes a float string like `77449.0`. Clean on migration.

---

## `us_states.geojson`

**Description:** Simplified US state polygons for choropleth rendering.
**Record type:** `Polygon` features.
**Current count:** 52 (50 states + DC + Puerto Rico).
**Canonical ID:** `name` (full state name — matches `casinos_social_clubs.state`).

| Field | Type | Source | Description |
|---|---|---|---|
| `name` | string | US Census TIGER | Full state name. |

**Source:** [PublicaMundi/MappingAPI](https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json), derived from US Census TIGER/Line. Public domain.

---

## `state_regulation.json`

**Description:** Per-state gambling regulation classification. **Not geospatial** —
a JSON lookup keyed by state name, joined client-side with `us_states.geojson`.
**Canonical ID:** state name (must match `us_states.name`).

**Categories:** `commercial`, `tribal`, `limited`, `prohibited`, `unknown`.

| Field | Type | Description |
|---|---|---|
| `states[<name>].regulation_type` | enum | One of the 5 category values. |
| `states[<name>].notes` | string | Optional analyst notes. |

**⚠ STUB DATA — validate before production.** Only 10 states are seeded with
plausible values. The remaining 42 are `unknown`.

---

## `us_counties_income.geojson`

**Description:** US county polygons joined with ACS median household income.
**Record type:** `Polygon` / `MultiPolygon` features.
**Current count:** 3,221 counties (3,208 with income data).
**Canonical ID:** `fips` (5-digit FIPS state+county code, also set as `feature.id`).

| Field | Type | Source | Description |
|---|---|---|---|
| `name` | string | US Census | County name (no "County" suffix). |
| `state_fips` | string | US Census | 2-digit state FIPS. |
| `fips` | string | US Census | 5-digit state+county FIPS. |
| `median_household_income` | integer\|null | Census ACS 5-Year 2018–2022 (table B19013) | Median household income, USD, inflation-adjusted. |

**Polygon source:** [Plotly datasets](https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json), derived from US Census TIGER.
**Income source:** [Census ACS API](https://api.census.gov/data/2022/acs/acs5), variable `B19013_001E`.
**Simplification:** Custom decimation — keeps every 3rd coordinate while preserving ring closure. Good enough for choropleth rendering.

---

## `tribal_lands.geojson`

**Description:** Federal American Indian Reservations (AIANNH Layer 2).
**Record type:** `Polygon` / `MultiPolygon` features.
**Current count:** 312 reservations.
**Canonical ID:** `geoid`.

| Field | Type | Source | Description |
|---|---|---|---|
| `name` | string | US Census TIGER | Reservation name. |
| `geoid` | string | US Census TIGER | Census AIANNH GEOID. |

**Source:** [TIGERweb AIANNHA MapServer, Layer 2](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/AIANNHA/MapServer/2).
**License:** Public domain (US federal government data).
**Simplification:** `maxAllowableOffset=0.01` degrees (~1km) server-side Douglas-Peucker.

**Scope note:** Layer 2 contains *federally recognized* American Indian
reservations only. It does **not** include Alaska Native Regional Corporations,
Hawaiian Home Lands, Oklahoma Tribal Statistical Areas, or off-reservation trust
lands. If we need those later, they live in sibling layers (3, 5, 7) of the
same MapServer.

---

## Future datasets (planned)

These are identified but not yet pulled:

- **AGA commercial gaming revenue by state** — American Gaming Association
  publishes annually. Good second choropleth option (state-level revenue).
- **NIGC tribal gaming facility list** — authoritative cross-check against our
  Tribal-category venues; may reveal gaps.
- **Census AIANNH layers 3, 5, 7** — off-reservation trust lands, Hawaiian Home
  Lands, Oklahoma Tribal Statistical Areas.
- **Census county demographics beyond income** — age distribution, population,
  educational attainment. Same ACS API, different variable codes.

## Maintenance checklist

When adding or updating a dataset:

1. Update the file's `_meta` block (`last_updated`, `record_count`, bump
   `schema_version` if field shapes changed).
2. Update this document.
3. If field shapes changed, update the corresponding code in [`gis.js`](../gis.js)
   (filter pipeline, popup renderer, layer expressions).
4. Commit the geodata file, the dictionary update, and any code changes
   together — lineage should be reviewable as one change.

## On provenance

The per-field provenance in `_meta.field_sources` is the source of truth for
*where fields come from*. This document mirrors it in a more readable form.
If they drift, trust the `_meta` block — it ships with the data.

When the project moves to a real database (PostGIS likely), these
`field_sources` blocks should migrate to a provenance table keyed on
`(dataset, field_name)` rather than being embedded in each GeoJSON file.
