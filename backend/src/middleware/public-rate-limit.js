'use strict';

// Development/single-instance defense in depth. Production also requires a
// shared rate limiter at the API gateway, CDN or Redis layer.
function publicRateLimit({ max = 12, windowMs = 60_000 } = {}) {
  const requests = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;

    if (requests.size > 20_000) {
      for (const [ip, record] of requests) {
        if (record.until <= now) {
          requests.delete(ip);
        }
      }
    }

    const previous = requests.get(key);
    const record = previous && previous.until > now
      ? previous
      : { count: 0, until: now + windowMs };

    record.count += 1;
    requests.set(key, record);

    if (record.count > max) {
      res.set('Retry-After', String(Math.ceil((record.until - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    return next();
  };
}

module.exports = { publicRateLimit };
