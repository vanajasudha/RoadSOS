const express    = require('express');
const router     = express.Router();
const requireAuth = require('../middleware/auth');
const {saveProfile, getProfile} = require('../controllers/medicalProfileController');

router.use(requireAuth);

router.post('/', saveProfile);
router.get('/',  getProfile);

module.exports = router;
