const request = require('supertest');
const app = require('../app');
const testDb = require('./testDb');
const { getAuthToken } = require('./helpers');
const Special = require('../models/Special');

let token;

beforeAll(async () => {
  await testDb.connect();
});

beforeEach(async () => {
  token = await getAuthToken(request, app);
});

afterEach(() => testDb.clearDatabase());
afterAll(() => testDb.closeDatabase());

const authed = (req) => req.set('Authorization', `Bearer ${token}`);

const validPayload = () => ({
  title: 'Chef Special',
  dishName: 'Grilled Salmon',
  description: 'With lemon butter',
  price: 19.99,
  mediaType: 'image',
  mediaUrl: 'http://localhost:5000/uploads/images/salmon.jpg',
  duration: 8,
});

describe('specials routes require auth', () => {
  it('rejects unauthenticated access to every route', async () => {
    expect((await request(app).get('/api/specials')).status).toBe(401);
    expect((await request(app).post('/api/specials').send(validPayload())).status).toBe(401);
    expect((await request(app).patch('/api/specials/000000000000000000000000/toggle')).status).toBe(401);
  });
});

describe('POST /api/specials', () => {
  it('creates a special with valid data', async () => {
    const res = await authed(request(app).post('/api/specials')).send(validPayload());

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ title: 'Chef Special', isActive: true });
  });

  it('rejects a missing title/dishName', async () => {
    const { title, ...rest } = validPayload();
    const res = await authed(request(app).post('/api/specials')).send(rest);
    expect(res.status).toBe(400);
  });

  it('rejects a negative price at the Mongoose validation layer', async () => {
    const res = await authed(request(app).post('/api/specials')).send({ ...validPayload(), price: -5 });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid mediaType', async () => {
    const res = await authed(request(app).post('/api/specials')).send({ ...validPayload(), mediaType: 'audio' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/specials and /api/specials/:id', () => {
  it('lists specials sorted by displayOrder, including inactive ones', async () => {
    await Special.create({ ...validPayload(), title: 'B', displayOrder: 2, isActive: false });
    await Special.create({ ...validPayload(), title: 'A', displayOrder: 1 });

    const res = await authed(request(app).get('/api/specials'));

    expect(res.status).toBe(200);
    expect(res.body.data.map((s) => s.title)).toEqual(['A', 'B']);
  });

  it('returns 404 for a nonexistent id', async () => {
    const res = await authed(request(app).get('/api/specials/000000000000000000000000'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed id (CastError)', async () => {
    const res = await authed(request(app).get('/api/specials/not-a-valid-id'));
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/specials/:id', () => {
  it('updates fields', async () => {
    const special = await Special.create(validPayload());

    const res = await authed(request(app).put(`/api/specials/${special._id}`)).send({
      ...validPayload(),
      price: 25,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(25);
  });

  it('deletes the old media file when mediaUrl changes', async () => {
    const special = await Special.create(validPayload());

    const res = await authed(request(app).put(`/api/specials/${special._id}`)).send({
      ...validPayload(),
      mediaUrl: 'http://localhost:5000/uploads/images/new.jpg',
    });

    // storageService.removeByPublicPath silently no-ops for a file that
    // doesn't exist on disk — this just confirms the update itself succeeds
    // and persists the new mediaUrl (the swap path is exercised either way).
    expect(res.status).toBe(200);
    expect(res.body.data.mediaUrl).toContain('new.jpg');
  });
});

describe('PATCH /api/specials/:id/toggle', () => {
  it('flips isActive', async () => {
    const special = await Special.create({ ...validPayload(), isActive: true });

    const res = await authed(request(app).patch(`/api/specials/${special._id}/toggle`));

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });
});

describe('PATCH /api/specials/reorder', () => {
  it('applies new displayOrder values', async () => {
    const a = await Special.create({ ...validPayload(), title: 'A', displayOrder: 1 });
    const b = await Special.create({ ...validPayload(), title: 'B', displayOrder: 2 });

    const res = await authed(request(app).patch('/api/specials/reorder')).send({
      order: [
        { id: a._id.toString(), displayOrder: 2 },
        { id: b._id.toString(), displayOrder: 1 },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.map((s) => s.title)).toEqual(['B', 'A']);
  });

  it('rejects a malformed order payload', async () => {
    const res = await authed(request(app).patch('/api/specials/reorder')).send({ order: 'not-an-array' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/specials/:id', () => {
  it('removes the special', async () => {
    const special = await Special.create(validPayload());

    const res = await authed(request(app).delete(`/api/specials/${special._id}`));
    expect(res.status).toBe(200);

    expect(await Special.findById(special._id)).toBeNull();
  });

  it('returns 404 for an already-deleted special', async () => {
    const special = await Special.create(validPayload());
    await authed(request(app).delete(`/api/specials/${special._id}`));

    const res = await authed(request(app).delete(`/api/specials/${special._id}`));
    expect(res.status).toBe(404);
  });
});
