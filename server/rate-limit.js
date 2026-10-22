// In-memory sliding-window limiter. Keyed by IP + route path.
export function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return function rateLimitMiddleware(req, res, next) {
    const key = `${req.ip ?? 'unknown'}::${req.path ?? req.url ?? ''}`;
    const now = Date.now();
    const cutoff = now - windowMs;
    let times = hits.get(key);
    if (!times) {
      times = [];
      hits.set(key, times);
    }
    while (times.length > 0 && times[0] <= cutoff) times.shift();
    if (times.length >= max) return res.status(429).json({ error: 'rate limited' });
    times.push(now);
    if (hits.size > 10000) {
      for (const [k, v] of hits) {
        if (v.length === 0 || v[v.length - 1] <= cutoff) hits.delete(k);
      }
    }
    return next();
  };
}
