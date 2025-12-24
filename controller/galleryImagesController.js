const GalleryImagesModel = require('../model/galleryImagesModel');

// List all gallery images
const listGalleryImages = async (req, res) => {
    try {
        const images = await GalleryImagesModel.getAll();
        res.json(images);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching gallery images', error: err.message });
    }
};

// Get a single gallery image by id
const getGalleryImageById = async (req, res) => {
    try {
        const id = req.params.id;
        const image = await GalleryImagesModel.getById(id);
        if (!image) return res.status(404).json({ message: 'Gallery image not found' });
        res.json(image);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching gallery image', error: err.message });
    }
};

// Create a new gallery image
const createGalleryImage = async (req, res) => {
    try {
        const { image_path } = req.body;

        // Basic validation
        if (!image_path) {
            return res.status(400).json({ message: 'Image path is required' });
        }

        const newImage = await GalleryImagesModel.create({
            image_path
        });

        res.status(201).json({ message: 'Gallery image created successfully', galleryImage: newImage });
    } catch (err) {
        res.status(500).json({ message: 'Error creating gallery image', error: err.message });
    }
};

// Update a gallery image
const updateGalleryImage = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        // Check if image exists first
        const existing = await GalleryImagesModel.getById(id);
        if (!existing) return res.status(404).json({ message: 'Gallery image not found' });

        await GalleryImagesModel.update(id, data);

        // Fetch updated image to return
        const updatedImage = await GalleryImagesModel.getById(id);
        res.json({ message: 'Gallery image updated successfully', galleryImage: updatedImage });
    } catch (err) {
        res.status(500).json({ message: 'Error updating gallery image', error: err.message });
    }
};

// Delete a gallery image
const deleteGalleryImage = async (req, res) => {
    try {
        const id = req.params.id;

        // Check if image exists
        const existing = await GalleryImagesModel.getById(id);
        if (!existing) return res.status(404).json({ message: 'Gallery image not found' });

        await GalleryImagesModel.delete(id);
        res.json({ message: 'Gallery image deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting gallery image', error: err.message });
    }
};

module.exports = {
    listGalleryImages,
    getGalleryImageById,
    createGalleryImage,
    updateGalleryImage,
    deleteGalleryImage
};
