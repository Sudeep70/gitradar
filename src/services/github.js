const axios = require('axios');

const githubClient = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github+json',
    ...(process.env.GITHUB_TOKEN && {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    }),
  },
});

const getUser = async (username) => {
  const { data } = await githubClient.get(`/users/${username}`);
  return data;
};

const getRepos = async (username) => {
  const repos = [];
  let page = 1;
  while (true) {
    const { data } = await githubClient.get(`/users/${username}/repos`, {
      params: { per_page: 100, page, type: 'owner', sort: 'updated' },
    });
    repos.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return repos;
};

const getEvents = async (username) => {
  const events = [];
  let page = 1;
  while (page <= 3) {
    const { data } = await githubClient.get(`/users/${username}/events/public`, {
      params: { per_page: 100, page },
    });
    events.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return events;
};

const getLanguagesForRepo = async (username, repoName) => {
  try {
    const { data } = await githubClient.get(`/repos/${username}/${repoName}/languages`);
    return data;
  } catch {
    return {};
  }
};

module.exports = { getUser, getRepos, getEvents, getLanguagesForRepo };
