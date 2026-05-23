const EmergencyContact = require('../models/EmergencyContact');

const addContact = async (req, res) => {
  try {
    const userId = req.userId;
    const {name, phone, relationship} = req.body;

    if (!name || !phone) {
      return res.status(400).json({success: false, message: 'name and phone are required'});
    }

    const existingCount = await EmergencyContact.countDocuments({userId});
    if (existingCount >= 5) {
      return res.status(400).json({success: false, message: 'A user can have a maximum of 5 emergency contacts'});
    }

    const contact = new EmergencyContact({userId, name, phone, relationship});
    await contact.save();

    res.status(201).json({success: true, message: 'Emergency contact added successfully', data: contact});
  } catch (error) {
    console.error('Error adding contact:', error.message);
    res.status(500).json({success: false, message: 'Server error while adding contact'});
  }
};

const getContactsByUser = async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({userId: req.userId}).sort({createdAt: -1});
    res.status(200).json({success: true, data: contacts});
  } catch (error) {
    console.error('Error fetching contacts:', error.message);
    res.status(500).json({success: false, message: 'Server error while fetching contacts'});
  }
};

const deleteContact = async (req, res) => {
  try {
    const deleted = await EmergencyContact.findOneAndDelete({_id: req.params.id, userId: req.userId});

    if (!deleted) {
      return res.status(404).json({success: false, message: 'Contact not found'});
    }

    res.status(200).json({success: true, message: 'Emergency contact deleted successfully'});
  } catch (error) {
    console.error('Error deleting contact:', error.message);
    res.status(500).json({success: false, message: 'Server error while deleting contact'});
  }
};

module.exports = {addContact, getContactsByUser, deleteContact};
