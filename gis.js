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
    "Casino":            "#ef4444",
    "Poker / Card Club": "#3b82f6",
    "Tribal":            "#8b5cf6",
    "Racetrack":         "#10b981"
  };

  // ---- Filter state (category panel + master filter bar) ----
  var state = {
    categories: new Set(CATEGORIES),
    search:      "",
    states:      new Set(),     // empty = all
    hideClosed:  false,
    hasWebsite:  false,
    minTables:   0,
    minGeoScore: 0
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

  // Opacity hook — dims closed venues when operational_status field is populated.
  var opacityExpr = [
    "case",
    ["==", ["get", "operational_status"], "closed"], 0.25,
    0.85
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
      clusterMaxZoom: 7,
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
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": opacityExpr,
        "circle-stroke-opacity": opacityExpr
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

    var meta = [];
    if (p.num_employees) meta.push("Employees: " + p.num_employees);
    if (p.revenue_range) meta.push("Revenue: " + p.revenue_range);
    if (p.num_tables)    meta.push("Tables: " + p.num_tables);
    if (meta.length) {
      parts.push('<div class="venue-row" style="color:var(--accent-2);">' + esc(meta.join(" · ")) + "</div>");
    }

    if (p.operational_notes) {
      parts.push('<div class="venue-notes">' + esc(p.operational_notes) + "</div>");
    }

    // Full attribute dump
    var hiddenKeys = {
      venue_name: 1, venue_category: 1, city: 1, state: 1, street: 1,
      website: 1, num_employees: 1, revenue_range: 1, num_tables: 1, operational_notes: 1
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
    tablesRange.value = 0;  tablesVal.textContent = "any";
    geoRange.value    = 0;  geoVal.textContent    = "0.00";

    state.search = "";
    state.states = new Set();
    state.hideClosed = false;
    state.hasWebsite = false;
    state.minTables = 0;
    state.minGeoScore = 0;

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
