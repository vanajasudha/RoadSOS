const mongoose = require('mongoose');

// EmergencyContact schema — people to notify when a user triggers an alert
const emergencyContactSchema = new mongoose.Schema(
  {
    // Which user this contact belongs to
    userId: {
      type: String,
      required: [true, 'User ID is required'],
    },

    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },

    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
    },

    // e.g. "spouse", "parent", "friend"
    relationship: {
      type: String,
      trim: true,
    },
  },
  {
    // Automatically adds createdAt and updatedAt timestamp fields
    timestamps: true,
  }
);

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
