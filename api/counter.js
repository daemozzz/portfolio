// api/counter.js — uses Upstash Redis (replaces deprecated @vercel/kv)
// GET  /api/counter        → returns current count
// POST /api/counter        → increments, returns new value

import { Redis } from "@upstash/redis";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();

  // Upstash auto-reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  // from env vars — injected automatically by the Vercel Marketplace integration
  let redis;
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: "Redis not configured", count: 420133, fallback: true });
  }

  const key = "hits:global";

  try {
    if (req.method === "POST") {
      const count = await redis.incr(key);
      return res.status(200).json({ ok: true, count });
    }
    if (req.method === "GET") {
      const count = await redis.get(key) || 0;
      return res.status(200).json({ ok: true, count });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Redis error:", err.message);
    return res.status(200).json({ ok: false, error: "Redis unavailable", count: 420133, fallback: true });
  }
}
