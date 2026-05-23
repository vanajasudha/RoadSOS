const mongoose = require('mongoose');

// One medical profile per user — stores essential emergency health info
// that gets encoded into a QR code on the mobile app.
const medicalProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      unique: true,
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: '',
    },
    allergies: {
      type: String,
      trim: true,
      default: '',
    },
    medications: {
      type: String,
      trim: true,
      default: '',
    },
    healthNotes: {
      type: String,
      trim: true,
      default: '',
    },
    emergencyContactName: {
      type: String,
      trim: true,
      default: '',
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('MedicalProfile', medicalProfileSchema);
