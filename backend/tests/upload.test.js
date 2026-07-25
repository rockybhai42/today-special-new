const request = require('supertest');
const app = require('../app');
const testDb = require('./testDb');
const { getAuthToken } = require('./helpers');

// A 1x1 PNG — small enough to embed, valid enough for multer/sharp-less
// image handling (the controller never decodes it, just stores the bytes).
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

let token;

beforeAll(() => testDb.connect());

beforeEach(async () => {
  token = await getAuthToken(request, app);
});

afterEach(() => testDb.clearDatabase());
afterAll(() => testDb.closeDatabase());

describe('POST /api/specials/upload/image', () => {
  it('rejects a request with no file', async () => {
    const res = await request(app)
      .post('/api/specials/upload/image')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('rejects a non-image file', async () => {
    const res = await request(app)
      .post('/api/specials/upload/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('not an image'), 'notes.txt');

    expect(res.status).toBe(400);
  });

  it('accepts a valid image and returns an absolute mediaUrl', async () => {
    const res = await request(app)
      .post('/api/specials/upload/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', TINY_PNG, 'test.png');

    expect(res.status).toBe(201);
    expect(res.body.data.mediaType).toBe('image');
    expect(res.body.data.mediaUrl).toMatch(/^https?:\/\/.*\/uploads\/images\/.*\.png$/);
    expect(res.body.data.conversionStatus).toBe('not_applicable');
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/specials/upload/image').attach('image', TINY_PNG, 'test.png');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/specials/upload/video', () => {
  // The real FFmpeg conversion path (video in -> H.264/AAC MP4 out) depends
  // on a system FFmpeg install and was verified manually against the actual
  // binary rather than here, to keep this suite fast and environment-
  // independent. The FFmpeg-unavailable fallback is covered in
  // uploadVideoFallback.test.js, which mocks the service module.
  it('rejects a request with no file', async () => {
    const res = await request(app)
      .post('/api/specials/upload/video')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/specials/upload/video')
      .attach('video', Buffer.from('fake video bytes'), 'clip.mp4');
    expect(res.status).toBe(401);
  });
});
