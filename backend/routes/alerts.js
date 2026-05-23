const express    = require('express');
const router     = express.Router();
const requireAuth = require('../middleware/auth');
const {createAlert, getAlertsByUser, resolveAlert, bulkSync} = require('../controllers/alertsController');

router.use(requireAuth);

router.post('/',             createAlert);
router.get('/',              getAlertsByUser);
router.patch('/:id/resolve', resolveAlert);
router.post('/bulk-sync',    bulkSync);

module.exports = router;
