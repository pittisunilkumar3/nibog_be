const express = require('express');
const router = express.Router();
const HomepageSectionsController = require('../controller/homepageSectionsController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// Public
router.get('/', HomepageSectionsController.list);
router.get('/:id', HomepageSectionsController.get);

// Protected
router.post('/', authenticateEmployee, HomepageSectionsController.create);
router.put('/:id', authenticateEmployee, HomepageSectionsController.update);
router.delete('/:id', authenticateEmployee, HomepageSectionsController.remove);

module.exports = router;
