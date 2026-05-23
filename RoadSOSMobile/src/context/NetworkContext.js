import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {AppState} from 'react-native';
import {getPendingAlerts, removeSyncedAlerts} from '../services/offlineStorage';
import {bulkSyncAlerts} from '../services/api';
import {checkAppConnectivity} from '../services/connectivity';

const NetworkContext = createContext({
  isConnected:         true,
  isBackendReachable:  false,
  mode:                'checking',   // 'checking' | 'online' | 'offline'
  pendingCount:        0,
  syncNow:             async () => 0,
  refreshPendingCount: async () => {},
  recheckNow:          async () => {},
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({children}) => {
  const [mode,               setMode]              = useState('checking');
  const [isConnected,        setIsConnected]        = useState(true);
  const [isBackendReachable, setIsBackendReachable] = useState(false);
  const [pendingCount,       setPendingCount]       = useState(0);

  const pollingRef    = useRef(null);
  const isCheckingRef = useRef(false);
  const prevModeRef   = useRef('checking');

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const refreshPendingCount = useCallback(async () => {
    try {
      const alerts = await getPendingAlerts();
      setPendingCount(alerts.length);
    } catch {}
  }, []);

  const syncNow = useCallback(async () => {
    try {
      const pending = await getPendingAlerts();
      if (!pending.length) {return 0;}
      const res    = await bulkSyncAlerts(pending);
      const synced = res.data?.syncedLocalIds || [];
      if (synced.length) {
        await removeSyncedAlerts(synced);
        const remaining = await getPendingAlerts();
        setPendingCount(remaining.length);
      }
      return synced.length;
    } catch {
      return 0;
    }
  }, []);

  // ── Core connectivity check ───────────────────────────────────────────────────
  const doCheck = useCallback(async () => {
    if (isCheckingRef.current) {return;}
    isCheckingRef.current = true;
    try {
      const result = await checkAppConnectivity();

      setIsConnected(result.isDeviceOnline);
      setIsBackendReachable(result.isBackendReachable);
      setMode(result.mode);

      // Auto-sync when transitioning offline → online
      if (result.mode === 'online' && prevModeRef.current === 'offline') {
        syncNow();
      }
      prevModeRef.current = result.mode;
    } catch (err) {
      console.warn('[NetworkContext] doCheck error:', err?.message);
      setMode('offline');
      prevModeRef.current = 'offline';
    } finally {
      isCheckingRef.current = false;
    }
  }, [syncNow]);

  // Keep ref always current so closures in intervals/listeners never go stale
  const doCheckRef = useRef(doCheck);
  useEffect(() => { doCheckRef.current = doCheck; });

  // ── Manual recheck (exposed to consumers) ────────────────────────────────────
  const recheckNow = useCallback(async () => {
    setMode('checking');
    await doCheckRef.current();
  }, []);

  // ── Polling: active only while offline, every 15 s ───────────────────────────
  useEffect(() => {
    if (mode === 'offline') {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => {
          doCheckRef.current();
        }, 15000);
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [mode]);

  // ── Mount: initial check + AppState + NetInfo listeners ──────────────────────
  useEffect(() => {
    refreshPendingCount();
    doCheckRef.current();   // first check on startup

    // Re-check when app comes to foreground
    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        doCheckRef.current();
      }
    });

    // Re-check on network state changes (debounced 1 s to let network settle)
    let netInfoUnsub = () => {};
    let debounceTimer = null;
    try {
      const NetInfo = require('@react-native-community/netinfo').default;
      netInfoUnsub = NetInfo.addEventListener(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          doCheckRef.current();
        }, 1000);
      });
    } catch (err) {
      console.warn('[NetworkContext] NetInfo unavailable:', err?.message);
    }

    return () => {
      appStateSub.remove();
      try { netInfoUnsub(); } catch {}
      clearTimeout(debounceTimer);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NetworkContext.Provider value={{
      isConnected,
      isBackendReachable,
      mode,
      pendingCount,
      syncNow,
      refreshPendingCount,
      recheckNow,
    }}>
      {children}
    </NetworkContext.Provider>
  );
};
