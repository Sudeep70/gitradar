# GitRadar 🛰️

> Developer activity intelligence API — analyze any GitHub profile in seconds.

[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

GitRadar is a REST API that turns any GitHub username into a rich developer intelligence report — language breakdown, contribution streaks, repo impact scores, activity heatmaps, and a weighted developer score. Fully free, no paid APIs, runs anywhere.

## Features

- **Developer Score** — weighted algorithm across consistency, impact, diversity, and profile completeness
- **Language Analysis** — real byte-level breakdown across top repos (not just repo count)
- **Activity Heatmap** — commit history, peak coding hours, day-of-week patterns
- **Repo Intelligence** — ranked by impact score (stars × 2 + forks × 3), filters forks
- **Profile Comparison** — side-by-side analysis of two developers
- **Smart Caching** — 5-minute in-memory cache, zero repeated API calls
- **Rate Limiting** — 100 requests per 15 minutes per IP

## Quick Start

```bash
git clone https://github.com/yourusername/gitradar.git
cd gitradar
npm install
cp .env.example .env
# Add your GitHub token to .env (free at github.com/settings/tokens)
npm run dev
```

## API Endpoints

### Full Developer Report
```
GET /analyze/:username
```
```json
{
  "username": "torvalds",
  "name": "Linus Torvalds",
  "score": {
    "total": 78,
    "grade": "A",
    "breakdown": {
      "consistency": 20,
      "impact": 25,
      "diversity": 18,
      "profile": 15
    }
  },
  "languages": {
    "primary": "C",
    "breakdown": [
      { "language": "C", "percentage": 72.4 },
      { "language": "Shell", "percentage": 14.1 }
    ]
  },
  "repos": {
    "total": 8,
    "total_stars": 19823,
    "total_forks": 5921,
    "top_repos": [...]
  },
  "activity": {
    "current_streak": 3,
    "peak_hour": "14:00 UTC",
    "peak_day": "Wednesday",
    "heatmap": { "2024-01-15": 4, "2024-01-16": 7 }
  }
}
```

### Score Only
```
GET /analyze/:username/score
```

### Language Breakdown
```
GET /analyze/:username/languages
```

### Repo Intelligence
```
GET /analyze/:username/repos
```

### Activity & Heatmap
```
GET /analyze/:username/activity
```

### Compare Two Developers
```
GET /analyze/compare/:user1/:user2
```

### Health Check
```
GET /health
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_TOKEN` | Recommended | — | GitHub PAT — get 5,000 req/hr vs 60/hr without |
| `PORT` | No | 3000 | Server port |
| `CACHE_TTL` | No | 300 | Cache duration in seconds |

## Developer Score Algorithm

| Category | Max | Signals |
|---|---|---|
| Consistency | 25 | Commit streak, recent activity |
| Impact | 25 | Total stars, total forks |
| Diversity | 25 | Language count, repo count |
| Profile | 25 | Bio, location, blog, followers |

## Running Tests

```bash
npm test
```

## Deploy (Free)

**Railway:**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

**Render:** Connect your GitHub repo at render.com → New Web Service → set `npm start` as start command.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express
- **Data source**: GitHub REST API v3 (free, no key needed for public data)
- **Caching**: node-cache (in-memory)
- **Rate limiting**: express-rate-limit
- **Testing**: Jest + Supertest

## License

MIT
