import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  NEARBY_CACHE:   '@roadsos_nearby_cache',
  CONTACTS_CACHE: '@roadsos_contacts_cache',
  LAST_LOCATION:  '@roadsos_last_location',
  PENDING_ALERTS: '@roadsos_pending_alerts',
};

// ── Last Known Location ────────────────────────────────────────────────────────

export const saveLastLocation = async (lat, lng) => {
  try {
    await AsyncStorage.setItem(
      KEYS.LAST_LOCATION,
      JSON.stringify({lat, lng, savedAt: Date.now()}),
    );
  } catch {}
};

export const getLastLocation = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LAST_LOCATION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ── Emergency Contacts Cache ───────────────────────────────────────────────────

export const saveContactsCache = async contacts => {
  try {
    await AsyncStorage.setItem(KEYS.CONTACTS_CACHE, JSON.stringify(contacts));
  } catch {}
};

export const getContactsCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CONTACTS_CACHE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// ── Nearby Services Cache ──────────────────────────────────────────────────────

export const getNearbyCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.NEARBY_CACHE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// ── Pending Offline Alerts ─────────────────────────────────────────────────────

const genLocalId = () =>
  `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const savePendingAlert = async (location, description) => {
  try {
    const existing = await getPendingAlerts();
    const alert = {
      localId:   genLocalId(),
      location,
      description,
      severity:  'medium',
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(
      KEYS.PENDING_ALERTS,
      JSON.stringify([...existing, alert]),
    );
    return alert;
  } catch {
    return null;
  }
};

export const getPendingAlerts = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PENDING_ALERTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const removeSyncedAlerts = async syncedLocalIds => {
  try {
    const existing = await getPendingAlerts();
    const remaining = existing.filter(a => !syncedLocalIds.includes(a.localId));
    await AsyncStorage.setItem(KEYS.PENDING_ALERTS, JSON.stringify(remaining));
  } catch {}
};
