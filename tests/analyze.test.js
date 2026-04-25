const request = require('supertest');
const app = require('../src/index');

jest.mock('../src/services/github', () => ({
  getUser: jest.fn().mockResolvedValue({
    login: 'testuser',
    name: 'Test User',
    avatar_url: 'https://github.com/testuser.png',
    bio: 'A developer',
    location: 'Earth',
    company: 'Test Corp',
    blog: 'https://test.dev',
    followers: 50,
    following: 20,
    public_repos: 15,
    created_at: '2018-01-01T00:00:00Z',
    twitter_username: 'testuser',
  }),
  getRepos: jest.fn().mockResolvedValue([
    {
      name: 'awesome-project',
      fork: false,
      description: 'My awesome project',
      html_url: 'https://github.com/testuser/awesome-project',
      stargazers_count: 42,
      forks_count: 10,
      language: 'JavaScript',
      topics: ['nodejs', 'api'],
      updated_at: new Date().toISOString(),
    },
    {
      name: 'forked-repo',
      fork: true,
      stargazers_count: 100,
      forks_count: 50,
    },
  ]),
  getEvents: jest.fn().mockResolvedValue([
    {
      type: 'PushEvent',
      created_at: new Date().toISOString(),
      payload: { commits: [{}, {}] },
    },
    {
      type: 'PullRequestEvent',
      created_at: new Date().toISOString(),
      payload: {},
    },
  ]),
  getLanguagesForRepo: jest.fn().mockResolvedValue({ JavaScript: 50000, TypeScript: 20000 }),
}));

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /analyze/:username', () => {
  it('returns full report for valid user', async () => {
    const res = await request(app).get('/analyze/testuser');
    expect(res.statusCode).toBe(200);
    expect(res.body.username).toBe('testuser');
    expect(res.body.score).toBeDefined();
    expect(res.body.languages).toBeDefined();
    expect(res.body.repos).toBeDefined();
    expect(res.body.activity).toBeDefined();
  });

  it('includes score with grade', async () => {
    const res = await request(app).get('/analyze/testuser');
    expect(res.body.score.grade).toMatch(/^[SABCD]$/);
    expect(res.body.score.total).toBeGreaterThanOrEqual(0);
    expect(res.body.score.total).toBeLessThanOrEqual(100);
  });
});

describe('GET /analyze/:username/score', () => {
  it('returns only score data', async () => {
    const res = await request(app).get('/analyze/testuser/score');
    expect(res.statusCode).toBe(200);
    expect(res.body.score).toBeDefined();
    expect(res.body.repos).toBeUndefined();
  });
});

describe('GET /analyze/:username/repos', () => {
  it('returns only owned repos (no forks)', async () => {
    const res = await request(app).get('/analyze/testuser/repos');
    expect(res.statusCode).toBe(200);
    expect(res.body.repos.total).toBe(1);
  });
});

describe('GET /analyze/compare/:user1/:user2', () => {
  it('returns comparison with winner', async () => {
    const res = await request(app).get('/analyze/compare/testuser/otheruser');
    expect(res.statusCode).toBe(200);
    expect(res.body.winner).toBeDefined();
    expect(res.body.comparison).toBeDefined();
  });
});
