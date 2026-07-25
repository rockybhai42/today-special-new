// Mocked before any app modules load, so every controller/route in this
// file's require graph sees the mocked ffmpegService consistently.
jest.mock('../services/ffmpegService', () => ({
  isAvailable: jest.fn().mockResolvedValue(false),
  convertToWebCompatible: jest.fn(),
}));

const request = require('supertest');
const app = require('../app');
const testDb = require('./testDb');
const { getAuthToken } = require('./helpers');

let token;

beforeAll(() => testDb.connect());

beforeEach(async () => {
  token = await getAuthToken(request, app);
});

afterEach(() => testDb.clearDatabase());
afterAll(() => testDb.closeDatabase());

it('serves the raw upload unconverted when FFmpeg is unavailable, instead of blocking the upload', async () => {
  const res = await request(app)
    .post('/api/specials/upload/video')
    .set('Authorization', `Bearer ${token}`)
    .attach('video', Buffer.from('fake video bytes'), 'clip.mp4');

  expect(res.status).toBe(201);
  expect(res.body.data.mediaType).toBe('video');
  expect(res.body.data.conversionStatus).toBe('skipped_ffmpeg_unavailable');
  expect(res.body.data.mediaUrl).toMatch(/^https?:\/\/.*\/uploads\/videos\/.*\.mp4$/);
});
