// api/counter.js
// Real persistent hit counter using Vercel KV (free Redis store)
// GET  /api/counter        → returns current count
// POST /api/counter        → increments count, returns new value
// GET  /api/counter?page=gis → per-page counter (optional)

import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Optional per-page tracking — ?page=gis, ?page=blog, etc.
  // If no page param, tracks global site visits
  const page = req.query.page || "global";
  const key = "hits:" + page;

  try {
    if (req.method === "POST") {
      // Increment and return new value
      // kv.incr atomically increments — safe for concurrent visitors
      const newCount = await kv.incr(key);
      return res.status(200).json({
        ok: true,
        page: page,
        count: newCount
      });
    }

    if (req.method === "GET") {
      // Just read current count without incrementing
      const count = await kv.get(key);
      return res.status(200).json({
        ok: true,
        page: page,
        count: count || 0
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });

  } catch (err) {
    // If KV isn't connected yet (e.g. during initial setup), return a fallback
    console.error("KV error:", err.message);
    return res.status(200).json({
      ok: false,
      error: "KV unavailable",
      count: 420133,        // fallback display value
      fallback: true
    });
  }
}
