// api/counter.js — Upstash Redis hit counter
const { Redis } = require("@upstash/redis");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return res.status(200).json({ ok: false, error: "Redis not configured", count: 420133, fallback: true });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    if (req.method === "POST") {
      const count = await redis.incr("hits:global");
      return res.status(200).json({ ok: true, count });
    }
    const count = (await redis.get("hits:global")) || 0;
    return res.status(200).json({ ok: true, count });
  } catch (err) {
    console.error("Redis error:", err.message);
    return res.status(200).json({ ok: false, error: err.message, count: 420133, fallback: true });
  }
};
