const express = require('express');
const router = express.Router();
const { getSharedData } = require('../controllers/shareController');

router.get('/:token', getSharedData);

module.exports = router;
