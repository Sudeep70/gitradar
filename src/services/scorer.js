const computeScore = (user, repoStats, activity, languages) => {
  const scores = {};

  // Consistency (0–25): based on streak + recent commits
  const streakScore = Math.min(activity.current_streak * 2, 15);
  const commitScore = Math.min(activity.recent_commits / 5, 10);
  scores.consistency = Math.round(streakScore + commitScore);

  // Impact (0–25): stars + forks across repos
  const starScore = Math.min(repoStats.total_stars / 10, 15);
  const forkScore = Math.min(repoStats.total_forks / 5, 10);
  scores.impact = Math.round(starScore + forkScore);

  // Diversity (0–25): language breadth + repo count
  const langScore = Math.min(languages.breakdown.length * 3, 15);
  const repoScore = Math.min(repoStats.total / 2, 10);
  scores.diversity = Math.round(langScore + repoScore);

  // Profile completeness (0–25)
  let profile = 0;
  if (user.bio) profile += 6;
  if (user.location) profile += 4;
  if (user.blog) profile += 5;
  if (user.company) profile += 4;
  if (user.twitter_username) profile += 3;
  if (user.followers > 10) profile += 3;
  scores.profile = Math.round(Math.min(profile, 25));

  const total = scores.consistency + scores.impact + scores.diversity + scores.profile;

  const grade =
    total >= 85 ? 'S' :
    total >= 70 ? 'A' :
    total >= 55 ? 'B' :
    total >= 40 ? 'C' : 'D';

  return {
    total,
    grade,
    breakdown: scores,
    max: 100,
  };
};

module.exports = { computeScore };
