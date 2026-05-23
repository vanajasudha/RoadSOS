const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const sendOtp = async (req, res) => {
  try {
    const {phone} = req.body;
    if (!phone) {
      return res.status(400).json({success: false, message: 'Phone is required'});
    }

    const otp       = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await User.findOneAndUpdate(
      {phone},
      {otp, otpExpiry},
      {upsert: true, new: true},
    );

    const isDev = process.env.NODE_ENV !== 'production';
    return res.json({
      success: true,
      message: 'OTP sent successfully',
      ...(isDev && {otp}),   // only exposed in dev — never in production
    });
  } catch (err) {
    console.error('[sendOtp]', err.message);
    return res.status(500).json({success: false, message: 'Server error'});
  }
};

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

    const token = jwt.sign(
      {userId: user._id},
      process.env.JWT_SECRET,
      {expiresIn: '30d'},
    );

    return res.json({
      success: true,
      token,
      user: {
        _id:   user._id,
        name:  user.name,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('[verifyOtp]', err.message);
    return res.status(500).json({success: false, message: 'Server error'});
  }
};

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

module.exports = {sendOtp, verifyOtp, getMe, updateProfile};
