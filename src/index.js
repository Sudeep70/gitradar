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

app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    project: 'GitRadar',
    version: '1.0.0',
    description: 'GitHub profile & repository analytics API',
    endpoints: [
      {
        method: 'GET',
        path: '/',
        description: 'API discovery — lists all available endpoints',
      },
      {
        method: 'GET',
        path: '/analyze/:username',
        description: 'Analyze a GitHub user profile (repos, languages, activity, streaks)',
      },
      {
        method: 'GET',
        path: '/analyze/:username/summary',
        description: 'Plain-English paragraph summarising the developer\'s profile and score',
      },
      {
        method: 'GET',
        path: '/dashboard/:username',
        description: 'Visual HTML dashboard showing the GitRadar report',
      },
      {
        method: 'GET',
        path: '/health',
        description: 'Server health check, uptime, and cache stats',
      },
    ],
    live_example: `${baseUrl}/analyze/Sudeep70`,
  });
});

app.get('/dashboard/:username', async (req, res) => {
  try {
    const { buildFullReport } = require('./routes/analyze');
    const report = await buildFullReport(req.params.username);
    
    // Generate language bars HTML
    const totalLangBytes = report.languages.breakdown.reduce((sum, lang) => sum + lang.bytes, 0);
    const langBars = report.languages.breakdown.map((lang, index) => {
      const colors = ['#f1e05a', '#3178c6', '#e34c26', '#563d7c', '#b07219', '#2b7489', '#41b883', '#007396'];
      const color = colors[index % colors.length];
      const width = totalLangBytes > 0 ? (lang.bytes / totalLangBytes * 100).toFixed(2) : 0;
      return `<div class="lang-bar" style="width: ${width}%; background-color: ${color};" title="${lang.language}: ${width}%"></div>`;
    }).join('');

    const langLegends = report.languages.breakdown.map((lang, index) => {
      const colors = ['#f1e05a', '#3178c6', '#e34c26', '#563d7c', '#b07219', '#2b7489', '#41b883', '#007396'];
      const color = colors[index % colors.length];
      const width = totalLangBytes > 0 ? (lang.bytes / totalLangBytes * 100).toFixed(2) : 0;
      return `
        <div class="lang-legend-item">
          <span class="lang-dot" style="background-color: ${color};"></span>
          <span class="lang-name">${lang.language}</span>
          <span class="lang-pct">${width}%</span>
        </div>
      `;
    }).join('');

    // Determine circle color by grade
    const gradeColorMap = { 'S': '#f1c40f', 'A': '#2ecc71', 'B': '#3498db', 'C': '#e67e22', 'D': '#e74c3c' };
    const gradeColor = gradeColorMap[report.score.grade] || '#95a5a6';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitRadar Dashboard - ${report.username}</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --text: #c9d1d9;
      --border: #30363d;
      --primary: #58a6ff;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
    }
    .container {
      max-width: 800px;
      width: 100%;
    }
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
    }
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin-right: 20px;
      border: 2px solid var(--border);
    }
    .user-info h1 {
      margin: 0 0 5px 0;
      font-size: 24px;
      color: #fff;
    }
    .user-info a {
      color: var(--primary);
      text-decoration: none;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
    }
    .card-full {
      grid-column: 1 / -1;
    }
    h2 {
      margin-top: 0;
      font-size: 16px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
      margin-bottom: 15px;
      color: #fff;
    }
    
    /* Stats row */
    .stats-row {
      display: flex;
      justify-content: space-between;
      text-align: center;
    }
    .stat-item {
      display: flex;
      flex-direction: column;
    }
    .stat-val {
      font-size: 24px;
      font-weight: bold;
      color: #fff;
    }
    .stat-lbl {
      font-size: 12px;
      color: #8b949e;
      text-transform: uppercase;
      margin-top: 5px;
    }

    /* Score Circle */
    .score-container {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
    }
    .score-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      border: 8px solid ${gradeColor};
      box-shadow: 0 0 15px ${gradeColor}40;
    }
    .grade {
      font-size: 40px;
      font-weight: bold;
      color: ${gradeColor};
      line-height: 1;
    }
    .score-val {
      font-size: 14px;
      color: #8b949e;
      margin-top: 5px;
    }

    /* Language Bar */
    .lang-chart-container {
      margin-top: 10px;
    }
    .lang-bar-wrapper {
      display: flex;
      height: 12px;
      border-radius: 6px;
      overflow: hidden;
      background: var(--border);
      margin-bottom: 15px;
    }
    .lang-bar {
      height: 100%;
    }
    .lang-legends {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
      font-size: 12px;
    }
    .lang-legend-item {
      display: flex;
      align-items: center;
    }
    .lang-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .lang-name {
      color: #fff;
      margin-right: 5px;
    }
    .lang-pct {
      color: #8b949e;
    }

    /* Activity */
    .activity-info p {
      margin: 8px 0;
      color: #c9d1d9;
    }
    .highlight {
      color: #fff;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${report.avatar}" alt="${report.username}" class="avatar">
      <div class="user-info">
        <h1>${report.name || report.username}</h1>
        <a href="https://github.com/${report.username}" target="_blank">@${report.username}</a>
      </div>
    </div>

    <div class="card card-full">
      <h2>Overview Stats</h2>
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-val">${report.repos.total}</span>
          <span class="stat-lbl">Repos</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">${report.repos.total_stars}</span>
          <span class="stat-lbl">Stars</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">${report.repos.total_forks}</span>
          <span class="stat-lbl">Forks</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">${report.activity.current_streak}</span>
          <span class="stat-lbl">Day Streak</span>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h2>Developer Score</h2>
        <div class="score-container">
          <div class="score-circle">
            <span class="grade">${report.score.grade}</span>
            <span class="score-val">${report.score.total} / ${report.score.max}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Peak Activity</h2>
        <div class="activity-info">
          <p>Peak Day: <span class="highlight">${report.activity.peak_day}</span></p>
          <p>Peak Hour: <span class="highlight">${report.activity.peak_hour}</span></p>
          <p>Recent Commits: <span class="highlight">${report.activity.recent_commits}</span></p>
          <p>Longest Streak: <span class="highlight">${report.activity.longest_streak} days</span></p>
        </div>
      </div>
    </div>

    <div class="card card-full">
      <h2>Top Languages</h2>
      <div class="lang-chart-container">
        <div class="lang-bar-wrapper">
          ${langBars}
        </div>
        <div class="lang-legends">
          ${langLegends}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    res.send(html);
  } catch (err) {
    console.error(err);
    if (err.response && err.response.status === 404) {
      return res.status(404).send('<h1>User not found</h1>');
    }
    res.status(500).send('<h1>Error generating dashboard</h1>');
  }
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
