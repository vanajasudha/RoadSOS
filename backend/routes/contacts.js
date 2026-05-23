const express    = require('express');
const router     = express.Router();
const requireAuth = require('../middleware/auth');
const {addContact, getContactsByUser, deleteContact} = require('../controllers/contactsController');

router.use(requireAuth);

router.get('/',     getContactsByUser);
router.post('/',    addContact);
router.delete('/:id', deleteContact);

module.exports = router;
