const PromoCodeModel = require('../model/promoCodeModel');

// Validate promo code for final booking
const validateFinal = async (req, res) => {
  try {
    const { promo_code, event_id, game_ids, amount } = req.body;

    if (!promo_code || !event_id || !game_ids || !Array.isArray(game_ids) || game_ids.length === 0 || !amount) {
      return res.status(400).json({ 
        success: false,
        error: 'promo_code, event_id, game_ids array, and amount are required' 
      });
    }

    const result = await PromoCodeModel.validatePromoCode(
      promo_code.trim().toUpperCase(),
      parseInt(event_id),
      game_ids,
      parseFloat(amount)
    );

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Validate promo code for preview (same as final for now)
const validatePreview = async (req, res) => {
  return validateFinal(req, res);
};

// Get all promo codes
const getAll = async (req, res) => {
  try {
    const promoCodes = await PromoCodeModel.getAll();
    res.json({ success: true, data: promoCodes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get single promo code
const getById = async (req, res) => {
  try {
    const promo = await PromoCodeModel.getById(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, error: 'Promo code not found' });
    }
    res.json({ success: true, data: promo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create promo code
const create = async (req, res) => {
  try {
    const { code, discount_type, discount_value, min_order_value, max_discount, usage_limit, valid_from, valid_until, is_active, event_id } = req.body;

    if (!code || !discount_type || !discount_value || !valid_from || !valid_until) {
      return res.status(400).json({ 
        success: false, 
        error: 'code, discount_type, discount_value, valid_from, and valid_until are required' 
      });
    }

    const newPromo = await PromoCodeModel.create({
      code: code.trim().toUpperCase(),
      discount_type,
      discount_value,
      min_order_value,
      max_discount,
      usage_limit,
      valid_from,
      valid_until,
      is_active,
      event_id
    });

    res.status(201).json({ success: true, message: 'Promo code created successfully', data: newPromo });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Promo code already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update promo code
const update = async (req, res) => {
  try {
    const existing = await PromoCodeModel.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Promo code not found' });
    }

    await PromoCodeModel.update(req.params.id, req.body);
    const updated = await PromoCodeModel.getById(req.params.id);
    res.json({ success: true, message: 'Promo code updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete promo code
const deletePromo = async (req, res) => {
  try {
    const existing = await PromoCodeModel.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Promo code not found' });
    }

    await PromoCodeModel.delete(req.params.id);
    res.json({ success: true, message: 'Promo code deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get promo codes by event
const getByEvent = async (req, res) => {
  try {
    const [rows] = await require('../config/config').promisePool.query(
      'SELECT * FROM promo_codes WHERE (event_id = ? OR event_id IS NULL) AND is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW()',
      [req.params.eventId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  validateFinal,
  validatePreview,
  getAll,
  getById,
  create,
  update,
  delete: deletePromo,
  getByEvent
};
