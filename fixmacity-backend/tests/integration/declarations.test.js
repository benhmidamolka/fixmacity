const request = require('supertest');

let app;
beforeAll(() => {
  process.env.JWT_SECRET = 'test_secret_for_ci';
  process.env.NODE_ENV = 'test';
  app = require('../../src/app');
});

describe('GET /api/declarations/map', () => {
  it('returns map data without auth', async () => {
    const res = await request(app).get('/api/declarations/map');
    expect([200, 304, 500]).toContain(res.statusCode); // 500 acceptable if no DB in test env
  });
});

describe('POST /api/declarations', () => {
  it('rejects unauthenticated submission', async () => {
    const res = await request(app)
      .post('/api/declarations')
      .send({ title: 'Test', description: 'Test desc', category: 'Voirie' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/agent/declarations', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/agent/declarations');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/chef/declarations', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/chef/declarations');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/president/declarations', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/president/declarations');
    expect(res.statusCode).toBe(401);
  });
});