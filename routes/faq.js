const express = require('express');
const router = express.Router();
const { editFaq, deleteFaq, getFaq, listFaqs } = require('../controller/faqController');
// List all FAQs (GET /faqs)
router.get('/faqs', listFaqs);

// Get a single FAQ by id (GET /faqs/:id)
router.get('/faqs/:id', getFaq);

const { authenticateEmployee } = require('../controller/authMiddleware');

// Edit FAQ (PUT /faqs/:id)
router.put('/faqs/:id', authenticateEmployee, editFaq);

// Delete FAQ (DELETE /faqs/:id)
router.delete('/faqs/:id', authenticateEmployee, deleteFaq);

module.exports = router;
