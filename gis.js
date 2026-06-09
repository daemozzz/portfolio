// gis.js — Casino & Social Club interactive map
// Standalone. Depends only on: maplibre-gl (loaded via CDN in gis.html)

(function () {
  // --------------------------------------------------------------
  //  CONFIG — edit API_BASE when hosting on a different deployment.
  //  Leave empty ("") to call a same-origin /api/geodata endpoint.
  // --------------------------------------------------------------
  var API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? ""
    : "https://portfolio-three-lac-36.vercel.app";

  var GEODATA_URL    = API_BASE + "/api/geodata?file=casinos_social_clubs";
  var STATES_URL     = API_BASE + "/api/geodata?file=us_states";
  var REGULATION_URL = API_BASE + "/geodata/state_regulation.json";
  var COUNTIES_URL   = API_BASE + "/api/geodata?file=us_counties_income";
  var TRIBAL_URL     = API_BASE + "/api/geodata?file=tribal_lands";

  // Regulation classification palette — must match .reg-row .reg-dot colors in gis.css
  var REG_COLOR = {
    commercial:  "#0891b2",
    tribal:      "#7c3aed",
    limited:     "#84cc16",
    prohibited:  "#b45309",
    unknown:     "#64748b"
  };

  // Income choropleth color ramp (teal sequential, 5 bins + no-data)
  var INCOME_COLORS = ["#0c4a6e", "#0e7490", "#14b8a6", "#5eead4", "#ccfbf1"];
  var INCOME_NODATA = "#334155";

  var INITIAL_VIEW = { center: [-98.5, 39.5], zoom: 4 };

  var CATEGORIES = [
    "Casino Hotel", "Casino", "Tribal", "Racetrack", "Poker / Card Club"
  ];

  var CAT_COLOR = {
    "Casino Hotel":      "#f59e0b",
    "Casino":            "#3b82f6",
    "Poker / Card Club": "#ef4444",
    "Tribal":            "#8b5cf6",
    "Racetrack":         "#ec4899"
  };

  // ---- Filter state (category panel + master filter bar) ----
  var state = {
    categories: new Set(CATEGORIES),
    search:      "",
    states:      new Set(),     // empty = all
    hideClosed:  false,
    hasWebsite:  false,
    hasPoker:    false,     // require has_poker === "True"
    hasTables:   false,     // require has_table_games === "True"
    hideUnknown: false,     // require both flags be "True" or "False" (not "")
    onlyVerified: true,     // show only rows where manual_review !== "True" — default ON for clean initial map
    minTables:   0,
    minGeoScore: 0,

    // Spatial selection state
    selectMode:   false,        // true while user is drawing the bbox
    selectedIds:  new Set(),    // venue_ids in current selection (post-bbox)
    onlySelected: false,        // when true, map hides everything outside selectedIds
    attrNameFilter: ""          // substring filter applied inside the attr table
  };

  // The original unfiltered geojson lives here so every filter change
  // can recompute from the source of truth.
  var rawGeojson = null;
  var enrichedStates = null;    // states geojson + regulation data joined
  var countiesGeojson = null;   // counties + ACS income already joined at build time
  var tribalGeojson = null;     // federal AI reservations
  var currentBasemap = "liberty";

  // ---- Basemap styles ----
  // Vector styles are URLs; raster styles are inline style objects that
  // MapLibre accepts directly from setStyle().
  var BASEMAPS = {
    liberty:   { label: "Dark",      style: "https://tiles.openfreemap.org/styles/liberty"  },
    positron:  { label: "Light",     style: "https://tiles.openfreemap.org/styles/positron" },
    satellite: {
      label: "Satellite",
      style: {
        version: 8,
        sources: {
          "esri-world-imagery": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: "Imagery © Esri — Source: Esri, Maxar, Earthstar Geographics"
          }
        },
        layers: [
          { id: "esri-world-imagery", type: "raster", source: "esri-world-imagery" }
        ],
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
      }
    }
  };

  // ---- Map init ----
  var map = new maplibregl.Map({
    container: "map",
    style: BASEMAPS[currentBasemap].style,
    center: INITIAL_VIEW.center,
    zoom: INITIAL_VIEW.zoom,
    attributionControl: { compact: true }
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "imperial" }), "bottom-left");

  // ---- Data-driven expressions (uniform across all categories) ----
  var colorExpr = [
    "match",
    ["get", "venue_category"],
    "Casino Hotel",      CAT_COLOR["Casino Hotel"],
    "Casino",            CAT_COLOR["Casino"],
    "Poker / Card Club", CAT_COLOR["Poker / Card Club"],
    "Tribal",            CAT_COLOR["Tribal"],
    "Racetrack",         CAT_COLOR["Racetrack"],
    "#64748b"
  ];

  // Helper: both flags are explicitly confirmed False
  var bothFalseExpr = [
    "all",
    ["==", ["get", "has_poker"], "False"],
    ["==", ["get", "has_table_games"], "False"]
  ];

  var baseRadiusExpr = [
    "match",
    ["get", "venue_category"],
    "Casino Hotel",      6,
    "Casino",            5,
    "Poker / Card Club", 4,
    "Tribal",            6,
    "Racetrack",         5,
    5
  ];

  var radiusExpr = [
    "interpolate", ["linear"], ["zoom"],
    4,  baseRadiusExpr,
    10, ["+", baseRadiusExpr, 4]
  ];

  // Opacity encodes both operational status and geocode confidence so the
  // map honestly conveys data trust. Closed → strongly dimmed. Active →
  // tiered by accuracy_type so a city-centroid pin doesn't pretend to
  // have the same authority as a rooftop one.
  var opacityExpr = [
    "case",
    ["==", ["get", "operational_status"], "closed"], 0.25,
    ["match", ["get", "geocode_accuracy_type"],
      ["place", "state"], 0.45,
      ["street_center"], 0.65,
      ["wikidata", "nearest_rooftop_match"], 0.85,
      0.95
    ]
  ];

  // Halo encodes the offering signal (independent of venue_category fill color):
  //   Poker=True          → thick GREEN halo (priority)
  //   Tables=True (no pkr)→ pure white halo
  //   Both confirmed False→ BLACK halo (strong "no" signal)
  //   Unknown             → no halo (width 0)
  var strokeWidthExpr = [
    "case",
    ["==", ["get", "has_poker"], "True"],       2.5,
    ["==", ["get", "has_table_games"], "True"], 1.8,
    bothFalseExpr,                              1.8,
    0
  ];

  var strokeColorExpr = [
    "case",
    ["==", ["get", "has_poker"], "True"],       "#22c55e",
    ["==", ["get", "has_table_games"], "True"], "#ffffff",
    bothFalseExpr,                              "#000000",
    "#000000"
  ];

  var strokeOpacityExpr = [
    "case",
    ["==", ["get", "has_poker"], "True"],       1.0,
    ["==", ["get", "has_table_games"], "True"], 0.95,
    bothFalseExpr,                              1.0,
    0
  ];

  // ---- Load data (once) ----
  // Venues are critical; states/regulation are best-effort.
  map.on("load", function () {
    var fetchJson = function (url) {
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error(url + " → HTTP " + r.status);
        return r.json();
      });
    };

    Promise.all([
      fetchJson(GEODATA_URL),
      fetchJson(STATES_URL).catch(function (e) { console.warn("states load failed:", e); return null; }),
      fetchJson(REGULATION_URL).catch(function (e) { console.warn("regulation load failed:", e); return null; }),
      fetchJson(COUNTIES_URL).catch(function (e) { console.warn("counties load failed:", e); return null; }),
      fetchJson(TRIBAL_URL).catch(function (e) { console.warn("tribal load failed:", e); return null; })
    ])
      .then(function (results) {
        rawGeojson = results[0];
        if (results[1] && results[2]) {
          enrichedStates = joinRegulation(results[1], results[2]);
        }
        countiesGeojson = results[3];
        tribalGeojson = results[4];
        installCustomLayers();
        populateStateDropdown(rawGeojson);
        updateCategoryCounts(rawGeojson);
        updateHeaderCounts(rawGeojson, filterGeojson(rawGeojson));
        hideOverlay("map-loading");
      })
      .catch(function (err) {
        console.error("geodata load failed:", err);
        hideOverlay("map-loading");
        showOverlay("map-error");
      });
  });

  // ---- Install all custom sources, layers, and interaction handlers ----
  // Runs once after the initial style loads, and again after any basemap
  // switch (setStyle wipes all user sources/layers/handlers).
  function installCustomLayers() {
    // Overlays (ordered bottom → top; all start hidden)
    if (countiesGeojson) addCountyIncomeLayer(countiesGeojson);
    if (enrichedStates)  addStateRegulationLayer(enrichedStates);
    if (tribalGeojson)   addTribalLandsLayer(tribalGeojson);
    if (rawGeojson)      addVenueLayers(filterGeojson(rawGeojson));

    // Re-apply persisted layer visibility from current UI state
    applyChoroplethSelection();
    applyTribalVisibility();
  }

  function applyChoroplethSelection() {
    var selected = document.querySelector('input[name="choropleth"]:checked');
    var value = selected ? selected.value : "none";
    var regVis    = value === "state-regulation" ? "visible" : "none";
    var incomeVis = value === "county-income"    ? "visible" : "none";

    if (map.getLayer("state-regulation-fill"))    map.setLayoutProperty("state-regulation-fill",    "visibility", regVis);
    if (map.getLayer("state-regulation-outline")) map.setLayoutProperty("state-regulation-outline", "visibility", regVis);
    if (map.getLayer("county-income-fill"))       map.setLayoutProperty("county-income-fill",       "visibility", incomeVis);
    if (map.getLayer("county-income-outline"))    map.setLayoutProperty("county-income-outline",    "visibility", incomeVis);

    var regLegendEl    = document.getElementById("reg-legend");
    var incomeLegendEl = document.getElementById("income-legend");
    if (regLegendEl)    regLegendEl.hidden    = value !== "state-regulation";
    if (incomeLegendEl) incomeLegendEl.hidden = value !== "county-income";
  }

  function applyTribalVisibility() {
    var cb = document.getElementById("f-tribal-lands");
    var vis = cb && cb.checked ? "visible" : "none";
    if (map.getLayer("tribal-lands-fill"))    map.setLayoutProperty("tribal-lands-fill",    "visibility", vis);
    if (map.getLayer("tribal-lands-outline")) map.setLayoutProperty("tribal-lands-outline", "visibility", vis);
  }

  // Join regulation classification into the state polygon features.
  // Keeps the polygon source clean and makes classification a swappable
  // config file — future-friendly for DB-backed classification.
  function joinRegulation(statesGeojson, regulationData) {
    var lookup = regulationData.states || {};
    statesGeojson.features.forEach(function (f) {
      var name = f.properties && f.properties.name;
      var entry = lookup[name] || { regulation_type: "unknown" };
      f.properties.regulation_type = entry.regulation_type || "unknown";
      f.properties.regulation_notes = entry.notes || "";
    });
    return statesGeojson;
  }

  function addStateRegulationLayer(statesGeojson) {
    map.addSource("us-states", { type: "geojson", data: statesGeojson });

    map.addLayer({
      id: "state-regulation-fill",
      type: "fill",
      source: "us-states",
      layout: { visibility: "none" },
      paint: {
        "fill-color": [
          "match",
          ["get", "regulation_type"],
          "commercial",  REG_COLOR.commercial,
          "tribal",      REG_COLOR.tribal,
          "limited",     REG_COLOR.limited,
          "prohibited",  REG_COLOR.prohibited,
          REG_COLOR.unknown
        ],
        "fill-opacity": 0.38
      }
    }, firstSymbolLayerId());

    map.addLayer({
      id: "state-regulation-outline",
      type: "line",
      source: "us-states",
      layout: { visibility: "none" },
      paint: {
        "line-color": "rgba(255,255,255,0.25)",
        "line-width": 0.8
      }
    }, firstSymbolLayerId());

    map.on("click", "state-regulation-fill", function (e) {
      if (e.defaultPrevented) return;
      var f = e.features[0];
      var type = f.properties.regulation_type || "unknown";
      var color = REG_COLOR[type] || REG_COLOR.unknown;
      new maplibregl.Popup({ closeButton: true, maxWidth: "260px" })
        .setLngLat(e.lngLat)
        .setHTML(
          '<div class="venue-popup">' +
            '<div class="venue-name">' + esc(f.properties.name) + "</div>" +
            '<div class="venue-badge" style="color:' + color + ";border-color:" + color + ';">' +
              '<span class="badge-dot" style="background:' + color + ';"></span>' +
              type.toUpperCase() +
            "</div>" +
            (f.properties.regulation_notes
              ? '<div class="venue-notes">' + esc(f.properties.regulation_notes) + "</div>"
              : '<div class="venue-row" style="color:var(--text-mute);font-size:11px;">No notes on file.</div>') +
          "</div>"
        )
        .addTo(map);
    });
  }

  function addCountyIncomeLayer(countiesGeojson) {
    map.addSource("us-counties", { type: "geojson", data: countiesGeojson });

    map.addLayer({
      id: "county-income-fill",
      type: "fill",
      source: "us-counties",
      layout: { visibility: "none" },
      paint: {
        "fill-color": [
          "case",
          ["==", ["get", "median_household_income"], null], INCOME_NODATA,
          [
            "step",
            ["to-number", ["get", "median_household_income"]],
            INCOME_COLORS[0],
            40000, INCOME_COLORS[1],
            55000, INCOME_COLORS[2],
            70000, INCOME_COLORS[3],
            85000, INCOME_COLORS[4]
          ]
        ],
        "fill-opacity": 0.55
      }
    }, firstSymbolLayerId());

    map.addLayer({
      id: "county-income-outline",
      type: "line",
      source: "us-counties",
      layout: { visibility: "none" },
      paint: {
        "line-color": "rgba(255,255,255,0.08)",
        "line-width": 0.4
      }
    }, firstSymbolLayerId());

    map.on("click", "county-income-fill", function (e) {
      if (e.defaultPrevented) return;
      var f = e.features[0];
      var p = f.properties || {};
      var inc = p.median_household_income;
      var incStr = inc ? "$" + Number(inc).toLocaleString() : "No data";
      new maplibregl.Popup({ closeButton: true, maxWidth: "260px" })
        .setLngLat(e.lngLat)
        .setHTML(
          '<div class="venue-popup">' +
            '<div class="venue-name">' + esc(p.name || "County") + " County</div>" +
            '<div class="venue-badge" style="color:#5eead4;border-color:#5eead4;">' +
              '<span class="badge-dot" style="background:#5eead4;"></span>' +
              "MEDIAN HH INCOME" +
            "</div>" +
            '<div class="venue-row" style="font-size:15px;color:var(--text);"><span class="icon">$</span>' + esc(incStr) + "</div>" +
            '<div class="venue-row" style="font-size:11px;color:var(--text-mute);">FIPS: ' + esc(p.fips || "") + " · ACS 5-year 2018–2022</div>" +
          "</div>"
        )
        .addTo(map);
    });
  }

  function addTribalLandsLayer(tribalGeojson) {
    map.addSource("tribal-lands", { type: "geojson", data: tribalGeojson });

    map.addLayer({
      id: "tribal-lands-fill",
      type: "fill",
      source: "tribal-lands",
      layout: { visibility: "none" },
      paint: {
        "fill-color": "#a78bfa",
        "fill-opacity": 0.22
      }
    }, firstSymbolLayerId());

    map.addLayer({
      id: "tribal-lands-outline",
      type: "line",
      source: "tribal-lands",
      layout: { visibility: "none" },
      paint: {
        "line-color": "#a78bfa",
        "line-width": 1.2,
        "line-dasharray": [2, 2],
        "line-opacity": 0.8
      }
    }, firstSymbolLayerId());

    map.on("click", "tribal-lands-fill", function (e) {
      if (e.defaultPrevented) return;
      var f = e.features[0];
      var p = f.properties || {};
      new maplibregl.Popup({ closeButton: true, maxWidth: "260px" })
        .setLngLat(e.lngLat)
        .setHTML(
          '<div class="venue-popup">' +
            '<div class="venue-name">' + esc(p.name || "Reservation") + "</div>" +
            '<div class="venue-badge" style="color:#a78bfa;border-color:#a78bfa;">' +
              '<span class="badge-dot" style="background:#a78bfa;"></span>' +
              "FEDERAL AI RESERVATION" +
            "</div>" +
            '<div class="venue-row" style="font-size:11px;color:var(--text-mute);">GEOID: ' + esc(p.geoid || "") + " · US Census TIGER</div>" +
          "</div>"
        )
        .addTo(map);
    });
  }

  // Returns id of first symbol layer (typically labels), or undefined.
  // Used to insert fill layers below labels so cities/roads stay legible.
  function firstSymbolLayerId() {
    var layers = map.getStyle().layers || [];
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].type === "symbol") return layers[i].id;
    }
    return undefined;
  }

  function addVenueLayers(geojson) {
    map.addSource("venues", {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 5,   // unclustered from zoom 6 up (≈ 100 mi scale in CONUS)
      clusterRadius: 50
    });

    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "venues",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#2a3340",
        "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 25, 22],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#58a6ff",
        "circle-opacity": 0.88
      }
    });

    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "venues",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Noto Sans Regular"],
        "text-size": 12
      },
      paint: { "text-color": "#ffffff" }
    });

    map.addLayer({
      id: "venues-points",
      type: "circle",
      source: "venues",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": colorExpr,
        "circle-radius": radiusExpr,
        "circle-stroke-width": strokeWidthExpr,
        "circle-stroke-color": strokeColorExpr,
        "circle-opacity": opacityExpr,
        "circle-stroke-opacity": strokeOpacityExpr
      }
    });

    // Venue name labels — only at tight zoom (>=12) where overlap is rare.
    // text-allow-overlap=false lets MapLibre auto-hide labels that would
    // collide, keeping dense areas readable instead of a wall of text.
    map.addLayer({
      id: "venues-labels",
      type: "symbol",
      source: "venues",
      filter: ["!", ["has", "point_count"]],
      minzoom: 12,
      layout: {
        "text-field": ["get", "venue_name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
        "text-offset": [0, 1.1],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-optional": true,
        "text-padding": 4
      },
      paint: {
        "text-color": "#000000",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.4,
        "text-halo-blur": 0.4
      }
    });

    // ---- Interactions ----
    map.on("click", "clusters", function (e) {
      var features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
      var clusterId = features[0].properties.cluster_id;
      map.getSource("venues").getClusterExpansionZoom(clusterId).then(function (zoom) {
        map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom });
      });
    });

    map.on("click", "venues-points", function (e) {
      var f = e.features[0];
      var coords = f.geometry.coordinates.slice();
      while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
        coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
      }
      new maplibregl.Popup({ closeButton: true, maxWidth: "320px" })
        .setLngLat(coords)
        .setHTML(renderPopup(f.properties))
        .addTo(map);
    });

    map.on("mouseenter", "clusters",      function () { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "clusters",      function () { map.getCanvas().style.cursor = ""; });
    map.on("mouseenter", "venues-points", function () { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "venues-points", function () { map.getCanvas().style.cursor = ""; });
  }

  // ---- Filtering pipeline ----
  // Composes category + all master filters into a single pass over features.
  // Returns a new geojson; raw data is never mutated.
  function filterGeojson(g) {
    if (!g || !g.features) return { type: "FeatureCollection", features: [] };
    var q = state.search.trim().toLowerCase();

    var features = g.features.filter(function (f) {
      var p = f.properties || {};

      // Category
      if (!state.categories.has(p.venue_category)) return false;

      // Text search
      if (q && !(p.venue_name || "").toLowerCase().includes(q)) return false;

      // State
      if (state.states.size > 0 && !state.states.has(p.state)) return false;

      // Closed (only filters when the field is populated; missing = treated as not closed)
      if (state.hideClosed && p.operational_status === "closed") return false;

      // Website presence
      if (state.hasWebsite && !p.website) return false;

      // Poker / table-game feature flags (three-valued: "True" | "False" | "")
      if (state.hasPoker && p.has_poker !== "True") return false;
      if (state.hasTables && p.has_table_games !== "True") return false;
      if (state.hideUnknown && (!p.has_poker || !p.has_table_games)) return false;

      // Manual review filter
      if (state.onlyVerified && p.manual_review === "True") return false;

      // Min tables (field not yet in dataset — passes everything when missing)
      if (state.minTables > 0) {
        var tables = parseInt(p.num_tables, 10);
        if (isNaN(tables) || tables < state.minTables) return false;
      }

      // Geocode quality score
      if (state.minGeoScore > 0) {
        var score = parseFloat(p.geocode_accuracy_score);
        if (isNaN(score) || score < state.minGeoScore) return false;
      }

      // Spatial-selection drill-in: hide anything not in the current selection
      if (state.onlySelected && state.selectedIds.size > 0) {
        if (!state.selectedIds.has(p.venue_id)) return false;
      }

      return true;
    });

    return { type: "FeatureCollection", features: features };
  }

  function applyAllFilters() {
    if (!rawGeojson) return;
    var filtered = filterGeojson(rawGeojson);
    var src = map.getSource("venues");
    if (src) src.setData(filtered);
    updateHeaderCounts(rawGeojson, filtered);
  }

  // ---- Popup renderer ----
  function renderPopup(p) {
    var color = CAT_COLOR[p.venue_category] || "#58a6ff";
    var isClosed = p.operational_status === "closed";
    var parts = ['<div class="venue-popup' + (isClosed ? " is-closed" : "") + '">'];

    if (isClosed) {
      parts.push(
        '<div class="closed-banner">' +
          '<span class="closed-icon">⚠</span>' +
          '<span class="closed-label">CLOSED</span>' +
          '<span class="closed-sub">This venue is no longer operating</span>' +
        "</div>"
      );
    }

    parts.push('<div class="venue-name">' + esc(p.venue_name || "Unknown Venue") + "</div>");

    parts.push(
      '<div class="venue-badge" style="color:' + color + ";border-color:" + color + ';">' +
      '<span class="badge-dot" style="background:' + color + ';"></span>' +
      esc(p.venue_category || "Uncategorized") +
      "</div>"
    );

    var locBits = [p.city, p.state].filter(Boolean).join(", ");
    if (locBits) parts.push('<div class="venue-row"><span class="icon">▸</span>' + esc(locBits) + "</div>");
    if (p.street) parts.push('<div class="venue-row"><span class="icon">◉</span>' + esc(p.street) + "</div>");

    if (p.website) {
      var url = /^https?:\/\//i.test(p.website) ? p.website : "https://" + p.website;
      parts.push(
        '<div class="venue-row"><span class="icon">⌬</span>' +
        '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(p.website) + "</a>" +
        "</div>"
      );
    }

    // Feature flag summary (three-valued)
    var flagRow = function (label, val) {
      var icon, color;
      if (val === "True")       { icon = "✓"; color = "#22c55e"; }
      else if (val === "False") { icon = "✗"; color = "#94a3b8"; }
      else                      { icon = "?"; color = "#eab308"; }
      var text = val === "True" ? "Yes" : val === "False" ? "No" : "Unknown";
      return '<span style="color:' + color + ';font-weight:600;">' + icon + "</span> " +
             '<span style="color:var(--text-mute);">' + label + ":</span> " +
             '<span style="color:' + color + ';">' + text + "</span>";
    };
    var flagParts = [flagRow("Poker", p.has_poker), flagRow("Table games", p.has_table_games)];
    parts.push('<div class="venue-row" style="font-size:12px;">' + flagParts.join(" · ") + "</div>");

    var meta = [];
    if (p.num_employees) meta.push("Employees: " + p.num_employees);
    if (p.revenue_range) meta.push("Revenue: " + p.revenue_range);
    if (p.num_tables)    meta.push("Tables: " + p.num_tables);
    if (meta.length) {
      parts.push('<div class="venue-row" style="color:var(--accent-2);">' + esc(meta.join(" · ")) + "</div>");
    }

    // Prior name (from merge history) — surfaced if present in operational_notes
    var priorMatch = /prior_name:([^|]+)/.exec(p.operational_notes || "");
    if (priorMatch) {
      parts.push('<div class="venue-row" style="font-size:11px;color:var(--text-mute);font-style:italic;">formerly: ' + esc(priorMatch[1].trim()) + "</div>");
    }

    // Data sources
    if (p.data_source) {
      var srcs = p.data_source.split("|").map(function (s) { return s.trim(); }).filter(Boolean);
      if (srcs.length) {
        parts.push('<div class="venue-row" style="font-size:11px;color:var(--text-mute);">sources: ' + esc(srcs.join(", ")) + "</div>");
      }
    }

    if (p.manual_review === "True") {
      parts.push('<div class="venue-row" style="font-size:11px;color:#eab308;font-weight:600;">⚠ Flagged for review</div>');
    }

    if (p.operational_notes) {
      parts.push('<div class="venue-notes">' + esc(p.operational_notes) + "</div>");
    }

    // Full attribute dump
    var hiddenKeys = {
      venue_name: 1, venue_category: 1, city: 1, state: 1, street: 1,
      website: 1, num_employees: 1, revenue_range: 1, num_tables: 1, operational_notes: 1,
      has_poker: 1, has_table_games: 1, data_source: 1, manual_review: 1
    };
    var extraRows = [];
    Object.keys(p).forEach(function (k) {
      if (hiddenKeys[k]) return;
      var v = p[k];
      if (v === null || v === undefined || v === "") return;
      extraRows.push(
        '<tr><td class="attr-k">' + esc(k) + '</td><td class="attr-v">' + esc(String(v)) + "</td></tr>"
      );
    });
    if (extraRows.length) {
      parts.push(
        '<details class="venue-details">' +
          "<summary>All attributes (" + extraRows.length + ")</summary>" +
          '<table class="attr-table">' + extraRows.join("") + "</table>" +
        "</details>"
      );
    }

    parts.push("</div>");
    return parts.join("");
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ---- Layer panel (category toggles) ----
  document.querySelectorAll('#layer-panel input[data-cat]').forEach(function (cb) {
    cb.addEventListener("change", function () {
      var cat = cb.getAttribute("data-cat");
      if (cb.checked) state.categories.add(cat);
      else state.categories.delete(cat);
      applyAllFilters();
    });
  });

  // Basemap switcher — setStyle wipes custom layers, so re-install after styledata.
  document.querySelectorAll('input[name="basemap"]').forEach(function (r) {
    r.addEventListener("change", function () {
      if (!r.checked) return;
      var id = r.value;
      if (!BASEMAPS[id] || id === currentBasemap) return;
      currentBasemap = id;
      map.setStyle(BASEMAPS[id].style);
      map.once("styledata", function () {
        installCustomLayers();
      });
    });
  });

  // Choropleth radio group (None / State regulation / County income)
  document.querySelectorAll('input[name="choropleth"]').forEach(function (r) {
    r.addEventListener("change", function () {
      if (r.checked) applyChoroplethSelection();
    });
  });

  // Tribal lands boundary toggle
  var tribalCb = document.getElementById("f-tribal-lands");
  if (tribalCb) tribalCb.addEventListener("change", applyTribalVisibility);

  var panel = document.getElementById("layer-panel");
  var toggleBtn = document.getElementById("layer-toggle-btn");
  toggleBtn.addEventListener("click", function () {
    panel.classList.toggle("collapsed");
    toggleBtn.setAttribute("aria-expanded", !panel.classList.contains("collapsed"));
  });
  if (window.innerWidth < 700) {
    panel.classList.add("collapsed");
    toggleBtn.setAttribute("aria-expanded", "false");
  }

  document.getElementById("fit-us-btn").addEventListener("click", function () {
    map.flyTo({ center: INITIAL_VIEW.center, zoom: INITIAL_VIEW.zoom, speed: 1.2 });
  });

  // ---- Master filter bar wiring ----
  function debounce(fn, ms) {
    var t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  var searchInput = document.getElementById("f-search");
  searchInput.addEventListener("input", debounce(function () {
    state.search = searchInput.value;
    applyAllFilters();
  }, 180));

  // ---- Floating draggable state panel ----
  var msBtn     = document.getElementById("ms-state-btn");
  var msPanel   = document.getElementById("state-panel");
  var msDrag    = document.getElementById("state-panel-drag");
  var msClose   = document.getElementById("state-panel-close");
  var msList    = document.getElementById("ms-state-list");
  var msSearch  = document.getElementById("ms-state-search");
  var msLabel   = msBtn.querySelector(".ms-button-label");

  function msOpen() {
    msPanel.hidden = false;
    msBtn.setAttribute("aria-pressed", "true");
    setTimeout(function () { msSearch.focus(); }, 0);
  }

  function msHide() {
    msPanel.hidden = true;
    msBtn.setAttribute("aria-pressed", "false");
  }

  msBtn.addEventListener("click", function () {
    if (msPanel.hidden) msOpen(); else msHide();
  });

  msClose.addEventListener("click", msHide);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !msPanel.hidden) msHide();
  });

  // Drag behavior — pointer events, constrained to #map-shell
  (function makeDraggable() {
    var dragging = false;
    var startX = 0, startY = 0;
    var origLeft = 0, origTop = 0;
    var shell = document.getElementById("map-shell");

    msDrag.addEventListener("pointerdown", function (e) {
      // Ignore drag if starting on the close button
      if (e.target.closest(".float-panel-close")) return;
      dragging = true;
      msPanel.classList.add("is-dragging");
      var rect = msPanel.getBoundingClientRect();
      var shellRect = shell.getBoundingClientRect();
      origLeft = rect.left - shellRect.left;
      origTop  = rect.top  - shellRect.top;
      startX = e.clientX;
      startY = e.clientY;
      msDrag.setPointerCapture(e.pointerId);
      // Lock to absolute positioning in pixels
      msPanel.style.left = origLeft + "px";
      msPanel.style.top  = origTop  + "px";
      msPanel.style.right = "auto";
    });

    msDrag.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      var shellRect = shell.getBoundingClientRect();
      var newLeft = Math.max(0, Math.min(shellRect.width  - msPanel.offsetWidth,  origLeft + dx));
      var newTop  = Math.max(0, Math.min(shellRect.height - msPanel.offsetHeight, origTop  + dy));
      msPanel.style.left = newLeft + "px";
      msPanel.style.top  = newTop  + "px";
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      msPanel.classList.remove("is-dragging");
      try { msDrag.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    msDrag.addEventListener("pointerup", endDrag);
    msDrag.addEventListener("pointercancel", endDrag);
  })();

  // ---- Halo legend: collapse toggle + drag (mirrors state-panel pattern)
  (function setupHaloLegend() {
    var panel = document.getElementById("halo-legend");
    var dragHandle = document.getElementById("halo-legend-drag");
    var collapseBtn = document.getElementById("halo-legend-collapse");
    var shell = document.getElementById("map-shell");
    if (!panel || !dragHandle || !collapseBtn || !shell) return;

    collapseBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var collapsed = panel.classList.toggle("is-collapsed");
      collapseBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });

    var dragging = false;
    var startX = 0, startY = 0;
    var origLeft = 0, origTop = 0;

    dragHandle.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".float-panel-collapse")) return;
      dragging = true;
      panel.classList.add("is-dragging");
      var rect = panel.getBoundingClientRect();
      var shellRect = shell.getBoundingClientRect();
      origLeft = rect.left - shellRect.left;
      origTop  = rect.top  - shellRect.top;
      startX = e.clientX;
      startY = e.clientY;
      dragHandle.setPointerCapture(e.pointerId);
      panel.style.left = origLeft + "px";
      panel.style.top  = origTop  + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });

    dragHandle.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      var shellRect = shell.getBoundingClientRect();
      var newLeft = Math.max(0, Math.min(shellRect.width  - panel.offsetWidth,  origLeft + dx));
      var newTop  = Math.max(0, Math.min(shellRect.height - panel.offsetHeight, origTop  + dy));
      panel.style.left = newLeft + "px";
      panel.style.top  = newTop  + "px";
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      panel.classList.remove("is-dragging");
      try { dragHandle.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    dragHandle.addEventListener("pointerup", endDrag);
    dragHandle.addEventListener("pointercancel", endDrag);
  })();

  // ---- Spatial select tool + attribute table panel
  // Self-contained module: drag-box selection on the map → fuzzy-filterable
  // attribute table → CSV export → optional drill-into-this-set.
  // Selection respects all current filters (category/state/etc).
  (function setupAttributeTable() {
    var mapShell      = document.getElementById("map-shell");
    var selectBtn     = document.getElementById("f-select-area");
    var openTableBtn  = document.getElementById("f-open-table");
    var selectBox     = document.getElementById("select-box");
    var selectBanner  = document.getElementById("select-mode-banner");
    var attrPanel     = document.getElementById("attr-panel");
    var attrDrag      = document.getElementById("attr-panel-drag");
    var attrCollapse  = document.getElementById("attr-panel-collapse");
    var attrClose     = document.getElementById("attr-panel-close");
    var attrThead     = document.getElementById("attr-thead");
    var attrTbody     = document.getElementById("attr-tbody");
    var attrCount     = document.getElementById("attr-count");
    var attrShown     = document.getElementById("attr-shown");
    var attrCapBanner = document.getElementById("attr-cap-banner");
    var nameFilterEl  = document.getElementById("attr-name-filter");
    var onlySelectedCb= document.getElementById("attr-only-selected");
    var exportBtn     = document.getElementById("attr-export");
    var clearBtn      = document.getElementById("attr-clear");

    if (!mapShell || !selectBtn || !attrPanel) return;

    // DOM render cap — rendering >ROW_CAP rows in one append starts feeling
    // sluggish on slower laptops. When the visible set exceeds this we
    // render the first N and show a banner prompting the user to narrow.
    var ROW_CAP = 500;

    // Column definitions — order matches master CSV. Each entry is
    // [property-key, header-label, optional-class].
    // venue_id is column 0 (sticky); lat/lng synthesized from geometry.
    var COLS = [
      ["venue_id",                "Venue ID"],
      ["venue_name",              "Venue Name"],
      ["website",                 "Website"],
      ["street",                  "Street"],
      ["city",                    "City"],
      ["state",                   "State"],
      ["zip",                     "ZIP"],
      ["full_address",            "Full Address"],
      ["venue_category",          "Category"],
      ["has_poker",               "Poker", "col-bool"],
      ["has_table_games",         "Tables", "col-bool"],
      ["naics_code",              "NAICS"],
      ["contact_known",           "Contact?", "col-bool"],
      ["num_employees",           "Employees"],
      ["revenue_range",           "Revenue"],
      ["data_source",             "Sources"],
      ["geocode_status",          "Geocode Status"],
      ["operational_status",      "Operational"],
      ["operational_notes",       "Notes"],
      ["geocodio_ready",          "Geo Ready", "col-bool"],
      ["geocode_accuracy_type",   "Accuracy Type"],
      ["geocode_accuracy_score",  "Accuracy Score"],
      ["county",                  "County"],
      ["manual_review",           "Manual Review", "col-bool"],
      ["__lat",                   "Latitude"],
      ["__lng",                   "Longitude"]
    ];

    // ---- select-mode toggle ----
    function setSelectMode(on) {
      state.selectMode = on;
      if (on) {
        mapShell.classList.add("is-selecting");
        selectBanner.hidden = false;
        selectBtn.classList.add("is-active");
        // Disable map interactions that would conflict with our box drag
        map.dragPan.disable();
        if (map.boxZoom)        map.boxZoom.disable();
        if (map.doubleClickZoom) map.doubleClickZoom.disable();
      } else {
        mapShell.classList.remove("is-selecting");
        selectBanner.hidden = true;
        selectBtn.classList.remove("is-active");
        selectBox.hidden = true;
        map.dragPan.enable();
        if (map.boxZoom)         map.boxZoom.enable();
        if (map.doubleClickZoom) map.doubleClickZoom.enable();
      }
    }

    selectBtn.addEventListener("click", function () {
      setSelectMode(!state.selectMode);
    });

    // ESC cancels select mode
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.selectMode) setSelectMode(false);
    });

    // ---- drag-box machinery ----
    var dragging = false;
    var startPt = null;

    map.on("mousedown", function (e) {
      if (!state.selectMode) return;
      e.preventDefault();
      dragging = true;
      startPt = e.point;
      selectBox.style.left   = startPt.x + "px";
      selectBox.style.top    = startPt.y + "px";
      selectBox.style.width  = "0px";
      selectBox.style.height = "0px";
      selectBox.hidden = false;
    });

    map.on("mousemove", function (e) {
      if (!dragging) return;
      var x = e.point.x, y = e.point.y;
      var minX = Math.min(startPt.x, x);
      var minY = Math.min(startPt.y, y);
      selectBox.style.left   = minX + "px";
      selectBox.style.top    = minY + "px";
      selectBox.style.width  = Math.abs(x - startPt.x) + "px";
      selectBox.style.height = Math.abs(y - startPt.y) + "px";
    });

    map.on("mouseup", function (e) {
      if (!dragging) return;
      dragging = false;
      var endPt = e.point;
      // Treat very small box as misclick — exit select mode without committing
      if (Math.abs(endPt.x - startPt.x) < 5 || Math.abs(endPt.y - startPt.y) < 5) {
        selectBox.hidden = true;
        setSelectMode(false);
        return;
      }
      // Pixel bbox → lng/lat bbox via map.unproject
      var sw = map.unproject([Math.min(startPt.x, endPt.x), Math.max(startPt.y, endPt.y)]);
      var ne = map.unproject([Math.max(startPt.x, endPt.x), Math.min(startPt.y, endPt.y)]);
      setSelectMode(false);
      commitSelection({ west: sw.lng, south: sw.lat, east: ne.lng, north: ne.lat });
    });

    // ---- selection commit (from spatial bbox) ----
    function commitSelection(bbox) {
      if (!rawGeojson) return;
      // Apply existing filters first so spatial intersects respect category/state/etc.
      var current = filterGeojson(rawGeojson);
      var hits = current.features.filter(function (f) {
        var c = f.geometry && f.geometry.coordinates;
        if (!c) return false;
        return c[0] >= bbox.west && c[0] <= bbox.east
            && c[1] >= bbox.south && c[1] <= bbox.north;
      });
      openWithHits(hits);
    }

    // ---- launch attribute table without spatial selection ----
    // Populates the table from the current filter set so a marketer can
    // search "MGM" across the entire dataset without box-selecting first.
    function launchOpenTable() {
      if (!rawGeojson) return;
      var hits = filterGeojson(rawGeojson).features;
      openWithHits(hits);
    }

    function openWithHits(hits) {
      attrCount.textContent = hits.length;
      renderTable(hits);
      attrPanel.hidden = false;
      attrPanel.classList.remove("is-collapsed");
      attrCollapse.setAttribute("aria-expanded", "true");
    }

    openTableBtn.addEventListener("click", launchOpenTable);

    // ---- table render ----
    var lastHits = [];

    function flatRow(f) {
      var p = f.properties || {};
      var c = f.geometry && f.geometry.coordinates;
      var out = {};
      Object.keys(p).forEach(function (k) { out[k] = p[k]; });
      if (c) {
        out.__lng = c[0];
        out.__lat = c[1];
      }
      return out;
    }

    function renderTable(hits) {
      lastHits = hits.slice();
      // Header row (only build once per panel-open)
      if (!attrThead.hasChildNodes()) {
        var trh = document.createElement("tr");
        COLS.forEach(function (col) {
          var th = document.createElement("th");
          th.textContent = col[1];
          if (col[2]) th.className = col[2];
          trh.appendChild(th);
        });
        attrThead.appendChild(trh);
      }
      applyNameFilter();
    }

    function applyNameFilter() {
      var q = (state.attrNameFilter || "").trim().toLowerCase();
      var rows = lastHits.filter(function (f) {
        if (!q) return true;
        var n = (f.properties && f.properties.venue_name || "").toLowerCase();
        return n.indexOf(q) !== -1;
      });

      // Update selectedIds to match the visible table contents. This is
      // what makes "show only selected on map" work whether the table came
      // from a bbox, a name filter, or the global Open-table launch.
      state.selectedIds = new Set(rows.map(function (f) {
        return f.properties && f.properties.venue_id;
      }));

      attrShown.textContent = rows.length + " row" + (rows.length === 1 ? "" : "s") + " shown";

      // Cap render at ROW_CAP — surface a banner so the user knows to narrow.
      var capped = rows.length > ROW_CAP;
      var renderRows = capped ? rows.slice(0, ROW_CAP) : rows;
      if (capped) {
        attrCapBanner.textContent = "Showing first " + ROW_CAP + " of " + rows.length +
                                    " — refine filters or search by name to see more";
        attrCapBanner.hidden = false;
      } else {
        attrCapBanner.hidden = true;
      }

      attrTbody.innerHTML = "";
      var frag = document.createDocumentFragment();
      renderRows.forEach(function (f) {
        var r = flatRow(f);
        var tr = document.createElement("tr");
        tr.setAttribute("data-vid", r.venue_id || "");
        COLS.forEach(function (col) {
          var td = document.createElement("td");
          var v = r[col[0]];
          td.textContent = (v === undefined || v === null || v === "") ? "" : String(v);
          if (col[2]) td.className = col[2];
          if (typeof v === "string" && v.length > 60) td.title = v;
          tr.appendChild(td);
        });
        tr.addEventListener("click", function () {
          var coords = f.geometry && f.geometry.coordinates;
          if (!coords) return;
          map.easeTo({ center: coords, zoom: Math.max(map.getZoom(), 13) });
          new maplibregl.Popup({ closeButton: true, maxWidth: "320px" })
            .setLngLat(coords)
            .setHTML(renderPopup(f.properties || {}))
            .addTo(map);
        });
        frag.appendChild(tr);
      });
      attrTbody.appendChild(frag);

      // If user is showing only selected on map, re-apply the map filter
      // since the selection set just changed.
      if (state.onlySelected) applyAllFilters();
    }

    nameFilterEl.addEventListener("input", function () {
      state.attrNameFilter = nameFilterEl.value;
      applyNameFilter();
    });

    onlySelectedCb.addEventListener("change", function () {
      state.onlySelected = onlySelectedCb.checked;
      applyAllFilters();
    });

    // ---- CSV export ----
    function csvEscape(v) {
      if (v === undefined || v === null) return "";
      var s = String(v);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }

    exportBtn.addEventListener("click", function () {
      // Export the CURRENTLY VISIBLE rows (post-name-filter), all columns
      var q = (state.attrNameFilter || "").trim().toLowerCase();
      var rows = lastHits.filter(function (f) {
        if (!q) return true;
        var n = (f.properties && f.properties.venue_name || "").toLowerCase();
        return n.indexOf(q) !== -1;
      });
      var header = COLS.map(function (c) { return csvEscape(c[1]); }).join(",");
      var body = rows.map(function (f) {
        var r = flatRow(f);
        return COLS.map(function (c) { return csvEscape(r[c[0]]); }).join(",");
      }).join("\n");
      var csv = header + "\n" + body + "\n";
      var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      var d = new Date();
      var stamp = d.getFullYear() + "-" +
                  String(d.getMonth() + 1).padStart(2, "0") + "-" +
                  String(d.getDate()).padStart(2, "0");
      a.href = url;
      a.download = "casino-selection-" + stamp + ".csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // ---- panel close / clear / collapse ----
    function clearSelection() {
      state.selectedIds = new Set();
      state.onlySelected = false;
      onlySelectedCb.checked = false;
      lastHits = [];
      attrTbody.innerHTML = "";
      attrCount.textContent = "0";
      attrShown.textContent = "— rows shown";
      attrCapBanner.hidden = true;
      nameFilterEl.value = "";
      state.attrNameFilter = "";
      applyAllFilters();
    }

    clearBtn.addEventListener("click", clearSelection);
    attrClose.addEventListener("click", function () {
      clearSelection();
      attrPanel.hidden = true;
    });

    attrCollapse.addEventListener("click", function (e) {
      e.stopPropagation();
      var collapsed = attrPanel.classList.toggle("is-collapsed");
      attrCollapse.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });

    // ---- panel drag (mirrors state-panel/legend pattern) ----
    (function makeAttrPanelDraggable() {
      var dragging2 = false;
      var sX = 0, sY = 0, oL = 0, oT = 0;
      attrDrag.addEventListener("pointerdown", function (e) {
        if (e.target.closest(".float-panel-collapse") ||
            e.target.closest(".float-panel-close")) return;
        dragging2 = true;
        attrPanel.classList.add("is-dragging");
        var rect = attrPanel.getBoundingClientRect();
        var shellRect = mapShell.getBoundingClientRect();
        oL = rect.left - shellRect.left;
        oT = rect.top  - shellRect.top;
        sX = e.clientX;
        sY = e.clientY;
        attrDrag.setPointerCapture(e.pointerId);
        // Lock to absolute pixel positioning (centered transform breaks otherwise)
        attrPanel.style.left = oL + "px";
        attrPanel.style.top  = oT + "px";
        attrPanel.style.right = "auto";
        attrPanel.style.bottom = "auto";
        attrPanel.style.transform = "none";
      });
      attrDrag.addEventListener("pointermove", function (e) {
        if (!dragging2) return;
        var dx = e.clientX - sX;
        var dy = e.clientY - sY;
        var shellRect = mapShell.getBoundingClientRect();
        var newL = Math.max(0, Math.min(shellRect.width  - attrPanel.offsetWidth,  oL + dx));
        var newT = Math.max(0, Math.min(shellRect.height - attrPanel.offsetHeight, oT + dy));
        attrPanel.style.left = newL + "px";
        attrPanel.style.top  = newT + "px";
      });
      function endDrag2(e) {
        if (!dragging2) return;
        dragging2 = false;
        attrPanel.classList.remove("is-dragging");
        try { attrDrag.releasePointerCapture(e.pointerId); } catch (_) {}
      }
      attrDrag.addEventListener("pointerup", endDrag2);
      attrDrag.addEventListener("pointercancel", endDrag2);
    })();
  })();

  // Search within the list
  msSearch.addEventListener("input", function () {
    filterMsList(msSearch.value.trim().toLowerCase());
  });

  function filterMsList(q) {
    var any = false;
    msList.querySelectorAll(".ms-item").forEach(function (item) {
      var val = item.getAttribute("data-value").toLowerCase();
      var match = !q || val.indexOf(q) !== -1;
      item.classList.toggle("is-hidden", !match);
      if (match) any = true;
    });
    var empty = msList.querySelector(".ms-empty");
    if (empty) empty.style.display = any ? "none" : "block";
  }

  // Bulk actions (scoped to currently visible items)
  msPanel.querySelectorAll(".ms-mini").forEach(function (b) {
    b.addEventListener("click", function () {
      var action = b.getAttribute("data-action");
      msList.querySelectorAll(".ms-item:not(.is-hidden) input[type='checkbox']").forEach(function (cb) {
        cb.checked = action === "all";
      });
      syncStateSelection();
    });
  });

  function syncStateSelection() {
    var selected = [];
    msList.querySelectorAll("input[type='checkbox']:checked").forEach(function (cb) {
      selected.push(cb.value);
    });
    state.states = new Set(selected);

    // Update button label
    if (selected.length === 0) {
      msLabel.textContent = "All states";
      msLabel.classList.add("is-placeholder");
    } else if (selected.length === 1) {
      msLabel.textContent = selected[0];
      msLabel.classList.remove("is-placeholder");
    } else if (selected.length <= 3) {
      msLabel.textContent = selected.join(", ");
      msLabel.classList.remove("is-placeholder");
    } else {
      msLabel.textContent = selected.length + " states";
      msLabel.classList.remove("is-placeholder");
    }

    applyAllFilters();
  }

  var hideClosedCb = document.getElementById("f-hide-closed");
  hideClosedCb.addEventListener("change", function () {
    state.hideClosed = hideClosedCb.checked;
    applyAllFilters();
  });

  var hasWebCb = document.getElementById("f-has-website");
  hasWebCb.addEventListener("change", function () {
    state.hasWebsite = hasWebCb.checked;
    applyAllFilters();
  });

  var hasPokerCb = document.getElementById("f-has-poker");
  if (hasPokerCb) hasPokerCb.addEventListener("change", function () {
    state.hasPoker = hasPokerCb.checked;
    applyAllFilters();
  });

  var hasTablesCb = document.getElementById("f-has-tables");
  if (hasTablesCb) hasTablesCb.addEventListener("change", function () {
    state.hasTables = hasTablesCb.checked;
    applyAllFilters();
  });

  var hideUnknownCb = document.getElementById("f-hide-unknown");
  if (hideUnknownCb) hideUnknownCb.addEventListener("change", function () {
    state.hideUnknown = hideUnknownCb.checked;
    applyAllFilters();
  });

  var onlyVerifiedCb = document.getElementById("f-only-verified");
  if (onlyVerifiedCb) onlyVerifiedCb.addEventListener("change", function () {
    state.onlyVerified = onlyVerifiedCb.checked;
    applyAllFilters();
  });

  var tablesRange = document.getElementById("f-tables");
  var tablesVal = document.getElementById("f-tables-val");
  tablesRange.addEventListener("input", function () {
    state.minTables = parseInt(tablesRange.value, 10) || 0;
    tablesVal.textContent = state.minTables === 0 ? "any" : "≥" + state.minTables;
    applyAllFilters();
  });

  var geoRange = document.getElementById("f-geo");
  var geoVal = document.getElementById("f-geo-val");
  geoRange.addEventListener("input", function () {
    state.minGeoScore = parseFloat(geoRange.value) || 0;
    geoVal.textContent = state.minGeoScore.toFixed(2);
    applyAllFilters();
  });

  document.getElementById("f-reset").addEventListener("click", function () {
    searchInput.value = "";
    msList.querySelectorAll("input[type='checkbox']").forEach(function (cb) { cb.checked = false; });
    msLabel.textContent = "All states";
    msLabel.classList.add("is-placeholder");
    hideClosedCb.checked = false;
    hasWebCb.checked = false;
    if (hasPokerCb)    hasPokerCb.checked = false;
    if (hasTablesCb)   hasTablesCb.checked = false;
    if (hideUnknownCb) hideUnknownCb.checked = false;
    if (onlyVerifiedCb) onlyVerifiedCb.checked = true;
    tablesRange.value = 0;  tablesVal.textContent = "any";
    geoRange.value    = 0;  geoVal.textContent    = "0.00";

    state.search = "";
    state.states = new Set();
    state.hideClosed = false;
    state.hasWebsite = false;
    state.hasPoker = false;
    state.hasTables = false;
    state.hideUnknown = false;
    state.onlyVerified = true;     // Reset re-applies default-ON
    state.minTables = 0;
    state.minGeoScore = 0;
    // Clear any active spatial selection
    state.selectedIds = new Set();
    state.onlySelected = false;
    var attrPanelEl = document.getElementById("attr-panel");
    if (attrPanelEl) attrPanelEl.hidden = true;
    var onlySelCb = document.getElementById("attr-only-selected");
    if (onlySelCb) onlySelCb.checked = false;

    // Re-enable all category checkboxes
    document.querySelectorAll('#layer-panel input[data-cat]').forEach(function (cb) {
      cb.checked = true;
      state.categories.add(cb.getAttribute("data-cat"));
    });

    // Reset choropleth to "none" and tribal off
    var noneRadio = document.querySelector('input[name="choropleth"][value="none"]');
    if (noneRadio) noneRadio.checked = true;
    if (tribalCb) tribalCb.checked = false;
    applyChoroplethSelection();
    applyTribalVisibility();

    applyAllFilters();
  });

  // ---- Populate state multiselect from data ----
  function populateStateDropdown(g) {
    var counts = {};
    (g.features || []).forEach(function (f) {
      var s = f.properties && f.properties.state;
      if (!s) return;
      counts[s] = (counts[s] || 0) + 1;
    });
    var sorted = Object.keys(counts).sort();

    msList.innerHTML = "";
    sorted.forEach(function (s) {
      var item = document.createElement("label");
      item.className = "ms-item";
      item.setAttribute("data-value", s);
      item.innerHTML =
        '<input type="checkbox" value="' + esc(s) + '">' +
        '<span>' + esc(s) + '</span>' +
        '<span class="ms-item-count">' + counts[s] + '</span>';
      item.querySelector("input").addEventListener("change", syncStateSelection);
      msList.appendChild(item);
    });

    var empty = document.createElement("div");
    empty.className = "ms-empty";
    empty.textContent = "No matches";
    empty.style.display = "none";
    msList.appendChild(empty);
  }

  // ---- Counts ----
  function updateCategoryCounts(g) {
    var counts = {};
    (g.features || []).forEach(function (f) {
      var c = f.properties && f.properties.venue_category;
      if (!c) return;
      counts[c] = (counts[c] || 0) + 1;
    });
    document.querySelectorAll("[data-count-for]").forEach(function (el) {
      var cat = el.getAttribute("data-count-for");
      el.textContent = "(" + (counts[cat] || 0) + ")";
    });
  }

  function updateHeaderCounts(rawG, filteredG) {
    var total = (rawG.features || []).length;
    var shown = (filteredG.features || []).length;
    var totalEl = document.getElementById("venue-count");
    var shownEl = document.getElementById("venue-filtered");
    if (totalEl) totalEl.textContent = total + " venues";
    if (shownEl) {
      if (shown === total) {
        shownEl.style.display = "none";
      } else {
        shownEl.style.display = "";
        shownEl.textContent = shown + " shown";
      }
    }
  }

  // ---- Overlay helpers ----
  function hideOverlay(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = "none";
  }
  function showOverlay(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = "flex";
  }
})();
