const { Redis } = require("@upstash/redis");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Support all variable name variants Vercel/Upstash may inject
  var redisUrl   = process.env.UPSTASH_REDIS_REST_URL
                || process.env.KV_REST_API_URL;
  var redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
                || process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error("Missing Redis env vars. Available:", Object.keys(process.env).filter(k => k.includes("REDIS") || k.includes("KV")).join(", "));
    return res.status(200).json({ ok: false, error: "Redis not configured", count: 0, fallback: true });
  }

  var redis = new Redis({ url: redisUrl, token: redisToken });

  try {
    if (req.method === "POST") {
      var count = await redis.incr("hits:global");
      return res.status(200).json({ ok: true, count: count });
    }
    var val = await redis.get("hits:global");
    return res.status(200).json({ ok: true, count: val || 0 });
  } catch (err) {
    console.error("Redis error:", err.message);
    return res.status(200).json({ ok: false, error: err.message, count: 0, fallback: true });
  }
};
