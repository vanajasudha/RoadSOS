import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {useNetwork} from '../context/NetworkContext';
import {
  getLastLocation,
  getNearbyCache,
  getContactsCache,
} from '../services/offlineStorage';
import {colors} from '../theme/colors';

// ── Info row ──────────────────────────────────────────────────────────────────
const InfoRow = ({icon, label, value, valueColor}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, valueColor && {color: valueColor}]}>
      {value}
    </Text>
  </View>
);

// ── Feature row ───────────────────────────────────────────────────────────────
const FeatureRow = ({icon, text, dimmed}) => (
  <View style={[styles.featureRow, dimmed && {opacity: 0.45}]}>
    <Text style={[styles.featureDot, dimmed && {color: colors.textMuted}]}>{icon}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

// ── Main screen ───────────────────────────────────────────────────────────────
const OfflineModeScreen = () => {
  const {mode, isBackendReachable, pendingCount, syncNow, refreshPendingCount, recheckNow} = useNetwork();

  const [location,      setLocation]      = useState(null);
  const [servicesCount, setServicesCount] = useState(0);
  const [contactsCount, setContactsCount] = useState(0);
  const [syncing,       setSyncing]       = useState(false);
  const [syncMsg,       setSyncMsg]       = useState('');
  const [rechecking,    setRechecking]    = useState(false);

  const load = useCallback(async () => {
    const [loc, services, contacts] = await Promise.all([
      getLastLocation(),
      getNearbyCache(),
      getContactsCache(),
    ]);
    setLocation(loc);
    setServicesCount(services.length);
    setContactsCount(contacts.length);
    refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    const count = await syncNow();
    setSyncing(false);
    setSyncMsg(
      count > 0
        ? `Synced ${count} alert${count > 1 ? 's' : ''} successfully.`
        : 'Nothing to sync, or sync failed. Check connection.',
    );
    load();
  };

  const handleRecheck = async () => {
    setRechecking(true);
    setSyncMsg('');
    await recheckNow();
    setRechecking(false);
  };

  const locationDisplay = location
    ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
    : 'Not saved yet';

  const isOnline = mode === 'online';
  const isChecking = mode === 'checking';

  const statusIcon  = isChecking ? '🔄' : isOnline ? '🟢' : '🔴';
  const statusTitle = isChecking ? 'Checking...' : isOnline ? 'Connected' : 'Offline';
  const statusColor = isChecking ? '#1D4ED8' : isOnline ? colors.success : colors.error;
  const statusSub   = isChecking
    ? 'Verifying connection to backend...'
    : isOnline
      ? 'All features available. Pending alerts will sync automatically.'
      : 'No internet. SOS alerts are saved locally.';

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Offline Mode</Text>
        <Text style={styles.headerSub}>Network status & cached data</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <View style={[
          styles.statusCard,
          isChecking && styles.statusChecking,
          isOnline   && styles.statusOnline,
          !isOnline && !isChecking && styles.statusOffline,
        ]}>
          <Text style={styles.statusCardIcon}>{statusIcon}</Text>
          <View style={styles.statusTextWrap}>
            <Text style={[styles.statusTitle, {color: statusColor}]}>
              {statusTitle}
            </Text>
            <Text style={styles.statusSub}>{statusSub}</Text>
            {isOnline && (
              <Text style={styles.backendNote}>
                {isBackendReachable ? '✓ Backend reachable' : '✗ Backend unreachable'}
              </Text>
            )}
          </View>
        </View>

        {/* Recheck button */}
        <TouchableOpacity
          style={[styles.recheckBtn, rechecking && styles.recheckBtnDisabled]}
          onPress={handleRecheck}
          disabled={rechecking}
          activeOpacity={0.8}>
          {rechecking
            ? <ActivityIndicator color="#1D4ED8" size="small" />
            : <Text style={styles.recheckBtnText}>🔄  Recheck Connection</Text>}
        </TouchableOpacity>

        {/* Data summary */}
        <Text style={styles.sectionTitle}>Locally Saved Data</Text>
        <View style={styles.card}>
          <InfoRow
            icon="📍"
            label="Last Location"
            value={locationDisplay}
            valueColor={location ? colors.text : colors.textMuted}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="🚨"
            label="Pending Alerts"
            value={`${pendingCount} queued`}
            valueColor={pendingCount > 0 ? colors.error : colors.textSecondary}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="📡"
            label="Cached Services"
            value={`${servicesCount} saved`}
            valueColor={servicesCount > 0 ? colors.text : colors.textMuted}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="👤"
            label="Emergency Contacts"
            value={`${contactsCount} saved`}
            valueColor={contactsCount > 0 ? colors.text : colors.textMuted}
          />
        </View>

        {/* Sync section */}
        {pendingCount > 0 && (
          <>
            <Text style={styles.sectionTitle}>Sync Pending Alerts</Text>
            <TouchableOpacity
              style={[
                styles.syncBtn,
                (!isOnline || syncing) && styles.syncBtnDisabled,
              ]}
              onPress={handleSync}
              disabled={!isOnline || syncing}
              activeOpacity={0.8}>
              {syncing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.syncBtnText}>
                    {`⬆  Sync ${pendingCount} Pending Alert${pendingCount > 1 ? 's' : ''}`}
                  </Text>}
            </TouchableOpacity>

            {!!syncMsg && (
              <View style={styles.syncMsgBox}>
                <Text style={styles.syncMsgText}>{syncMsg}</Text>
              </View>
            )}

            {!isOnline && (
              <Text style={styles.syncNote}>
                Connect to internet to sync pending alerts.
              </Text>
            )}
          </>
        )}

        {/* Offline capabilities */}
        <Text style={styles.sectionTitle}>Offline Capabilities</Text>
        <View style={styles.card}>
          <FeatureRow icon="✓" text="SOS alerts saved locally when offline" />
          <FeatureRow icon="✓" text="Crash alerts saved locally when offline" />
          <FeatureRow icon="✓" text="Emergency contacts loaded from device cache" />
          <FeatureRow icon="✓" text="Nearby services shown from last search" />
          <FeatureRow icon="✓" text="Last GPS location saved for offline alerts" />
          <FeatureRow icon="✓" text="Pending alerts auto-sync when connection returns" />
          <FeatureRow
            icon="⏳"
            text="SMS fallback (coming soon) — send emergency SMS via cellular even without internet"
            dimmed
          />
        </View>

        <View style={{height: 32}} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},

  header: {
    paddingHorizontal: 20,
    paddingVertical:   16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor:   colors.surface,
  },
  headerTitle: {fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: 0.3},
  headerSub:   {fontSize: 12, color: colors.textSecondary, marginTop: 3},

  scroll: {padding: 16, paddingBottom: 100},

  // Status card
  statusCard: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           14,
    borderRadius:  16,
    borderWidth:   1,
    padding:       18,
    marginBottom:  12,
  },
  statusOnline:   {backgroundColor: colors.successLight, borderColor: colors.success + '44'},
  statusOffline:  {backgroundColor: colors.primaryLight,  borderColor: colors.error   + '44'},
  statusChecking: {backgroundColor: '#EFF6FF',            borderColor: '#BFDBFE'},
  statusCardIcon: {fontSize: 32},
  statusTextWrap: {flex: 1},
  statusTitle:    {fontSize: 17, fontWeight: '900'},
  statusSub:      {fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 17},
  backendNote:    {fontSize: 11, color: colors.textMuted, marginTop: 4},

  // Recheck button
  recheckBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     '#BFDBFE',
    borderRadius:    12,
    paddingVertical: 12,
    backgroundColor: '#EFF6FF',
    marginBottom:    20,
    gap:             6,
  },
  recheckBtnDisabled: {opacity: 0.5},
  recheckBtnText: {fontSize: 14, fontWeight: '700', color: '#1D4ED8'},

  sectionTitle: {
    fontSize:      13,
    fontWeight:    '800',
    color:         colors.textSecondary,
    marginBottom:  10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Info card
  card: {
    backgroundColor: colors.surface,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
    marginBottom:    20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  infoRow:   {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical:   14,
  },
  infoLeft:  {flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1},
  infoIcon:  {fontSize: 18},
  infoLabel: {fontSize: 14, color: colors.text, fontWeight: '600'},
  infoValue: {
    fontSize:   13,
    fontWeight: '700',
    color:      colors.textSecondary,
    textAlign:  'right',
    maxWidth:   '50%',
  },
  divider: {height: 1, backgroundColor: colors.border, marginHorizontal: 16},

  // Sync
  syncBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius:    14,
    alignItems:      'center',
    marginBottom:    10,
  },
  syncBtnDisabled: {opacity: 0.45},
  syncBtnText:     {color: '#fff', fontWeight: '800', fontSize: 15},

  syncMsgBox: {
    backgroundColor: colors.successLight,
    borderRadius:    10,
    padding:         12,
    borderWidth:     1,
    borderColor:     colors.success + '44',
    marginBottom:    8,
  },
  syncMsgText: {color: colors.success, fontSize: 13, fontWeight: '600', textAlign: 'center'},
  syncNote:    {fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 20},

  // Features list
  featureRow: {
    flexDirection: 'row',
    gap:           10,
    paddingHorizontal: 16,
    paddingVertical:    12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  featureDot: {fontSize: 14, color: colors.success, fontWeight: '800', width: 18},
  featureText: {flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19},
});

export default OfflineModeScreen;
