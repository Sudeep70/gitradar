const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL) || 300,
  checkperiod: 60,
});

const cacheMiddleware = (keyFn) => (req, res, next) => {
  const key = keyFn(req);
  const cached = cache.get(key);
  if (cached) {
    return res.json({ ...cached, _cache: 'HIT' });
  }
  res.sendCached = (data) => {
    cache.set(key, data);
    res.json({ ...data, _cache: 'MISS' });
  };
  next();
};

const getStats = () => ({
  keys: cache.keys().length,
  hits: cache.getStats().hits,
  misses: cache.getStats().misses,
});

module.exports = { cacheMiddleware, getStats };
