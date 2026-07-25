const request = require('supertest');
const app = require('../app');
const testDb = require('./testDb');
const Special = require('../models/Special');

beforeAll(() => testDb.connect());
afterEach(() => testDb.clearDatabase());
afterAll(() => testDb.closeDatabase());

const base = (overrides) => ({
  title: 'Special',
  dishName: 'Dish',
  price: 10,
  mediaType: 'image',
  mediaUrl: '/uploads/images/x.jpg',
  duration: 8,
  ...overrides,
});

describe('GET /current-playlist', () => {
  it('requires no authentication', async () => {
    const res = await request(app).get('/current-playlist');
    expect(res.status).toBe(200);
  });

  it('returns only active specials, sorted by displayOrder', async () => {
    await Special.create(base({ title: 'Inactive', isActive: false, displayOrder: 0 }));
    await Special.create(base({ title: 'Second', isActive: true, displayOrder: 2 }));
    await Special.create(base({ title: 'First', isActive: true, displayOrder: 1 }));

    const res = await request(app).get('/current-playlist');

    expect(res.body.data.items.map((i) => i.title)).toEqual(['First', 'Second']);
  });

  it('resolves relative mediaUrl to an absolute URL', async () => {
    await Special.create(base({ mediaUrl: '/uploads/images/relative.jpg' }));

    const res = await request(app).get('/current-playlist');

    expect(res.body.data.items[0].mediaUrl).toMatch(/^https?:\/\/.*\/uploads\/images\/relative\.jpg$/);
  });

  it('leaves an already-absolute mediaUrl untouched', async () => {
    await Special.create(base({ mediaUrl: 'https://cdn.example.com/x.jpg' }));

    const res = await request(app).get('/current-playlist');

    expect(res.body.data.items[0].mediaUrl).toBe('https://cdn.example.com/x.jpg');
  });

  it('exposes a playlist-level updatedAt equal to the max item updatedAt', async () => {
    const older = await Special.create(base({ title: 'Older' }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    const newer = await Special.create(base({ title: 'Newer' }));

    const res = await request(app).get('/current-playlist');

    expect(res.body.data.updatedAt).toBe(newer.updatedAt.toISOString());
    expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThan(older.updatedAt.getTime());
  });

  it('returns an empty items array with no active specials', async () => {
    const res = await request(app).get('/current-playlist');
    expect(res.body.data.items).toEqual([]);
  });
});
