// model/galleryImagesModel.js
// Model for the gallery_images table

const { promisePool: db } = require('../config/config');

const GalleryImages = {
    async getAll() {
        const [rows] = await db.query('SELECT * FROM gallery_images ORDER BY created_at DESC');
        return rows;
    },

    async getById(id) {
        const [rows] = await db.query('SELECT * FROM gallery_images WHERE id = ?', [id]);
        return rows[0];
    },

    async create(galleryImage) {
        const sql = `INSERT INTO gallery_images (image_path) VALUES (?)`;
        const params = [galleryImage.image_path];
        const [result] = await db.query(sql, params);
        return { id: result.insertId, ...galleryImage };
    },

    async update(id, galleryImage) {
        const sql = `UPDATE gallery_images SET image_path=? WHERE id=?`;
        const params = [galleryImage.image_path, id];
        await db.query(sql, params);
        return { id, ...galleryImage };
    },

    async delete(id) {
        await db.query('DELETE FROM gallery_images WHERE id = ?', [id]);
        return { id };
    }
};

module.exports = GalleryImages;
