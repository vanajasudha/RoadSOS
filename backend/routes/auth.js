const express     = require('express');
const router      = express.Router();
const requireAuth = require('../middleware/auth');
const {sendOtp, verifyOtp, getMe, updateProfile} = require('../controllers/authController');

router.post('/send-otp',  sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me',          requireAuth, getMe);
router.patch('/profile',   requireAuth, updateProfile);

module.exports = router;
