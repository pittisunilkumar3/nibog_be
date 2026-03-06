const { promisePool: db } = require('../config/config');

const PromoCode = {
  // Validate a promo code
  async validatePromoCode(code, eventId, gameIds, totalAmount) {
    const [rows] = await db.query(
      `SELECT * FROM promo_codes 
       WHERE code = ? 
       AND is_active = TRUE 
       AND valid_from <= NOW() 
       AND valid_until >= NOW()
       AND (usage_limit IS NULL OR used_count < usage_limit)
       AND (event_id IS NULL OR event_id = ?)
       AND min_order_value <= ?`,
      [code, eventId, totalAmount]
    );
    
    if (rows.length === 0) {
      return { valid: false, error: 'Invalid or expired promo code' };
    }
    
    const promo = rows[0];
    let discountAmount = 0;
    
    if (promo.discount_type === 'percentage') {
      discountAmount = (totalAmount * promo.discount_value) / 100;
      if (promo.max_discount) {
        discountAmount = Math.min(discountAmount, promo.max_discount);
      }
    } else {
      discountAmount = promo.discount_value;
    }
    
    return {
      valid: true,
      promoCodeId: promo.id,
      code: promo.code,
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalAmount: Math.round((totalAmount - discountAmount) * 100) / 100
    };
  },

  // Increment usage count
  async incrementUsage(code) {
    await db.query(
      'UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ?',
      [code]
    );
  },

  // Get all promo codes
  async getAll() {
    const [rows] = await db.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
    return rows;
  },

  // Get by ID
  async getById(id) {
    const [rows] = await db.query('SELECT * FROM promo_codes WHERE id = ?', [id]);
    return rows[0];
  },

  // Create promo code
  async create(data) {
    const [result] = await db.query(
      `INSERT INTO promo_codes (code, discount_type, discount_value, min_order_value, max_discount, usage_limit, valid_from, valid_until, is_active, event_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.code, data.discount_type, data.discount_value, data.min_order_value || 0, data.max_discount, data.usage_limit, data.valid_from, data.valid_until, data.is_active ?? true, data.event_id]
    );
    return { id: result.insertId, ...data };
  },

  // Update promo code
  async update(id, data) {
    await db.query(
      `UPDATE promo_codes SET code=?, discount_type=?, discount_value=?, min_order_value=?, max_discount=?, usage_limit=?, valid_from=?, valid_until=?, is_active=?, event_id=? WHERE id=?`,
      [data.code, data.discount_type, data.discount_value, data.min_order_value, data.max_discount, data.usage_limit, data.valid_from, data.valid_until, data.is_active, data.event_id, id]
    );
    return { id, ...data };
  },

  // Delete promo code
  async delete(id) {
    await db.query('DELETE FROM promo_codes WHERE id = ?', [id]);
    return { id };
  }
};

module.exports = PromoCode;
