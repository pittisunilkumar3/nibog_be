const express = require('express');
const router = express.Router();
const { helloWorld } = require('../controller/helloworldController');

router.get('/', helloWorld);

module.exports = router;
