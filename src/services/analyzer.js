const { getLanguagesForRepo } = require('./github');

const analyzeLanguages = async (username, repos) => {
  const topRepos = repos
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 10);

  const langBytes = {};
  await Promise.all(
    topRepos.map(async (repo) => {
      const langs = await getLanguagesForRepo(username, repo.name);
      for (const [lang, bytes] of Object.entries(langs)) {
        langBytes[lang] = (langBytes[lang] || 0) + bytes;
      }
    })
  );

  const total = Object.values(langBytes).reduce((a, b) => a + b, 0);
  const breakdown = Object.entries(langBytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([lang, bytes]) => ({
      language: lang,
      bytes,
      percentage: total > 0 ? parseFloat(((bytes / total) * 100).toFixed(1)) : 0,
    }));

  return { breakdown, primary: breakdown[0]?.language || 'Unknown' };
};

const analyzeRepos = (repos) => {
  const owned = repos.filter((r) => !r.fork);
  const sorted = owned
    .map((r) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      topics: r.topics || [],
      updated_at: r.updated_at,
      impact_score: r.stargazers_count * 2 + r.forks_count * 3,
    }))
    .sort((a, b) => b.impact_score - a.impact_score);

  const totalStars = owned.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = owned.reduce((s, r) => s + r.forks_count, 0);

  return {
    total: owned.length,
    total_stars: totalStars,
    total_forks: totalForks,
    top_repos: sorted.slice(0, 5),
  };
};

const analyzeActivity = (events) => {
  const pushEvents = events.filter((e) => e.type === 'PushEvent');
  const commitsByDay = {};
  const hourCounts = new Array(24).fill(0);
  const dayOfWeekCounts = new Array(7).fill(0);

  for (const event of pushEvents) {
    const date = new Date(event.created_at);
    const dateStr = date.toISOString().split('T')[0];
    const commits = event.payload?.commits?.length || 0;

    commitsByDay[dateStr] = (commitsByDay[dateStr] || 0) + commits;
    hourCounts[date.getUTCHours()] += commits;
    dayOfWeekCounts[date.getUTCDay()] += commits;
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const peakDay = days[dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts))];

  const streak = computeStreak(commitsByDay);

  const eventBreakdown = {};
  for (const event of events) {
    eventBreakdown[event.type] = (eventBreakdown[event.type] || 0) + 1;
  }

  return {
    recent_commits: Object.values(commitsByDay).reduce((a, b) => a + b, 0),
    peak_hour: `${peakHour}:00 UTC`,
    peak_day: peakDay,
    current_streak: streak.current,
    longest_streak: streak.longest,
    heatmap: commitsByDay,
    event_breakdown: eventBreakdown,
  };
};

const computeStreak = (commitsByDay) => {
  const today = new Date();
  let current = 0;
  let longest = 0;
  let temp = 0;

  const allDates = Object.keys(commitsByDay).sort();
  for (const dateStr of allDates) {
    if (commitsByDay[dateStr] > 0) {
      temp++;
      longest = Math.max(longest, temp);
    } else {
      temp = 0;
    }
  }

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (commitsByDay[key]) {
      current++;
    } else if (i > 0) {
      break;
    }
  }

  return { current, longest };
};

module.exports = { analyzeLanguages, analyzeRepos, analyzeActivity };
