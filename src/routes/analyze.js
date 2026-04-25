const express = require('express');
const router = express.Router();
const { getUser, getRepos, getEvents } = require('../services/github');
const { analyzeLanguages, analyzeRepos, analyzeActivity } = require('../services/analyzer');
const { computeScore } = require('../services/scorer');
const { cacheMiddleware } = require('../middleware/cache');

const buildFullReport = async (username) => {
  const [user, repos, events] = await Promise.all([
    getUser(username),
    getRepos(username),
    getEvents(username),
  ]);

  const [languages, repoStats, activity] = await Promise.all([
    analyzeLanguages(username, repos),
    Promise.resolve(analyzeRepos(repos)),
    Promise.resolve(analyzeActivity(events)),
  ]);

  const score = computeScore(user, repoStats, activity, languages);

  return {
    username: user.login,
    name: user.name,
    avatar: user.avatar_url,
    bio: user.bio,
    location: user.location,
    company: user.company,
    blog: user.blog,
    followers: user.followers,
    following: user.following,
    public_repos: user.public_repos,
    created_at: user.created_at,
    score,
    languages,
    repos: repoStats,
    activity,
    generated_at: new Date().toISOString(),
  };
};

// GET /analyze/:username — full report
router.get('/:username', cacheMiddleware((req) => `full:${req.params.username}`), async (req, res) => {
  try {
    const report = await buildFullReport(req.params.username);
    res.sendCached(report);
  } catch (err) {
    handleGitHubError(err, res);
  }
});

// GET /analyze/:username/score — score only
router.get('/:username/score', cacheMiddleware((req) => `score:${req.params.username}`), async (req, res) => {
  try {
    const report = await buildFullReport(req.params.username);
    res.sendCached({
      username: report.username,
      score: report.score,
      generated_at: report.generated_at,
    });
  } catch (err) {
    handleGitHubError(err, res);
  }
});

// GET /analyze/:username/languages
router.get('/:username/languages', cacheMiddleware((req) => `lang:${req.params.username}`), async (req, res) => {
  try {
    const [user, repos] = await Promise.all([getUser(req.params.username), getRepos(req.params.username)]);
    const languages = await analyzeLanguages(req.params.username, repos);
    res.sendCached({ username: user.login, languages, generated_at: new Date().toISOString() });
  } catch (err) {
    handleGitHubError(err, res);
  }
});

// GET /analyze/:username/repos
router.get('/:username/repos', cacheMiddleware((req) => `repos:${req.params.username}`), async (req, res) => {
  try {
    const [user, repos] = await Promise.all([getUser(req.params.username), getRepos(req.params.username)]);
    const repoStats = analyzeRepos(repos);
    res.sendCached({ username: user.login, repos: repoStats, generated_at: new Date().toISOString() });
  } catch (err) {
    handleGitHubError(err, res);
  }
});

// GET /analyze/:username/activity
router.get('/:username/activity', cacheMiddleware((req) => `activity:${req.params.username}`), async (req, res) => {
  try {
    const [user, events] = await Promise.all([getUser(req.params.username), getEvents(req.params.username)]);
    const activity = analyzeActivity(events);
    res.sendCached({ username: user.login, activity, generated_at: new Date().toISOString() });
  } catch (err) {
    handleGitHubError(err, res);
  }
});

// GET /analyze/compare/:user1/:user2
router.get('/compare/:user1/:user2', cacheMiddleware((req) => `compare:${req.params.user1}:${req.params.user2}`), async (req, res) => {
  try {
    const [report1, report2] = await Promise.all([
      buildFullReport(req.params.user1),
      buildFullReport(req.params.user2),
    ]);

    const winner = report1.score.total >= report2.score.total ? report1.username : report2.username;

    res.sendCached({
      comparison: {
        [report1.username]: {
          score: report1.score,
          languages: report1.languages.primary,
          total_stars: report1.repos.total_stars,
          current_streak: report1.activity.current_streak,
        },
        [report2.username]: {
          score: report2.score,
          languages: report2.languages.primary,
          total_stars: report2.repos.total_stars,
          current_streak: report2.activity.current_streak,
        },
      },
      winner,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    handleGitHubError(err, res);
  }
});

const handleGitHubError = (err, res) => {
  if (err.response?.status === 404) {
    return res.status(404).json({ error: 'GitHub user not found' });
  }
  if (err.response?.status === 403) {
    return res.status(429).json({ error: 'GitHub API rate limit exceeded. Add a GITHUB_TOKEN to your .env file.' });
  }
  res.status(500).json({ error: 'Failed to fetch data', message: err.message });
};

module.exports = router;
