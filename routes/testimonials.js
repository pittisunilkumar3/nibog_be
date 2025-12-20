const express = require('express');
const router = express.Router();
const TestimonialsController = require('../controller/testimonialsController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// Public
router.get('/', TestimonialsController.list);
router.get('/:id', TestimonialsController.get);

// Protected
router.post('/', authenticateEmployee, TestimonialsController.create);
router.put('/:id', authenticateEmployee, TestimonialsController.update);
router.delete('/:id', authenticateEmployee, TestimonialsController.remove);

module.exports = router;
