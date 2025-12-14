const express = require('express');
const router = express.Router();
const PartnersController = require('../controller/partnersController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// Public
router.get('/', PartnersController.list);
router.get('/:id', PartnersController.get);

// Protected
router.post('/', authenticateEmployee, PartnersController.create);
router.put('/:id', authenticateEmployee, PartnersController.update);
router.delete('/:id', authenticateEmployee, PartnersController.remove);

module.exports = router;
