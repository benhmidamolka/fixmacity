const request = require('supertest');

let app;
beforeAll(() => {
  process.env.JWT_SECRET = 'test_secret_for_ci';
  process.env.NODE_ENV = 'test';
  app = require('../../src/app');
});

describe('POST /api/auth/register', () => {
  it('rejects registration with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' });
    expect(res.statusCode).toBe(400);
  });

  it('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123',
              first_name: 'Test', last_name: 'User' });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('rejects wrong credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@fixmacity.tn', password: 'wrongpass' });
    expect([400, 401, 404]).toContain(res.statusCode);
  });

  it('rejects empty body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
  });
});