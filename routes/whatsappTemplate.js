const router = require('express').Router();
const c = require('../controller/whatsappTemplateController');
router.get('/', c.list);
router.post('/submit', c.submit);
router.post('/sync-all', c.syncAll);
router.post('/:id/sync', c.syncOne);
router.delete('/:id', c.remove);
module.exports = router;
