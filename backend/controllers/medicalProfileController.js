const MedicalProfile = require('../models/MedicalProfile');

const saveProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const {bloodGroup, allergies, medications, healthNotes, emergencyContactName, emergencyContactPhone} = req.body;

    const profile = await MedicalProfile.findOneAndUpdate(
      {userId},
      {
        bloodGroup:            bloodGroup            || '',
        allergies:             allergies             || '',
        medications:           medications           || '',
        healthNotes:           healthNotes           || '',
        emergencyContactName:  emergencyContactName  || '',
        emergencyContactPhone: emergencyContactPhone || '',
      },
      {new: true, upsert: true, setDefaultsOnInsert: true},
    );

    res.status(200).json({success: true, message: 'Medical profile saved successfully', data: profile});
  } catch (error) {
    console.error('Error saving medical profile:', error.message);
    res.status(500).json({success: false, message: 'Server error while saving medical profile'});
  }
};

const getProfile = async (req, res) => {
  try {
    const profile = await MedicalProfile.findOne({userId: req.userId});

    if (!profile) {
      return res.status(404).json({success: false, message: 'No medical profile found for this user'});
    }

    res.status(200).json({success: true, data: profile});
  } catch (error) {
    console.error('Error fetching medical profile:', error.message);
    res.status(500).json({success: false, message: 'Server error while fetching medical profile'});
  }
};

module.exports = {saveProfile, getProfile};
