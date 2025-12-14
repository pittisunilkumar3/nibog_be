const express = require('express');
const router = express.Router();
const { editFaq, deleteFaq, getFaq, listFaqs, createFaq } = require('../controller/faqController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// List all FAQs (GET /faqs)
router.get('/faqs', listFaqs);

// Get a single FAQ by id (GET /faqs/:id)
router.get('/faqs/:id', getFaq);

// Create FAQ (POST /faqs)
router.post('/faqs', authenticateEmployee, createFaq);

// Edit FAQ (PUT /faqs/:id)
router.put('/faqs/:id', authenticateEmployee, editFaq);

// Delete FAQ (DELETE /faqs/:id)
router.delete('/faqs/:id', authenticateEmployee, deleteFaq);

module.exports = router;
