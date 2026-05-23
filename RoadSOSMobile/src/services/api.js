import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// true  → hits deployed Railway backend (production)
// false → hits local backend (development)
const IS_PROD = true;

// DEV targets:
//   Emulator    → 'http://10.0.2.2:5000'        (+ run: adb reverse tcp:5000 tcp:5000)
//   Real device → 'http://192.168.0.108:5000'   (PC LAN IP — run ipconfig to confirm)
export const API_BASE_URL = IS_PROD
  ? 'https://roadsos-production-19d4.up.railway.app'
  : 'http://192.168.0.108:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {'Content-Type': 'application/json'},
});

// Attach JWT token from AsyncStorage on every request
api.interceptors.request.use(async config => {
  try {
    const raw = await AsyncStorage.getItem('@roadsos_auth');
    if (raw) {
      const {token} = JSON.parse(raw);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {}
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const sendOtp       = phone              => api.post('/api/auth/send-otp',  {phone});
export const verifyOtp     = (phone, otp, name) => api.post('/api/auth/verify-otp', {phone, otp, ...(name ? {name} : {})});
export const getMe         = ()                 => api.get('/api/auth/me');
export const updateProfile = name               => api.patch('/api/auth/profile', {name});

// ── Alerts ────────────────────────────────────────────────────────────────────
export const sendAlert = (location, description, selectedHospital) =>
  api.post('/api/alerts', {
    location,
    description,
    ...(selectedHospital ? {selectedHospital} : {}),
  });

// ── Nearby ────────────────────────────────────────────────────────────────────
// Overpass can take 20 s if the primary instance fails — give it 45 s
export const getNearbyServices = (lat, lng) =>
  api.get('/api/nearby', {params: {lat, lng}, timeout: 45000});

// ── Emergency Contacts ────────────────────────────────────────────────────────
export const getContacts  = ()                       => api.get('/api/contacts');
export const addContact   = (name, phone, relationship) => api.post('/api/contacts', {name, phone, relationship});
export const deleteContact = id                      => api.delete(`/api/contacts/${id}`);

// ── Medical Profile ───────────────────────────────────────────────────────────
export const getMedicalProfile  = ()     => api.get('/api/medical-profile');
export const saveMedicalProfile = data   => api.post('/api/medical-profile', data);

// ── Offline Sync ──────────────────────────────────────────────────────────────
export const bulkSyncAlerts = alerts => api.post('/api/alerts/bulk-sync', {alerts});

export default api;
