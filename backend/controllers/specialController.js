const path = require('path');
const Special = require('../models/Special');
const storageService = require('../services/storageService');
const ffmpegService = require('../services/ffmpegService');
const logger = require('../utils/logger');
const { success, failure } = require('../utils/apiResponse');

/**
 * POST /api/specials/upload/image
 * Moves the validated image out of tmp/ into its permanent location and
 * returns the mediaType/mediaUrl pair the dashboard attaches to a Special.
 */
async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return failure(res, 400, 'No image file provided');
    }

    const mediaUrl = await storageService.persistFinalMedia(req.file.path, 'image', req.file.filename);

    logger.info('Image uploaded', { filename: req.file.filename });

    return success(res, 201, {
      mediaType: 'image',
      mediaUrl,
      conversionStatus: 'not_applicable',
    }, 'Image uploaded');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/specials/upload/video
 * Normalizes the upload to MP4/H.264/AAC via FFmpeg before it becomes
 * playable media. Falls back to serving the raw upload (with a warning)
 * when FFmpeg isn't installed on this machine, so local dev never blocks.
 */
async function uploadVideo(req, res, next) {
  const rawPath = req.file && req.file.path;

  try {
    if (!req.file) {
      return failure(res, 400, 'No video file provided');
    }

    const outputFilename = `${path.parse(req.file.filename).name}.mp4`;
    const ffmpegAvailable = await ffmpegService.isAvailable();

    if (!ffmpegAvailable) {
      logger.warn('FFmpeg not installed — serving original upload unconverted', {
        filename: req.file.filename,
      });

      const mediaUrl = await storageService.persistFinalMedia(rawPath, 'video', outputFilename);

      return success(res, 201, {
        mediaType: 'video',
        mediaUrl,
        conversionStatus: 'skipped_ffmpeg_unavailable',
      }, 'Video uploaded (FFmpeg unavailable — not normalized)');
    }

    // Must differ from rawPath, which also lives in TMP_DIR — when the
    // original upload already has a .mp4 extension (the common case),
    // outputFilename alone would collide with the input filename and
    // FFmpeg refuses to write a file it's still reading ("Output same as
    // Input #0 - exiting").
    const convertedTmpPath = path.join(storageService.TMP_DIR, `converted-${outputFilename}`);
    await ffmpegService.convertToWebCompatible(rawPath, convertedTmpPath);
    await storageService.removeFile(rawPath);

    const mediaUrl = await storageService.persistFinalMedia(convertedTmpPath, 'video', outputFilename);

    return success(res, 201, {
      mediaType: 'video',
      mediaUrl,
      conversionStatus: 'converted',
    }, 'Video uploaded and normalized');
  } catch (err) {
    if (rawPath) await storageService.removeFile(rawPath);
    return failure(res, 422, 'Video could not be converted. It may be corrupt or in an unsupported format.');
  }
}

/** POST /api/specials */
async function createSpecial(req, res, next) {
  try {
    const special = await Special.create(req.body);
    return success(res, 201, special, 'Special created');
  } catch (err) {
    return next(err);
  }
}

/** GET /api/specials — admin listing, includes inactive items */
async function getSpecials(req, res, next) {
  try {
    const specials = await Special.find().sort({ displayOrder: 1 });
    return success(res, 200, specials);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/specials/:id */
async function getSpecialById(req, res, next) {
  try {
    const special = await Special.findById(req.params.id);
    if (!special) return failure(res, 404, 'Special not found');
    return success(res, 200, special);
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/specials/:id */
async function updateSpecial(req, res, next) {
  try {
    const existing = await Special.findById(req.params.id);
    if (!existing) return failure(res, 404, 'Special not found');

    const replacingMedia = req.body.mediaUrl && req.body.mediaUrl !== existing.mediaUrl;
    const previousMediaUrl = existing.mediaUrl;

    Object.assign(existing, req.body);
    await existing.save();

    if (replacingMedia) {
      await storageService.removeByPublicPath(previousMediaUrl);
    }

    return success(res, 200, existing, 'Special updated');
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/specials/:id/toggle */
async function toggleActive(req, res, next) {
  try {
    const special = await Special.findById(req.params.id);
    if (!special) return failure(res, 404, 'Special not found');

    special.isActive = !special.isActive;
    await special.save();

    return success(res, 200, special, `Special ${special.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/specials/reorder — body: { order: [{ id, displayOrder }] } */
async function reorderSpecials(req, res, next) {
  try {
    const { order } = req.body;

    await Promise.all(
      order.map(({ id, displayOrder }) =>
        Special.updateOne({ _id: id }, { $set: { displayOrder: Number(displayOrder) } })
      )
    );

    const specials = await Special.find().sort({ displayOrder: 1 });
    return success(res, 200, specials, 'Playlist reordered');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /current-playlist — public, unauthenticated, polled by the TV player
 * every 60s. Returns only active specials plus a playlist-level `updatedAt`
 * (the max item updatedAt) so the player can cheaply detect changes without
 * diffing the whole list.
 */
async function getCurrentPlaylist(req, res, next) {
  try {
    const specials = await Special.find({ isActive: true }).sort({ displayOrder: 1 });

    const items = specials.map((s) => ({
      id: s._id,
      title: s.title,
      dishName: s.dishName,
      description: s.description,
      price: s.price,
      mediaType: s.mediaType,
      mediaUrl: storageService.toAbsoluteUrl(s.mediaUrl),
      duration: s.duration,
      displayOrder: s.displayOrder,
      updatedAt: s.updatedAt.toISOString(),
    }));

    const updatedAt = items.reduce(
      (latest, item) => (item.updatedAt > latest ? item.updatedAt : latest),
      new Date(0).toISOString()
    );

    return success(res, 200, { updatedAt, items });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/specials/:id */
async function deleteSpecial(req, res, next) {
  try {
    const special = await Special.findByIdAndDelete(req.params.id);
    if (!special) return failure(res, 404, 'Special not found');

    await storageService.removeByPublicPath(special.mediaUrl);

    return success(res, 200, null, 'Special deleted');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  uploadImage,
  uploadVideo,
  createSpecial,
  getSpecials,
  getSpecialById,
  updateSpecial,
  toggleActive,
  reorderSpecials,
  deleteSpecial,
  getCurrentPlaylist,
};
