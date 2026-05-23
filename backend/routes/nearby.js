const express = require('express');
const router = express.Router();

// Import the controller function
const { getNearbyServices } = require('../controllers/nearbyController');

// GET /api/nearby?lat=X&lng=Y — return nearby emergency services
// The lat and lng values come from query parameters, not URL params
router.get('/', getNearbyServices);

module.exports = router;
