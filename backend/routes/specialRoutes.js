const express = require('express');
const {
  uploadImage,
  uploadVideo,
  createSpecial,
  getSpecials,
  getSpecialById,
  updateSpecial,
  toggleActive,
  reorderSpecials,
  deleteSpecial,
} = require('../controllers/specialController');
const { protect } = require('../middleware/auth');
const { validateSpecialInput, validateReorder } = require('../middleware/validate');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.post('/upload/image', upload.uploadImage, uploadImage);
router.post('/upload/video', upload.uploadVideo, uploadVideo);

router.patch('/reorder', validateReorder, reorderSpecials);

router
  .route('/')
  .get(getSpecials)
  .post(validateSpecialInput, createSpecial);

router
  .route('/:id')
  .get(getSpecialById)
  .put(validateSpecialInput, updateSpecial)
  .delete(deleteSpecial);

router.patch('/:id/toggle', toggleActive);

module.exports = router;
