const { execFile } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const logger = require('../utils/logger');

/**
 * Normalizes every uploaded video to the profile required by LG webOS /
 * Android TV players: MP4, H.264 (Main, Level 4.0), AAC-LC, 1920x1080, 30fps.
 *
 * Most Node hosts (e.g. Render's standard web service) don't ship an ffmpeg
 * binary and don't grant apt/root access to install one. @ffmpeg-installer/ffmpeg
 * ships a static per-platform binary as a regular npm dependency, so this
 * works the same in local dev and in production with no Docker/infra needed.
 * If that package is ever removed, this falls back to the `ffmpeg` on PATH.
 */
let ffmpegBinaryPath = 'ffmpeg';
try {
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  ffmpegBinaryPath = ffmpegInstaller.path;
} catch (err) {
  logger.warn('@ffmpeg-installer/ffmpeg not available — falling back to system ffmpeg on PATH', {
    error: err.message,
  });
}

/**
 * FFmpeg is still not guaranteed to work on every machine (e.g. an
 * unsupported architecture). When it's missing, `isAvailable()` reports
 * false and callers fall back to serving the original upload unconverted
 * (logged as a warning) instead of crashing the upload flow.
 */

let availabilityCache = null;

function isAvailable() {
  if (availabilityCache !== null) {
    return Promise.resolve(availabilityCache);
  }
  return new Promise((resolve) => {
    execFile(ffmpegBinaryPath, ['-version'], (err) => {
      availabilityCache = !err;
      resolve(availabilityCache);
    });
  });
}

/**
 * Converts inputPath to a web/TV-compatible MP4 at outputPath.
 * Rejects on conversion failure so the caller can reject the upload.
 */
function convertToWebCompatible(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-profile:v main',
        '-level 4.0',
        '-r 30',
        '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
        '-movflags +faststart',
      ])
      .format('mp4')
      .on('error', (err) => {
        logger.error('FFmpeg conversion failed', { inputPath, error: err.message });
        reject(err);
      })
      .on('end', () => {
        logger.info('FFmpeg conversion finished', { inputPath, outputPath });
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

module.exports = { isAvailable, convertToWebCompatible };
