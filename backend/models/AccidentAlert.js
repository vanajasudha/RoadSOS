const mongoose = require('mongoose');

const accidentAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
    },

    location: {
      lat: {type: Number, required: [true, 'Latitude is required']},
      lng: {type: Number, required: [true, 'Longitude is required']},
    },

    description: {type: String, trim: true},

    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
    },

    source: {
      type: String,
      enum: ['online', 'offline-sync'],
      default: 'online',
    },

    nearbyServicesNotified: {type: Boolean, default: false},

    // Hospital / service the user selected before triggering SOS
    selectedHospital: {
      name:  {type: String, default: null},
      phone: {type: String, default: null},
      lat:   {type: Number, default: null},
      lng:   {type: Number, default: null},
    },

    // SMS dispatch tracking
    dispatch: {
      smsSent:          {type: Boolean, default: false},
      hospitalNotified: {type: Boolean, default: false},
      contactsNotified: {type: Number,  default: 0},
      dispatchedAt:     {type: Date,    default: null},
      smsProvider:      {type: String,  default: 'none'},
      smsError:         {type: String,  default: null},
    },

    // Snapshot of who was notified and their delivery status
    notifiedContacts: [
      {
        name:         {type: String},
        phone:        {type: String},
        relationship: {type: String},
        status:       {type: String}, // 'sms_sent' | 'logged' | 'failed'
      },
    ],
  },
  {timestamps: true},
);

module.exports = mongoose.model('AccidentAlert', accidentAlertSchema);
