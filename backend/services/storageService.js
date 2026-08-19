const path = require('path');
const fs = require('fs/promises');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * All filesystem/URL concerns for uploaded media live here. Controllers
 * and other services never touch `fs` or build URLs directly, so swapping
 * this file for a cloud-backed implementation requires no changes outside
 * this module — see persistFinalMedia()/removeByPublicPath() below, which
 * branch on config.useCloudStorage.
 */

let cloudinary = null;
if (config.useCloudStorage) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

const CLOUDINARY_FOLDER = 'todays-special';

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
 * Uploads a locally-processed file (already validated / FFmpeg-converted)
 * to its final destination and returns the mediaUrl to store on the
 * Special. Always deletes the local tmp file afterwards, whichever branch
 * runs, so tmp/ never accumulates leftovers.
 *
 * - Cloud mode (config.useCloudStorage): pushes to Cloudinary, returns its
 *   secure_url. Production default — survives restarts/redeploys.
 * - Local mode: moves the file into uploads/{images,videos}/, same
 *   behavior as before Cloudinary support existed. Used in dev/test where
 *   no Cloudinary credentials are configured.
 */
async function persistFinalMedia(tmpFilePath, mediaType, filename) {
  if (config.useCloudStorage) {
    const publicId = `${CLOUDINARY_FOLDER}/${mediaType === 'video' ? 'videos' : 'images'}/${path.parse(filename).name}`;
    try {
      const result = await cloudinary.uploader.upload(tmpFilePath, {
        resource_type: mediaType === 'video' ? 'video' : 'image',
        public_id: publicId,
        overwrite: false,
      });
      return result.secure_url;
    } finally {
      await removeFile(tmpFilePath);
    }
  }

  const destPath = path.join(dirFor(mediaType), filename);
  await fs.rename(tmpFilePath, destPath);
  return absoluteUrlFor(mediaType, filename);
}

/**
 * Extracts a Cloudinary public_id from one of our secure_url values, e.g.
 * "https://res.cloudinary.com/<cloud>/video/upload/v169.../todays-special/videos/abc.mp4"
 * -> "todays-special/videos/abc". Returns null if the URL doesn't match the
 * expected Cloudinary upload URL shape.
 */
function cloudinaryPublicIdFromUrl(mediaUrl) {
  const match = mediaUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
}

/**
 * Deletes a previously stored media file given its mediaUrl — accepts the
 * relative local form ("/uploads/videos/abc.mp4"), the absolute local form
 * ("http://host/uploads/videos/abc.mp4"), and Cloudinary secure_urls, used
 * when a Special is deleted or replaced.
 */
async function removeByPublicPath(mediaUrl) {
  if (!mediaUrl) return;

  if (/^https?:\/\/res\.cloudinary\.com\//i.test(mediaUrl)) {
    const publicId = cloudinaryPublicIdFromUrl(mediaUrl);
    if (!publicId) return;
    try {
      const resourceType = /\/video\/upload\//.test(mediaUrl) ? 'video' : 'image';
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
      logger.warn('Failed to remove Cloudinary asset', { publicId, error: err.message });
    }
    return;
  }

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
  persistFinalMedia,
  removeByPublicPath,
};
