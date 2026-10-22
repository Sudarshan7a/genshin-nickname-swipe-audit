// In-memory sliding-window limiter. Keyed by route path plus keyBy(req).
// Default key is the client IP. Behind a blind TCP tunnel every socket
// arrives from loopback with no forwarding header, so callers SHOULD pass a
// per-client keyBy (e.g. the voter id) — otherwise all friends share one
// bucket and one heavy voter can 429 everyone else.
export function rateLimit({ windowMs, max, keyBy }) {
  const hits = new Map();
  const keyFn = typeof keyBy === 'function' ? keyBy : (req) => req.ip;
  return function rateLimitMiddleware(req, res, next) {
    const who = keyFn(req) ?? req.ip ?? 'unknown';
    const key = `${who}::${req.path ?? req.url ?? ''}`;
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
