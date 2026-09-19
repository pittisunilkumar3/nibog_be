const express = require('express');
const router = express.Router();
const c = require('../controller/certificateTemplateController');
const fs = require('fs');

// POST /api/certificate-templates/upload-background (admin certificate designer)
const multer = require('multer');
const certUploadDir = '/www/wwwroot/nibog2.0/upload/certificatetemplates';
const certStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(certUploadDir, { recursive: true });
    cb(null, certUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    cb(null, 'template_' + Date.now() + '_' + Math.floor(Math.random() * 10000) + '.' + ext);
  }
});
const certUpload = multer({ storage: certStorage, limits: { fileSize: 10 * 1024 * 1024 } });
router.post('/upload-background', certUpload.single('file'), c.uploadBackground);


router.get('/get-all', c.getAll);
router.post('/get-all', c.getAll);
router.post('/get', c.getById);
router.get('/by-type/:type', c.getByType);
router.post('/create', c.create);
router.post('/update', c.update);
router.post('/delete', c.remove);
router.delete('/:id', c.remove);

module.exports = router;
