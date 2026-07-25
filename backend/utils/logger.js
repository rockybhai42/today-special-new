/**
 * Minimal structured logger. Kept dependency-free so it never becomes
 * a source of crashes on a device that must run for weeks unattended.
 */
function format(level, message, meta) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  return JSON.stringify(entry);
}

const logger = {
  info(message, meta) {
    console.log(format('info', message, meta));
  },
  warn(message, meta) {
    console.warn(format('warn', message, meta));
  },
  error(message, meta) {
    console.error(format('error', message, meta));
  },
};

module.exports = logger;
