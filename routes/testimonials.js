const express = require('express');
const router = express.Router();
const TestimonialsController = require('../controller/testimonialsController');
const { authenticateEmployee } = require('../controller/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = '/www/wwwroot/nibog.in/public/uploads/testimonials/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'testimonial-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Public
router.get('/', TestimonialsController.list);
router.get('/:id', TestimonialsController.get);

// Image upload endpoint
router.post('/upload-image', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const filePath = '/uploads/testimonials/' + req.file.filename;
    res.json({ success: true, path: filePath, filename: req.file.filename });
  } catch (error) {
    console.error('Error uploading testimonial image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected
router.post('/', authenticateEmployee, TestimonialsController.create);
router.put('/:id', authenticateEmployee, TestimonialsController.update);
router.delete('/:id', authenticateEmployee, TestimonialsController.remove);

module.exports = router;
