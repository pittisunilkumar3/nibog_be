const express = require('express');
const router = express.Router();
const promoCodeController = require('../controller/promoCodeController');

// POST /api/promo-codes/validate-final - Validate promo code for final booking
router.post('/validate-final', promoCodeController.validateFinal);

// POST /api/promo-codes/validate-preview - Validate promo code for preview
router.post('/validate-preview', promoCodeController.validatePreview);

// GET /api/promo-codes - Get all promo codes
router.get('/', promoCodeController.getAll);

// GET /api/promo-codes/:id - Get single promo code
router.get('/:id', promoCodeController.getById);

// GET /api/promo-codes/event/:eventId - Get promo codes for an event
router.get('/event/:eventId', promoCodeController.getByEvent);

// POST /api/promo-codes - Create a new promo code
router.post('/', promoCodeController.create);

// PUT /api/promo-codes/:id - Update a promo code
router.put('/:id', promoCodeController.update);

// DELETE /api/promo-codes/:id - Delete a promo code
router.delete('/:id', promoCodeController.delete);

module.exports = router;
