import api from './api.js';

/**
 * Fetches the current active playlist. Callers are responsible for
 * catching failures — this never applies retry/backoff itself so it stays
 * usable both for the normal poll and for the offline retry loop.
 */
export async function fetchCurrentPlaylist() {
  const { data } = await api.get('/current-playlist');
  return data.data; // { updatedAt, items }
}
