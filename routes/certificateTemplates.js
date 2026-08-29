const express = require('express');
const router = express.Router();
const c = require('../controller/certificateTemplateController');

router.get('/get-all', c.getAll);
router.post('/get-all', c.getAll);
router.post('/get', c.getById);
router.get('/by-type/:type', c.getByType);
router.post('/create', c.create);
router.post('/update', c.update);
router.post('/delete', c.remove);
router.delete('/:id', c.remove);

module.exports = router;
