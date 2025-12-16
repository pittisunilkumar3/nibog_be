// model/addonsModel.js
// Model for the merged Addons table with image_url

const { promisePool: db } = require('../config/config');

const Addons = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM addons');
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM addons WHERE id = ?', [id]);
    return rows[0];
  },

  async create(addon) {
    const sql = `INSERT INTO addons (name, description, price, category, is_active, has_variants, stock_quantity, sku, bundle_min_quantity, bundle_discount_percentage, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      addon.name,
      addon.description,
      addon.price,
      addon.category,
      addon.is_active ?? 1,
      addon.has_variants ?? 0,
      addon.stock_quantity ?? 0,
      addon.sku,
      addon.bundle_min_quantity,
      addon.bundle_discount_percentage,
      addon.image_url
    ];
    const [result] = await db.query(sql, params);
    return { id: result.insertId, ...addon };
  },

  async update(id, addon) {
    const sql = `UPDATE addons SET name=?, description=?, price=?, category=?, is_active=?, has_variants=?, stock_quantity=?, sku=?, bundle_min_quantity=?, bundle_discount_percentage=?, image_url=? WHERE id=?`;
    const params = [
      addon.name,
      addon.description,
      addon.price,
      addon.category,
      addon.is_active,
      addon.has_variants,
      addon.stock_quantity,
      addon.sku,
      addon.bundle_min_quantity,
      addon.bundle_discount_percentage,
      addon.image_url,
      id
    ];
    await db.query(sql, params);
    return { id, ...addon };
  },

  async delete(id) {
    await db.query('DELETE FROM addons WHERE id = ?', [id]);
    return { id };
  }
};

module.exports = Addons;
