const express = require('express');
const router = express.Router();
const { listGalleryImages, getGalleryImageById, createGalleryImage, updateGalleryImage, deleteGalleryImage } = require('../controller/galleryImagesController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// List all gallery images (public)
router.get('/', listGalleryImages);

// Get a single gallery image by id (public)
router.get('/:id', getGalleryImageById);

// Create a new gallery image (protected)
router.post('/', authenticateEmployee, createGalleryImage);

// Update a gallery image (protected)
router.put('/:id', authenticateEmployee, updateGalleryImage);

// Delete a gallery image (protected)
router.delete('/:id', authenticateEmployee, deleteGalleryImage);

module.exports = router;
