// api/geodata.js
// Serves GeoJSON files from the /geodata directory
// Adds proper CORS headers so Leaflet, ArcGIS, Mapbox, Felt can all consume them
//
// GET /api/geodata              → list of available datasets
// GET /api/geodata?file=name    → returns that GeoJSON file's contents
// GET /api/geodata?file=name&bbox=-117,32,-116,33  → optional bbox filter

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const GITHUB_USER   = process.env.GITHUB_USER   || "daemoz";
  const GITHUB_REPO   = process.env.GITHUB_REPO   || "portfolio";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
  const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/geodata`;
  const API_BASE = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/geodata`;

  const { file, bbox } = req.query;

  try {
    if (file) {
      // ── SERVE A SPECIFIC GEOJSON FILE ────────────────────────
      // Sanitize filename — no path traversal
      const safeName = file.replace(/[^a-zA-Z0-9_\-]/g, "");
      const url = `${RAW_BASE}/${safeName}.geojson`;

      const ghRes = await fetch(url);
      if (!ghRes.ok) {
        return res.status(404).json({ error: "Dataset not found", file: safeName });
      }

      let geojson = await ghRes.json();

      // Optional bounding box filter: ?bbox=minLon,minLat,maxLon,maxLat
      if (bbox && geojson.features) {
        const [minLon, minLat, maxLon, maxLat] = bbox.split(",").map(Number);
        geojson = {
          ...geojson,
          features: geojson.features.filter(f => {
            if (!f.geometry) return false;
            const coords = flatCoords(f.geometry);
            return coords.some(([lon, lat]) =>
              lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat
            );
          })
        };
        geojson._filtered = true;
        geojson._featureCount = geojson.features.length;
      }

      // Set content type explicitly — some map clients need this
      res.setHeader("Content-Type", "application/geo+json");
      return res.status(200).json(geojson);

    } else {
      // ── LIST AVAILABLE DATASETS ──────────────────────────────
      const ghRes = await fetch(API_BASE, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "daemoz-portfolio"
        }
      });

      if (!ghRes.ok) {
        return res.status(200).json({ ok: true, datasets: [], error: "Could not list geodata" });
      }

      const files = await ghRes.json();
      const datasets = files
        .filter(f => f.name.endsWith(".geojson"))
        .map(f => ({
          name: f.name.replace(".geojson", ""),
          filename: f.name,
          size_bytes: f.size,
          url: `/api/geodata?file=${f.name.replace(".geojson", "")}`,
          raw_url: f.download_url
        }));

      return res.status(200).json({ ok: true, count: datasets.length, datasets });
    }

  } catch (err) {
    console.error("geodata error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// Helper — extract all coordinate pairs from any geometry type
function flatCoords(geometry) {
  const { type, coordinates } = geometry;
  if (type === "Point")           return [coordinates];
  if (type === "MultiPoint")      return coordinates;
  if (type === "LineString")      return coordinates;
  if (type === "MultiLineString") return coordinates.flat();
  if (type === "Polygon")         return coordinates.flat();
  if (type === "MultiPolygon")    return coordinates.flat(2);
  return [];
}
