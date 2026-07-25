const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const storageService = require('../services/storageService');

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/webm',
  'video/x-msvideo',
]);

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500MB

function uniqueFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

// Raw uploads always land in tmp/ first. Videos are moved into place only
// after passing through the FFmpeg normalization step; images are moved
// as-is by the controller. Nothing serves directly out of tmp/.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, storageService.TMP_DIR),
  filename: (req, file, cb) => cb(null, uniqueFilename(file.originalname)),
});

function fileFilter(req, file, cb) {
  if (file.fieldname === 'image') {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      return cb(new Error('Unsupported image type. Allowed: JPG, JPEG, PNG, WebP'));
    }
    return cb(null, true);
  }

  if (file.fieldname === 'video') {
    if (!ALLOWED_VIDEO_MIME.has(file.mimetype)) {
      return cb(new Error('Unsupported video type. Upload a video file (it will be normalized to MP4/H.264/AAC)'));
    }
    return cb(null, true);
  }

  return cb(new Error(`Unexpected upload field: ${file.fieldname}`));
}

const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_BYTES },
}).single('image');

const uploadVideo = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_VIDEO_BYTES },
}).single('video');

const { failure } = require('../utils/apiResponse');

/**
 * Wraps a multer middleware so file-filter/size-limit errors resolve to a
 * clean 400 response instead of falling through to the generic error
 * handler (multer errors don't reliably carry a statusCode).
 */
function handleUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) return failure(res, 400, err.message);
      return next();
    });
  };
}

module.exports = {
  uploadImage: handleUpload(uploadImage),
  uploadVideo: handleUpload(uploadVideo),
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
};
