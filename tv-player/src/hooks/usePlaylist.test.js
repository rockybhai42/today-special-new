import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlaylist } from './usePlaylist.js';
import { fetchCurrentPlaylist } from '../services/playlistService.js';

vi.mock('../services/playlistService.js', () => ({
  fetchCurrentPlaylist: vi.fn(),
}));
vi.mock('../services/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const playlistA = {
  updatedAt: '2026-01-01T00:00:00.000Z',
  items: [{ id: '1', dishName: 'Dish A', mediaType: 'image', mediaUrl: 'a.jpg', duration: 8 }],
};

const playlistB = {
  updatedAt: '2026-01-02T00:00:00.000Z',
  items: [{ id: '2', dishName: 'Dish B', mediaType: 'image', mediaUrl: 'b.jpg', duration: 8 }],
};

// RTL's `waitFor` drives its own timer polling, which collides unpredictably
// with vi's fake clock (it auto-advances fake timers internally). Every test
// here instead flushes explicitly via advanceTimersByTimeAsync so the clock
// only ever moves by an amount this test controls.
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function advance(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePlaylist', () => {
  it('loads the playlist on mount and reports online', async () => {
    fetchCurrentPlaylist.mockResolvedValue(playlistA);

    const { result } = renderHook(() => usePlaylist());
    await flush();

    expect(result.current.items).toEqual(playlistA.items);
    expect(result.current.isOnline).toBe(true);
  });

  it('caches the playlist to localStorage so it survives a reload', async () => {
    fetchCurrentPlaylist.mockResolvedValue(playlistA);
    renderHook(() => usePlaylist());
    await flush();

    const cached = JSON.parse(localStorage.getItem('todays-special.playlist-cache.v1'));
    expect(cached.items).toEqual(playlistA.items);
  });

  it('starts from a cached playlist immediately, before the first fetch resolves', async () => {
    localStorage.setItem('todays-special.playlist-cache.v1', JSON.stringify(playlistA));
    fetchCurrentPlaylist.mockImplementation(() => new Promise(() => {})); // never resolves

    const { result } = renderHook(() => usePlaylist());

    expect(result.current.items).toEqual(playlistA.items);
  });

  it('does not replace items when a poll fails — playback keeps going on stale data', async () => {
    fetchCurrentPlaylist.mockResolvedValueOnce(playlistA);
    const { result } = renderHook(() => usePlaylist());
    await flush();
    expect(result.current.items).toEqual(playlistA.items);

    fetchCurrentPlaylist.mockRejectedValueOnce(new Error('network down'));
    await advance(60_000); // next scheduled poll fires and fails

    expect(result.current.isOnline).toBe(false);
    expect(result.current.items).toEqual(playlistA.items);
  });

  it('retries every 30s while offline instead of waiting the full 60s', async () => {
    fetchCurrentPlaylist.mockRejectedValue(new Error('down'));
    renderHook(() => usePlaylist());
    await flush();
    expect(fetchCurrentPlaylist).toHaveBeenCalledTimes(1);

    await advance(30_000);
    expect(fetchCurrentPlaylist).toHaveBeenCalledTimes(2);

    await advance(30_000);
    expect(fetchCurrentPlaylist).toHaveBeenCalledTimes(3);
  });

  it('picks up a changed playlist (different updatedAt) on the next successful poll', async () => {
    fetchCurrentPlaylist.mockResolvedValueOnce(playlistA);
    const { result } = renderHook(() => usePlaylist());
    await flush();
    expect(result.current.items).toEqual(playlistA.items);

    fetchCurrentPlaylist.mockResolvedValueOnce(playlistB);
    await advance(60_000);

    expect(result.current.items).toEqual(playlistB.items);
  });

  it('does not needlessly replace the items array when updatedAt is unchanged', async () => {
    fetchCurrentPlaylist.mockResolvedValue(playlistA);
    const { result } = renderHook(() => usePlaylist());
    await flush();
    const itemsRefBefore = result.current.items;

    await advance(60_000);

    expect(result.current.items).toBe(itemsRefBefore); // same array reference — no unnecessary update
  });
});
