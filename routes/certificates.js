const express = require('express');
const router = express.Router();
const c = require('../controller/certificateController');

// Mounted at /api/certificates AND /api/certificate
router.post('/generate-single', c.generateSingle);
router.get('/get-all', c.getAll);
router.post('/get', c.getSingle);
router.post('/get-single', c.getSingle);
router.get('/download/:id', c.download);
router.get('/participants', c.eventParticipants);

module.exports = router;
