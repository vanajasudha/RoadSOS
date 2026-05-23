import React, {useEffect, useRef, useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Linking,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import {colors} from '../theme/colors';
import api from '../services/api';

const formatTime = iso => {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) + '  ' + d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
};

const openInMaps = (lat, lng) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  Linking.openURL(url).catch(() => {});
};

// ── Alert Sent Screen ─────────────────────────────────────────────────────────
const AlertSentScreen = ({navigation, route}) => {
  const {
    latitude,
    longitude,
    notifiedContacts = [],
    alertId,
    timestamp,
    source           = 'sos',
    isOffline        = false,
    selectedHospital = null,
    dispatch         = null,
  } = route.params ?? {};

  const [alertStatus,   setAlertStatus]   = useState(null);
  const [refreshing,    setRefreshing]    = useState(false);

  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Entry animation
  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacityAnim, {toValue: 1, duration: 250, useNativeDriver: true}),
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 5, tension: 90, useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch alert status from server
  const refreshStatus = useCallback(async () => {
    if (!alertId || isOffline) {return;}
    setRefreshing(true);
    try {
      const res   = await api.get('/api/alerts');
      const found = (res.data.data || []).find(a => a._id === alertId);
      if (found) {setAlertStatus(found);}
    } catch {}
    finally {setRefreshing(false);}
  }, [alertId, isOffline]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Override hardware back → always go Home, never go back to SOS flow
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.navigate('MainTabs');
      return true;
    });
    return () => handler.remove();
  }, [navigation]);

  const isCrash = source === 'crash' || source === 'sensor';

  const displayAlertId = alertId
    ? `#ALRT-${alertId.slice(-10).toUpperCase()}`
    : `#ALRT-${Date.now().toString().slice(-8)}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={[styles.hero, isOffline && styles.heroOffline]}>
          <Animated.View style={[
            styles.checkCircle,
            isOffline && styles.checkCircleOffline,
            {opacity: opacityAnim, transform: [{scale: scaleAnim}]},
          ]}>
            <Text style={styles.checkIcon}>{isOffline ? '📡' : '✓'}</Text>
          </Animated.View>

          <Animated.View style={{opacity: opacityAnim, alignItems: 'center'}}>
            <Text style={[styles.heroTitle, isOffline && styles.heroTitleOffline]}>
              {isOffline ? 'Alert Queued' : 'Alert Sent!'}
            </Text>
            <Text style={styles.heroSub}>
              {isOffline
                ? 'Saved locally. Will sync automatically\nwhen internet returns.'
                : isCrash
                  ? 'Crash alert sent.\nEmergency contacts have been notified.'
                  : 'Help is on the way.\nYour location has been shared.'}
            </Text>
          </Animated.View>
        </View>

        {/* ── Alert ID + Status ─────────────────────────────────────────────── */}
        {!isOffline && (
          <View style={styles.card}>
            <View style={styles.alertIdRow}>
              <View style={styles.alertIdLeft}>
                <Text style={styles.cardLabel}>Alert ID</Text>
                <Text style={styles.alertId}>{displayAlertId}</Text>
              </View>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusBadgeText}>
                  {alertStatus?.resolved ? 'Resolved' : 'Sent'}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Time</Text>
              <Text style={styles.cardValue}>{formatTime(timestamp)}</Text>
            </View>

            {alertStatus?.resolved && (
              <>
                <View style={styles.cardDivider} />
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Status</Text>
                  <Text style={[styles.cardValue, {color: colors.success}]}>Resolved ✓</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Hospital Dispatch Status ─────────────────────────────────────── */}
        {!isOffline && selectedHospital?.name && (
          <View style={styles.card}>
            <View style={styles.cardPadded}>
              <Text style={styles.cardSectionTitle}>Hospital Notified</Text>
            </View>
            <View style={styles.dispatchRow}>
              <View style={styles.dispatchIconWrap}>
                <Text style={{fontSize: 26}}>
                  {selectedHospital.phone === '108' || selectedHospital.type === 'ambulance' ? '🚑' : '🏥'}
                </Text>
              </View>
              <View style={styles.dispatchInfo}>
                <Text style={styles.dispatchName}>{selectedHospital.name}</Text>
                {dispatch?.hospitalNotified
                  ? <Text style={styles.dispatchSent}>✓ Alert dispatched</Text>
                  : <Text style={styles.dispatchPending}>⏳ Dispatch pending</Text>}
              </View>
              <View style={[
                styles.dispatchBadge,
                dispatch?.hospitalNotified ? styles.dispatchBadgeOk : styles.dispatchBadgePending,
              ]}>
                <Text style={[
                  styles.dispatchBadgeText,
                  dispatch?.hospitalNotified ? styles.dispatchBadgeTextOk : styles.dispatchBadgeTextPending,
                ]}>
                  {dispatch?.smsProvider === 'msg91' && dispatch?.hospitalNotified
                    ? 'SMS Sent' : dispatch?.hospitalNotified ? 'Logged' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Location ──────────────────────────────────────────────────────── */}
        {!!(latitude && longitude) && (
          <View style={styles.card}>
            <View style={styles.cardPadded}>
              <Text style={styles.cardSectionTitle}>Accident Location</Text>
              <Text style={styles.coordText}>
                {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewMapRow}
              onPress={() => openInMaps(latitude, longitude)}
              activeOpacity={0.7}>
              <Text style={styles.viewMapIcon}>📍</Text>
              <Text style={styles.viewMapText}>View on Map</Text>
              <Text style={styles.viewMapArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Shared With ───────────────────────────────────────────────────── */}
        {notifiedContacts.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardPadded}>
              <Text style={styles.cardSectionTitle}>Shared With</Text>
            </View>
            {notifiedContacts.map((contact, i) => {
              const name  = typeof contact === 'string' ? contact : (contact?.name ?? 'Contact');
              const phone = typeof contact === 'object'  ? contact?.phone : null;
              return (
                <View key={i}>
                  {i > 0 && <View style={styles.cardDivider} />}
                  <View style={styles.contactRow}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{name}</Text>
                      {!!phone && <Text style={styles.contactPhone}>{phone}</Text>}
                    </View>
                    <View style={styles.sentBadge}>
                      <Text style={styles.sentBadgeText}>Sent</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── No contacts warning ───────────────────────────────────────────── */}
        {notifiedContacts.length === 0 && !isOffline && (
          <View style={styles.noContactCard}>
            <Text style={styles.noContactText}>
              No emergency contacts were saved.{'\n'}
              Add contacts so they're notified next time.
            </Text>
            <TouchableOpacity
              style={styles.addContactBtn}
              onPress={() => navigation.navigate('Contacts')}
              activeOpacity={0.8}>
              <Text style={styles.addContactBtnText}>Add Emergency Contacts</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── How to know if they're coming ────────────────────────────────── */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <Text style={styles.trackingIcon}>ℹ</Text>
            <Text style={styles.trackingTitle}>How to confirm they're coming</Text>
            {!isOffline && (
              <TouchableOpacity
                onPress={refreshStatus}
                disabled={refreshing}
                activeOpacity={0.7}
                style={styles.refreshBtn}>
                {refreshing
                  ? <ActivityIndicator size="small" color="#1D4ED8" />
                  : <Text style={styles.refreshBtnText}>↻ Refresh</Text>}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.trackingStep}>
            <View style={[styles.stepDot, {backgroundColor: colors.success}]} />
            <Text style={styles.stepText}>
              Your emergency contacts received an SMS/call notification
            </Text>
          </View>
          <View style={styles.trackingStep}>
            <View style={[styles.stepDot, {backgroundColor: '#F59E0B'}]} />
            <Text style={styles.stepText}>
              Call them directly below to confirm they're on their way
            </Text>
          </View>
          <View style={styles.trackingStep}>
            <View style={[styles.stepDot, {backgroundColor: colors.primary}]} />
            <Text style={styles.stepText}>
              Tap "Call Emergency (112)" for police/ambulance dispatch
            </Text>
          </View>
        </View>

        {/* ── Call contacts directly ────────────────────────────────────────── */}
        {notifiedContacts.some(c => typeof c === 'object' && c?.phone) && (
          <View style={styles.card}>
            <View style={styles.cardPadded}>
              <Text style={styles.cardSectionTitle}>Call Your Contacts</Text>
            </View>
            {notifiedContacts.filter(c => typeof c === 'object' && c?.phone).map((contact, i) => (
              <View key={i}>
                {i > 0 && <View style={styles.cardDivider} />}
                <TouchableOpacity
                  style={styles.callContactRow}
                  onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                  activeOpacity={0.75}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>
                      {(contact.name ?? 'C').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                  <View style={styles.callIconBtn}>
                    <Text style={styles.callIconText}>📞</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Track Help (HelpOnWay screen) ────────────────────────────────── */}
        {!isOffline && (
          <TouchableOpacity
            style={styles.trackHelpBtn}
            onPress={() => {
              const first = notifiedContacts.find(c => typeof c === 'object' && c?.phone);
              navigation.navigate('HelpOnWay', {
                contactName:  first?.name  ?? '108 Ambulance',
                contactPhone: first?.phone ?? '108',
                etaSeconds:   Math.floor(Math.random() * 180) + 240,
                distanceKm:   (Math.random() * 0.8 + 0.4).toFixed(1),
              });
            }}
            activeOpacity={0.85}>
            <Text style={styles.trackHelpIcon}>🗺</Text>
            <View style={styles.trackHelpInfo}>
              <Text style={styles.trackHelpTitle}>Track Help Live</Text>
              <Text style={styles.trackHelpSub}>See who's coming & estimated arrival</Text>
            </View>
            <Text style={styles.trackHelpArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Call Emergency 112 ────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.callEmergencyBtn}
          onPress={() => Linking.openURL('tel:112')}
          activeOpacity={0.85}>
          <Text style={styles.callEmergencyIcon}>📞</Text>
          <Text style={styles.callEmergencyText}>Call Emergency (112)</Text>
        </TouchableOpacity>

        {/* ── Back to Home ──────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate('MainTabs')}
          activeOpacity={0.75}>
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>

        <View style={{height: 32}} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  scroll:    {paddingBottom: 32},

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 48, paddingBottom: 36,
    paddingHorizontal: 24,
    backgroundColor: colors.successLight,
    gap: 18,
  },
  heroOffline: {backgroundColor: '#FEF3C7'},

  checkCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    elevation: 10,
    shadowColor: colors.success,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  checkCircleOffline: {backgroundColor: '#F59E0B'},
  checkIcon:          {fontSize: 48, color: '#fff'},

  heroTitle:        {fontSize: 28, fontWeight: '900', color: colors.text, textAlign: 'center'},
  heroTitleOffline: {color: '#92400E'},
  heroSub: {
    fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginTop: 4,
  },

  // Card base
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 16,
    marginTop: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardPadded:      {padding: 16, paddingBottom: 4},
  cardDivider:     {height: 1, backgroundColor: colors.divider},
  cardLabel:       {fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5},
  cardValue:       {fontSize: 14, color: colors.text, fontWeight: '600'},
  cardRow:         {padding: 16, gap: 4},
  cardSectionTitle:{fontSize: 14, fontWeight: '800', color: colors.text, paddingBottom: 8},

  // Alert ID
  alertIdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16, paddingBottom: 14,
  },
  alertIdLeft:     {gap: 4},
  alertId:         {fontSize: 18, fontWeight: '900', color: colors.primary, letterSpacing: 0.5},
  statusBadge:     {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.successLight,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusDot:       {width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success},
  statusBadgeText: {fontSize: 12, fontWeight: '800', color: colors.success},

  // Dispatch row
  dispatchRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 16, paddingBottom: 14,
  },
  dispatchIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dispatchInfo:    {flex: 1, gap: 3},
  dispatchName:    {fontSize: 14, fontWeight: '700', color: colors.text},
  dispatchSent:    {fontSize: 12, color: colors.success, fontWeight: '600'},
  dispatchPending: {fontSize: 12, color: '#F59E0B', fontWeight: '600'},
  dispatchBadge:   {borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4},
  dispatchBadgeOk:      {backgroundColor: colors.successLight},
  dispatchBadgePending: {backgroundColor: '#FEF3C7'},
  dispatchBadgeText:    {fontSize: 11, fontWeight: '800'},
  dispatchBadgeTextOk:      {color: colors.success},
  dispatchBadgeTextPending: {color: '#92400E'},

  // Location
  coordText: {
    fontSize: 16, fontWeight: '700', color: colors.text,
    marginBottom: 10,
  },
  viewMapRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, padding: 14,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  viewMapIcon:  {fontSize: 16},
  viewMapText:  {flex: 1, fontSize: 14, color: '#1D4ED8', fontWeight: '700'},
  viewMapArrow: {fontSize: 22, color: colors.textMuted, fontWeight: '300'},

  // Contacts
  contactRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 16, paddingVertical: 14,
  },
  callContactRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 16, paddingVertical: 14,
  },
  contactAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  contactAvatarText: {fontSize: 17, fontWeight: '900', color: colors.primary},
  contactInfo:       {flex: 1, gap: 2},
  contactName:       {fontSize: 14, fontWeight: '700', color: colors.text},
  contactPhone:      {fontSize: 12, color: colors.textSecondary},
  sentBadge:         {
    backgroundColor: colors.successLight,
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3,
  },
  sentBadgeText:     {fontSize: 11, fontWeight: '800', color: colors.success},
  callIconBtn:       {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.successLight,
    alignItems: 'center', justifyContent: 'center',
  },
  callIconText:      {fontSize: 16},

  // No contacts
  noContactCard: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 16, borderWidth: 1, borderColor: '#FDE68A',
    padding: 18, gap: 12, alignItems: 'center',
  },
  noContactText:     {fontSize: 13, color: '#92400E', textAlign: 'center', lineHeight: 21},
  addContactBtn:     {backgroundColor: '#F59E0B', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10},
  addContactBtnText: {color: '#fff', fontWeight: '800', fontSize: 13},

  // Tracking card
  trackingCard: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 16, borderWidth: 1, borderColor: '#BFDBFE',
    padding: 16, gap: 12,
  },
  trackingHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  trackingIcon:  {fontSize: 16, color: '#1D4ED8'},
  trackingTitle: {flex: 1, fontSize: 13, fontWeight: '800', color: '#1E40AF'},
  refreshBtn:    {paddingHorizontal: 8, paddingVertical: 4},
  refreshBtnText:{fontSize: 12, fontWeight: '700', color: '#1D4ED8'},

  trackingStep: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  stepDot:  {width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0},
  stepText: {flex: 1, fontSize: 12, color: '#1E40AF', lineHeight: 18},

  // Track Help button
  trackHelpBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14,
    backgroundColor: '#0D1117',
    borderRadius: 16, borderWidth: 1, borderColor: '#1E3A5F',
    marginHorizontal: 16, marginTop: 16,
    paddingVertical: 16, paddingHorizontal: 18,
    elevation: 4,
    shadowColor: '#3B82F6',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  trackHelpIcon:  {fontSize: 26},
  trackHelpInfo:  {flex: 1, gap: 2},
  trackHelpTitle: {fontSize: 15, fontWeight: '800', color: '#E0F2FE'},
  trackHelpSub:   {fontSize: 11, color: '#64748B'},
  trackHelpArrow: {fontSize: 24, color: '#3B82F6', fontWeight: '300'},

  // Buttons
  callEmergencyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: colors.success, borderRadius: 16,
    marginHorizontal: 16, marginTop: 20, paddingVertical: 18,
    elevation: 6,
    shadowColor: colors.success,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  callEmergencyIcon: {fontSize: 20},
  callEmergencyText: {color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5},

  homeBtn: {
    marginHorizontal: 16, marginTop: 10,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center',
  },
  homeBtnText: {color: colors.textSecondary, fontWeight: '700', fontSize: 14},
});

export default AlertSentScreen;
