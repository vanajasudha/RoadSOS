const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Firebase Admin (lazy init) ────────────────────────────────────────────────
let _admin = null;
function getAdmin() {
  if (_admin) return _admin;
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  _admin = admin;
  return admin;
}

function issueJwt(userId) {
  return jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn: '30d'});
}

// ── POST /api/auth/firebase-login ─────────────────────────────────────────────
const firebaseLogin = async (req, res) => {
  try {
    const {idToken, name} = req.body;
    if (!idToken) {
      return res.status(400).json({success: false, message: 'Firebase ID token is required'});
    }

    const admin    = getAdmin();
    const decoded  = await admin.auth().verifyIdToken(idToken);
    const rawPhone = decoded.phone_number;

    if (!rawPhone) {
      return res.status(400).json({success: false, message: 'Token does not contain a phone number'});
    }

    // Firebase gives +91XXXXXXXXXX — store as 10-digit local number
    const phone = rawPhone.replace(/^\+91/, '');

    let user = await User.findOne({phone});

    if (!user) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          success:      false,
          message:      'Please enter your name to complete signup',
          requiresName: true,
        });
      }
      user = await User.create({phone, name: name.trim()});
    } else if (name && name.trim() && !user.name) {
      user.name = name.trim();
      await user.save();
    }

    const token = issueJwt(user._id);
    return res.json({
      success: true,
      token,
      user: {_id: user._id, name: user.name, phone: user.phone},
    });
  } catch (err) {
    console.error('[firebaseLogin]', err.message);
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({success: false, message: 'Session expired. Please login again.'});
    }
    if (err.code?.startsWith('auth/')) {
      return res.status(401).json({success: false, message: 'Invalid authentication token'});
    }
    return res.status(500).json({success: false, message: 'Server error'});
  }
};

// ── POST /api/auth/send-otp (legacy) ─────────────────────────────────────────
const sendOtp = async (req, res) => {
  try {
    const {phone} = req.body;
    if (!phone) {
      return res.status(400).json({success: false, message: 'Phone is required'});
    }

    const otp       = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await User.findOneAndUpdate(
      {phone},
      {otp, otpExpiry},
      {upsert: true, new: true},
    );

    const isDev = process.env.NODE_ENV !== 'production';
    return res.json({
      success: true,
      message: 'OTP sent successfully',
      ...(isDev && {otp}),
    });
  } catch (err) {
    console.error('[sendOtp]', err.message);
    return res.status(500).json({success: false, message: 'Server error'});
  }
};

// ── POST /api/auth/verify-otp (legacy) ───────────────────────────────────────
const verifyOtp = async (req, res) => {
  try {
    const {phone, otp, name} = req.body;

    if (!phone || !otp) {
      return res.status(400).json({success: false, message: 'Phone and OTP are required'});
    }

    const user = await User.findOne({phone});
    if (!user) {
      return res.status(400).json({success: false, message: 'Phone number not found. Send OTP first.'});
    }

    if (user.otp !== otp) {
      return res.status(400).json({success: false, message: 'Invalid OTP'});
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({success: false, message: 'OTP has expired. Request a new one.'});
    }

    const isNewUser = !user.name;
    if (isNewUser && !name) {
      return res.status(400).json({
        success:      false,
        message:      'Please enter your name to complete signup',
        requiresName: true,
      });
    }

    user.otp       = undefined;
    user.otpExpiry = undefined;
    if (name) {user.name = name;}
    await user.save();

    const token = issueJwt(user._id);
    return res.json({
      success: true,
      token,
      user: {_id: user._id, name: user.name, phone: user.phone},
    });
  } catch (err) {
    console.error('[verifyOtp]', err.message);
    return res.status(500).json({success: false, message: 'Server error'});
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-otp -otpExpiry');
    if (!user) {
      return res.status(404).json({success: false, message: 'User not found'});
    }
    return res.json({success: true, user});
  } catch (err) {
    console.error('[getMe]', err.message);
    return res.status(500).json({success: false, message: 'Server error'});
  }
};

// ── PATCH /api/auth/profile ───────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const {name} = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({success: false, message: 'Name is required'});
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {name: name.trim()},
      {new: true, select: '-otp -otpExpiry'},
    );

    if (!user) {
      return res.status(404).json({success: false, message: 'User not found'});
    }

    return res.json({success: true, user});
  } catch (err) {
    console.error('[updateProfile]', err.message);
    return res.status(500).json({success: false, message: 'Server error'});
  }
};

module.exports = {firebaseLogin, sendOtp, verifyOtp, getMe, updateProfile};
