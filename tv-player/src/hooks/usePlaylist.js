import { useEffect, useRef, useState } from 'react';
import { fetchCurrentPlaylist } from '../services/playlistService.js';
import { loadCachedPlaylist, saveCachedPlaylist } from '../utils/mediaCache.js';
import logger from '../services/logger.js';

const POLL_INTERVAL_MS = 60_000;
const RETRY_INTERVAL_MS = 30_000;

/**
 * Owns the playlist's lifecycle: initial load from cache (survives a
 * power-cycle while offline), polling for changes every 60s, and falling
 * back to a 30s retry cadence while the API is unreachable. Playback itself
 * never stops — this hook only ever adds/replaces `items`, never clears
 * them on failure.
 */
export function usePlaylist() {
  const cached = useRef(loadCachedPlaylist());
  const [items, setItems] = useState(cached.current?.items ?? []);
  const [isOnline, setIsOnline] = useState(true);
  const updatedAtRef = useRef(cached.current?.updatedAt ?? null);
  const wasOnlineRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    async function poll() {
      try {
        const playlist = await fetchCurrentPlaylist();
        if (cancelled) return;

        if (!wasOnlineRef.current) {
          logger.info('Online');
          wasOnlineRef.current = true;
        }
        setIsOnline(true);

        if (playlist.updatedAt !== updatedAtRef.current) {
          updatedAtRef.current = playlist.updatedAt;
          setItems(playlist.items);
          saveCachedPlaylist(playlist);
          logger.info('Playlist Updated', { itemCount: playlist.items.length });
        }

        timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;

        if (wasOnlineRef.current) {
          logger.warn('Offline', { error: err.message });
          wasOnlineRef.current = false;
        }
        setIsOnline(false);
        timeoutId = setTimeout(poll, RETRY_INTERVAL_MS);
      }
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return { items, isOnline };
}
