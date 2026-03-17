// api/geodata.js — serves GeoJSON files from /geodata in GitHub repo
module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const GITHUB_USER   = process.env.GITHUB_USER   || "daemoz";
  const GITHUB_REPO   = process.env.GITHUB_REPO   || "portfolio";
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
  const RAW_BASE = "https://raw.githubusercontent.com/" + GITHUB_USER + "/" + GITHUB_REPO + "/" + GITHUB_BRANCH + "/geodata";
  const API_BASE = "https://api.github.com/repos/" + GITHUB_USER + "/" + GITHUB_REPO + "/contents/geodata";

  const file = req.query.file;
  const bbox = req.query.bbox;

  try {
    if (file) {
      const safeName = file.replace(/[^a-zA-Z0-9_\-]/g, "");
      const r = await fetch(RAW_BASE + "/" + safeName + ".geojson");
      if (!r.ok) return res.status(404).json({ error: "Dataset not found", file: safeName });
      var geojson = await r.json();

      if (bbox && geojson.features) {
        var parts = bbox.split(",").map(Number);
        geojson.features = geojson.features.filter(function(f) {
          if (!f.geometry) return false;
          var coords = flatCoords(f.geometry);
          return coords.some(function(c) {
            return c[0] >= parts[0] && c[0] <= parts[2] && c[1] >= parts[1] && c[1] <= parts[3];
          });
        });
      }

      res.setHeader("Content-Type", "application/geo+json");
      return res.status(200).json(geojson);
    }

    const ghRes = await fetch(API_BASE, {
      headers: { "Accept": "application/vnd.github.v3+json", "User-Agent": "daemoz-portfolio" }
    });
    if (!ghRes.ok) return res.status(200).json({ ok: true, datasets: [] });
    const files = await ghRes.json();
    if (!Array.isArray(files)) return res.status(200).json({ ok: true, datasets: [] });

    const datasets = files
      .filter(function(f) { return f.name.endsWith(".geojson"); })
      .map(function(f) {
        return { name: f.name.replace(".geojson",""), size_bytes: f.size, url: "/api/geodata?file=" + f.name.replace(".geojson","") };
      });
    return res.status(200).json({ ok: true, count: datasets.length, datasets: datasets });

  } catch(err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

function flatCoords(geometry) {
  var t = geometry.type, c = geometry.coordinates;
  if (t === "Point") return [c];
  if (t === "MultiPoint" || t === "LineString") return c;
  if (t === "MultiLineString" || t === "Polygon") return c.reduce(function(a,b){return a.concat(b);}, []);
  if (t === "MultiPolygon") return c.reduce(function(a,b){return a.concat(b.reduce(function(c2,d){return c2.concat(d);},[]));},[]);
  return [];
}
