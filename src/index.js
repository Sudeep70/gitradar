require('dotenv').config();
const express = require('express');
const cors = require('cors');
const analyzeRoutes = require('./routes/analyze');
const { rateLimiter } = require('./middleware/ratelimit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(rateLimiter);

app.use('/analyze', analyzeRoutes);

app.get('/health', (req, res) => {
  const cache = require('./middleware/cache');
  res.json({
    status: 'ok',
    uptime: process.uptime().toFixed(2) + 's',
    cache: cache.getStats(),
    github_token: process.env.GITHUB_TOKEN ? 'configured' : 'missing — limited to 60 req/hr',
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`GitRadar running on http://localhost:${PORT}`);
    if (!process.env.GITHUB_TOKEN) {
      console.warn('Warning: GITHUB_TOKEN not set. Rate limited to 60 requests/hour.');
    }
  });
}

module.exports = app;
