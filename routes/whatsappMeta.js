const router = require('express').Router();
const c = require('../controller/whatsappMetaController');
router.get('/settings', c.getSettings);
router.post('/settings', c.saveSettings);
router.post('/verify', c.verify);
router.post('/send-test', c.sendTest);
router.get('/webhook', c.verifyWebhook);
router.post('/webhook', c.webhook);
module.exports = router;
