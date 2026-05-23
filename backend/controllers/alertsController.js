const AccidentAlert    = require('../models/AccidentAlert');
const EmergencyContact = require('../models/EmergencyContact');
const User             = require('../models/User');
const {sendSMS, buildHospitalMessage, buildContactMessage} = require('../services/smsService');

const maskPhone = p => {
  const s = String(p).replace(/\D/g, '');
  return s.length > 4 ? `${'*'.repeat(s.length - 4)}${s.slice(-4)}` : '****';
};

// ── POST /api/alerts ──────────────────────────────────────────────────────────
const createAlert = async (req, res) => {
  try {
    const userId = req.userId;
    const {location, description, severity, selectedHospital} = req.body;

    if (!location?.lat || !location?.lng) {
      return res.status(400).json({success: false, message: 'location (lat, lng) is required'});
    }

    // Fetch sender's name + phone for SMS body
    const user = await User.findById(userId).select('name phone').lean();

    const dispatchInfo = {
      smsSent:          false,
      hospitalNotified: false,
      contactsNotified: 0,
      dispatchedAt:     null,
      smsProvider:      process.env.MSG91_AUTH_KEY ? 'msg91' : 'console',
      smsError:         null,
    };

    // ── 1. SMS the selected hospital ─────────────────────────────────────────
    if (selectedHospital?.phone) {
      try {
        const msg    = buildHospitalMessage(location, user?.phone, user?.name);
        const result = await sendSMS(selectedHospital.phone, msg);
        dispatchInfo.hospitalNotified = result.success || result.fallback === true;
        dispatchInfo.smsSent          = result.success === true;
        dispatchInfo.dispatchedAt     = new Date();
        if (!result.success && result.error) {dispatchInfo.smsError = result.error;}
      } catch (err) {
        console.error('[Alert] Hospital SMS failed:', err.message);
        dispatchInfo.smsError = err.message;
      }
    }

    // ── 2. SMS every emergency contact ───────────────────────────────────────
    const contacts         = await EmergencyContact.find({userId});
    const notifiedContacts = [];

    for (const c of contacts) {
      try {
        const msg    = buildContactMessage(location, user?.name, user?.phone);
        const result = await sendSMS(c.phone, msg);
        const status = result.success  ? 'sms_sent'
                     : result.fallback ? 'logged'
                     :                   'failed';
        notifiedContacts.push({name: c.name, phone: c.phone, relationship: c.relationship || '', status});
        if (result.success || result.fallback) {
          dispatchInfo.contactsNotified += 1;
          dispatchInfo.dispatchedAt = dispatchInfo.dispatchedAt ?? new Date();
        }
      } catch (err) {
        console.error(`[Alert] Contact SMS failed (${maskPhone(c.phone)}):`, err.message);
        notifiedContacts.push({name: c.name, phone: c.phone, relationship: c.relationship || '', status: 'failed'});
      }
    }

    // ── 3. Save alert with full dispatch snapshot ─────────────────────────────
    const alert = new AccidentAlert({
      userId,
      location,
      description,
      severity: severity || 'medium',
      selectedHospital: selectedHospital
        ? {name: selectedHospital.name || null, phone: selectedHospital.phone || null,
           lat: selectedHospital.lat || null, lng: selectedHospital.lng || null}
        : undefined,
      dispatch:         dispatchInfo,
      notifiedContacts,
    });
    await alert.save();

    console.log(`[Alert] ${alert._id} | hospital_notified=${dispatchInfo.hospitalNotified} | contacts=${dispatchInfo.contactsNotified} | provider=${dispatchInfo.smsProvider}`);

    return res.status(201).json({
      success: true,
      message: 'Emergency alert created and dispatched',
      data:    alert,
      notifiedContacts,
      dispatch: dispatchInfo,
    });
  } catch (error) {
    console.error('[Alert] createAlert error:', error.message);
    return res.status(500).json({success: false, message: 'Server error while creating alert'});
  }
};

// ── GET /api/alerts ───────────────────────────────────────────────────────────
const getAlertsByUser = async (req, res) => {
  try {
    const alerts = await AccidentAlert.find({userId: req.userId}).sort({createdAt: -1});
    res.status(200).json({success: true, data: alerts});
  } catch (error) {
    console.error('[Alert] getAlertsByUser error:', error.message);
    res.status(500).json({success: false, message: 'Server error while fetching alerts'});
  }
};

// ── PATCH /api/alerts/:id/resolve ─────────────────────────────────────────────
const resolveAlert = async (req, res) => {
  try {
    const updated = await AccidentAlert.findOneAndUpdate(
      {_id: req.params.id, userId: req.userId},
      {status: 'resolved'},
      {new: true},
    );
    if (!updated) {return res.status(404).json({success: false, message: 'Alert not found'});}
    res.status(200).json({success: true, message: 'Alert marked as resolved', data: updated});
  } catch (error) {
    console.error('[Alert] resolveAlert error:', error.message);
    res.status(500).json({success: false, message: 'Server error while resolving alert'});
  }
};

// ── POST /api/alerts/bulk-sync ────────────────────────────────────────────────
const bulkSync = async (req, res) => {
  try {
    const userId = req.userId;
    const {alerts} = req.body;

    if (!Array.isArray(alerts) || alerts.length === 0) {
      return res.status(400).json({success: false, message: 'alerts array is required'});
    }

    const syncedLocalIds = [];
    for (const a of alerts) {
      if (!a.location?.lat || !a.location?.lng) {continue;}
      const alert = new AccidentAlert({
        userId,
        location:    {lat: a.location.lat, lng: a.location.lng},
        description: a.description || 'Offline SOS alert',
        severity:    a.severity   || 'medium',
        source:      'offline-sync',
      });
      await alert.save();
      if (a.localId) {syncedLocalIds.push(a.localId);}
    }

    res.status(201).json({
      success:        true,
      message:        `Synced ${syncedLocalIds.length} offline alert(s)`,
      syncedCount:    syncedLocalIds.length,
      syncedLocalIds,
    });
  } catch (error) {
    console.error('[Alert] bulkSync error:', error.message);
    res.status(500).json({success: false, message: 'Server error during bulk sync'});
  }
};

module.exports = {createAlert, getAlertsByUser, resolveAlert, bulkSync};
