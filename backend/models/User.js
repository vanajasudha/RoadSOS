const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    location: {
      lat: {type: Number},
      lng: {type: Number},
    },

    otp:       {type: String},
    otpExpiry: {type: Date},
  },
  {timestamps: true},
);

module.exports = mongoose.model('User', userSchema);
