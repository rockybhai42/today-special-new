const request = require('supertest');
const app = require('../app');
const testDb = require('./testDb');
const { createTestUser } = require('./helpers');

beforeAll(() => testDb.connect());
afterEach(() => testDb.clearDatabase());
afterAll(() => testDb.closeDatabase());

describe('POST /api/auth/login', () => {
  it('returns a token and user for valid credentials', async () => {
    await createTestUser({ email: 'admin@example.com', password: 'Password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ email: 'admin@example.com', role: 'admin' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a wrong password', async () => {
    await createTestUser({ email: 'admin@example.com', password: 'Password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('rejects a missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@example.com' });
    expect(res.status).toBe(400);
  });

  it('is case-insensitive on email', async () => {
    await createTestUser({ email: 'admin@example.com', password: 'Password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ADMIN@EXAMPLE.COM', password: 'Password123' });

    expect(res.status).toBe(200);
  });
});

describe('GET /api/auth/me', () => {
  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed/invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('returns the authenticated user for a valid token', async () => {
    await createTestUser({ email: 'admin@example.com', password: 'Password123' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Password123' });
    const token = loginRes.body.data.token;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@example.com');
  });
});
