import axios from 'axios';
import {API_BASE_URL} from './api';

export const checkAppConnectivity = async () => {
  // ── Step 1: NetInfo ──────────────────────────────────────────────────────────
  let isConnected          = null;
  let isInternetReachable  = null;

  try {
    const NetInfo = require('@react-native-community/netinfo').default;
    const state   = await NetInfo.fetch();
    isConnected         = state.isConnected;
    isInternetReachable = state.isInternetReachable;
  } catch (err) {
    console.log('[Connectivity] NetInfo error:', err?.message);
  }

  console.log('[Connectivity] NetInfo result:', {isConnected, isInternetReachable});

  // No network connection at all → offline immediately
  if (isConnected === false) {
    console.log('[Connectivity] Final mode: offline (no network)');
    return {isDeviceOnline: false, isBackendReachable: false, mode: 'offline'};
  }

  // Internet explicitly unreachable → offline immediately
  if (isInternetReachable === false) {
    console.log('[Connectivity] Final mode: offline (internet not reachable)');
    return {isDeviceOnline: false, isBackendReachable: false, mode: 'offline'};
  }

  // Connected (or unknown) → verify backend regardless
  // Covers: isInternetReachable === null (ambiguous — backend decides)

  // ── Step 2: Backend health check ─────────────────────────────────────────────
  let isBackendReachable = false;
  try {
    const res = await axios.get(`${API_BASE_URL}/`, {timeout: 5000});
    isBackendReachable = res?.data?.success === true;
    console.log('[Connectivity] Backend health:', res.data?.message);
  } catch (err) {
    console.log('[Connectivity] Backend unreachable:', err?.message);
    isBackendReachable = false;
  }

  const isDeviceOnline = !!(isConnected !== false);
  const mode           = isDeviceOnline && isBackendReachable ? 'online' : 'offline';

  console.log('[Connectivity] Final mode:', mode, {isDeviceOnline, isBackendReachable});
  return {isDeviceOnline, isBackendReachable, mode};
};
