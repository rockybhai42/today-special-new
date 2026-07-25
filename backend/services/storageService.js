const path = require('path');
const fs = require('fs/promises');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * All filesystem/URL concerns for uploaded media live here. Controllers
 * and other services never touch `fs` or build URLs directly, so swapping
 * this file for an S3/Cloud Storage-backed implementation later requires
 * no changes outside this module.
 */

const UPLOADS_ROOT = config.uploadsDir;
const IMAGES_DIR = path.join(UPLOADS_ROOT, 'images');
const VIDEOS_DIR = path.join(UPLOADS_ROOT, 'videos');
const TMP_DIR = path.join(UPLOADS_ROOT, 'tmp');

function dirFor(mediaType) {
  return mediaType === 'video' ? VIDEOS_DIR : IMAGES_DIR;
}

function publicPathFor(mediaType, filename) {
  const folder = mediaType === 'video' ? 'videos' : 'images';
  return `/uploads/${folder}/${filename}`;
}

function absoluteUrlFor(mediaType, filename) {
  return `${config.mediaBaseUrl}${publicPathFor(mediaType, filename)}`;
}

/**
 * Ensures a stored mediaUrl (relative, e.g. "/uploads/videos/x.mp4") is
 * absolute before it reaches the TV player, which may run on a different
 * device/origin than the API. Already-absolute URLs (future cloud storage)
 * pass through unchanged.
 */
function toAbsoluteUrl(mediaUrl) {
  if (!mediaUrl || /^https?:\/\//i.test(mediaUrl)) return mediaUrl;
  return `${config.mediaBaseUrl}${mediaUrl}`;
}

async function removeFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logger.warn('Failed to remove file', { filePath, error: err.message });
    }
  }
}

/**
 * Deletes a previously stored media file given its mediaUrl — accepts both
 * the relative form ("/uploads/videos/abc.mp4") and the absolute form
 * returned by the upload endpoints ("http://host/uploads/videos/abc.mp4"),
 * used when a Special is deleted or replaced.
 */
async function removeByPublicPath(mediaUrl) {
  if (!mediaUrl) return;

  const pathname = /^https?:\/\//i.test(mediaUrl) ? new URL(mediaUrl).pathname : mediaUrl;
  if (!pathname.startsWith('/uploads/')) return;

  const filePath = path.join(UPLOADS_ROOT, pathname.replace('/uploads/', ''));
  await removeFile(filePath);
}

module.exports = {
  UPLOADS_ROOT,
  IMAGES_DIR,
  VIDEOS_DIR,
  TMP_DIR,
  dirFor,
  publicPathFor,
  absoluteUrlFor,
  toAbsoluteUrl,
  removeFile,
  removeByPublicPath,
};
