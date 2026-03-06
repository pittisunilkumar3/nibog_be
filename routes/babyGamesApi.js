const express = require('express');
const router = express.Router();
const BabyGamesModel = require('../model/babyGamesModel');
const { authenticateEmployee } = require('../controller/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = '/www/wwwroot/nibog.in/public/uploads/babygames/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'game-' + uniqueSuffix + path.extname(file.originalname));
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

// GET /api/babygames/get-all - Get all games
router.get('/get-all', async (req, res) => {
  try {
    const games = await BabyGamesModel.getAll();
    // Return in the format the frontend expects
    res.json(games || []);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ success: false, message: 'Error fetching games', error: error.message });
  }
});

// POST /api/babygames/get - Get game by ID
router.post('/get', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Game ID is required' });
    }
    const game = await BabyGamesModel.getById(id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }
    res.json({ success: true, game });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ success: false, message: 'Error fetching game', error: error.message });
  }
});

// POST /api/babygames/create - Create new game
router.post('/create', authenticateEmployee, async (req, res) => {
  try {
    const result = await BabyGamesModel.create(req.body);
    const newGame = await BabyGamesModel.getById(result.insertId);
    res.status(201).json({ success: true, message: 'Game created', id: result.insertId, game: newGame });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ success: false, message: 'Error creating game', error: error.message });
  }
});

// POST /api/babygames/update - Update game
router.post('/update', authenticateEmployee, async (req, res) => {
  try {
    const { id, ...updateData } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Game ID is required' });
    }
    await BabyGamesModel.update(id, updateData);
    const updatedGame = await BabyGamesModel.getById(id);
    res.json({ success: true, message: 'Game updated', game: updatedGame });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ success: false, message: 'Error updating game', error: error.message });
  }
});

// POST /api/babygames/delete - Delete game
router.post('/delete', authenticateEmployee, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Game ID is required' });
    }
    await BabyGamesModel.remove(id);
    res.json({ success: true, message: 'Game deleted' });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ success: false, message: 'Error deleting game', error: error.message });
  }
});

// POST /api/babygames/upload-image - Upload game image
router.post('/upload-image', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const filePath = '/uploads/babygames/' + req.file.filename;
    res.json({ success: true, path: filePath, filename: req.file.filename });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, message: 'Error uploading image', error: error.message });
  }
});

module.exports = router;
