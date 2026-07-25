/**
 * Console logger with the fixed event vocabulary this player is expected to
 * emit (Video Loaded, Playlist Updated, Offline, ...), so anyone tailing
 * `console` on a deployed device can follow what the player is doing.
 */
function emit(level, event, meta) {
  const line = `[${new Date().toISOString()}] ${event}`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta !== undefined) {
    fn(line, meta);
  } else {
    fn(line);
  }
}

const logger = {
  info: (event, meta) => emit('info', event, meta),
  warn: (event, meta) => emit('warn', event, meta),
  error: (event, meta) => emit('error', event, meta),
};

export default logger;
