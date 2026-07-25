const STORAGE_KEY = 'todays-special.playlist-cache.v1';

/**
 * Persists the last-known-good playlist to localStorage so a TV that loses
 * power and reboots while offline still has something to play immediately,
 * instead of a black screen until the API becomes reachable again.
 */
export function saveCachedPlaylist(playlist) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlist));
  } catch {
    // Storage full or unavailable (e.g. private mode) — non-fatal, playback continues in memory.
  }
}

export function loadCachedPlaylist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
