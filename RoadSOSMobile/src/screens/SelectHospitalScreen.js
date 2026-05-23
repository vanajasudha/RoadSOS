import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
  BackHandler,
  PermissionsAndroid,
  Platform,
  Animated,
  Linking,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {getNearbyServices, sendAlert} from '../services/api';
import {useNetwork} from '../context/NetworkContext';
import {saveLastLocation, savePendingAlert, getLastLocation} from '../services/offlineStorage';
import {colors} from '../theme/colors';

const HOSPITAL_TYPES = new Set(['ambulance', 'hospital']);

const requestLocationPermission = async () => {
  if (Platform.OS === 'ios') {
    const auth = await Geolocation.requestAuthorization('whenInUse');
    return auth === 'granted';
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title:          'RoadSOS Location Permission',
      message:        'RoadSOS needs your location to find nearby hospitals.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

const parseDistKm = dist => {
  if (!dist) {return 0.8;}
  const n = parseFloat(dist);
  if (isNaN(n)) {return 0.8;}
  if (dist.toLowerCase().includes('km')) {return parseFloat(n.toFixed(1));}
  return parseFloat((n / 1000).toFixed(1));
};

const FALLBACK_HOSPITALS = [
  {id: 'fb_108', name: '108 Ambulance Service',  phone: '108', type: 'ambulance',
   distance: 'National', address: 'National Emergency Ambulance — Always available'},
  {id: 'fb_112', name: '112 National Emergency', phone: '112', type: 'hospital',
   distance: 'National', address: 'Unified Emergency Number — Police / Fire / Medical'},
];

// ── Main screen ───────────────────────────────────────────────────────────────
const SelectHospitalScreen = ({navigation}) => {
  const {mode, refreshPendingCount} = useNetwork();

  const [phase,       setPhase]       = useState('loading'); // 'loading' | 'list' | 'error'
  const [hospitals,   setHospitals]   = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingMsg,  setLoadingMsg]  = useState('Getting your location…');
  const [sending,     setSending]     = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing loading ring
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1.12, duration: 900, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 1,    duration: 900, useNativeDriver: true}),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back handler
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sending) {return true;}
      navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs');
      return true;
    });
    return () => handler.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending]);

  // Init: get location then fetch hospitals
  useEffect(() => {
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) {
        setPhase('error');
        return;
      }
      Geolocation.getCurrentPosition(
        async pos => {
          const {latitude: lat, longitude: lng} = pos.coords;
          await saveLastLocation(lat, lng);
          setUserLocation({lat, lng});
          setLoadingMsg('Finding nearby hospitals…');
          fetchHospitals(lat, lng);
        },
        async () => {
          const last = await getLastLocation();
          if (last) {
            setUserLocation(last);
            setLoadingMsg('Using last known location…');
            fetchHospitals(last.lat, last.lng);
          } else {
            setPhase('error');
          }
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHospitals = async (lat, lng) => {
    try {
      const res  = await getNearbyServices(lat, lng);
      const list = (res.data.data || []).filter(s => HOSPITAL_TYPES.has(s.type));
      const final = list.length > 0 ? list : FALLBACK_HOSPITALS;
      setHospitals(final);
      setSelected(final[0]);
    } catch {
      setHospitals(FALLBACK_HOSPITALS);
      setSelected(FALLBACK_HOSPITALS[0]);
    } finally {
      setPhase('list');
      Animated.timing(fadeAnim, {toValue: 1, duration: 350, useNativeDriver: true}).start();
    }
  };

  // ── Send alert ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    setConfirmVisible(false);
    setSending(true);

    if (!userLocation) {setSending(false); return;}
    const {lat, lng} = userLocation;

    if (mode === 'offline') {
      await savePendingAlert({lat, lng}, 'Emergency SOS triggered');
      await refreshPendingCount();
      setSending(false);
      navigation.replace('AlertSent', {
        latitude: lat, longitude: lng,
        notifiedContacts: [], timestamp: new Date().toISOString(),
        source: 'sos', isOffline: true, selectedHospital: selected,
      });
      return;
    }

    try {
      const res      = await sendAlert({lat, lng}, 'Emergency SOS triggered', selected);
      const notified = res.data.notifiedContacts || [];
      const alertId  = res.data.data?._id ?? res.data._id ?? null;
      const dispatch = res.data.dispatch ?? null;
      setSending(false);
      navigation.replace('AlertSent', {
        latitude: lat, longitude: lng,
        notifiedContacts: notified, alertId,
        timestamp: new Date().toISOString(),
        source: 'sos', isOffline: false,
        selectedHospital: selected, dispatch,
      });
    } catch {
      await savePendingAlert({lat, lng}, 'Emergency SOS triggered');
      await refreshPendingCount();
      setSending(false);
      navigation.replace('AlertSent', {
        latitude: lat, longitude: lng,
        notifiedContacts: [], timestamp: new Date().toISOString(),
        source: 'sos', isOffline: true, selectedHospital: selected,
      });
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <Animated.View style={[styles.loadingRing, {transform: [{scale: pulseAnim}]}]}>
            <Text style={styles.loadingEmoji}>🏥</Text>
          </Animated.View>
          <Text style={styles.loadingTitle}>{loadingMsg}</Text>
          <Text style={styles.loadingSubtitle}>Finding emergency hospitals near you</Text>
          <ActivityIndicator color={colors.primary} size="large" style={{marginTop: 28}} />
        </View>
        <TouchableOpacity
          style={styles.cancelLink}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}>
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <Text style={styles.errorEmoji}>⚠</Text>
          <Text style={styles.loadingTitle}>Location unavailable</Text>
          <Text style={styles.loadingSubtitle}>
            Cannot get your position.{'\n'}Please call 112 directly.
          </Text>
          <TouchableOpacity
            style={styles.call112Btn}
            onPress={() => Linking.openURL('tel:112')}
            activeOpacity={0.85}>
            <Text style={styles.call112Text}>📞  Call 112 Now</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.cancelLink}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}>
          <Text style={styles.cancelLinkText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Hospital list ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}
          disabled={sending}
          activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Select Hospital</Text>
          <Text style={styles.headerSub}>{hospitals.length} emergency service{hospitals.length !== 1 ? 's' : ''} found</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Urgency banner */}
      <View style={styles.urgencyBanner}>
        <Text style={styles.urgencyIcon}>🚨</Text>
        <Text style={styles.urgencyText}>
          Nearest hospital auto-selected. Review and confirm to dispatch.
        </Text>
      </View>

      {/* Offline notice */}
      {mode === 'offline' && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineIcon}>📶</Text>
          <Text style={styles.offlineText}>
            Offline — alert will be saved and synced when connected.
          </Text>
        </View>
      )}

      {/* Hospital list */}
      <Animated.ScrollView
        style={{opacity: fadeAnim}}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {hospitals.map((h, i) => {
          const isSelected = selected?.id === h.id || selected?.name === h.name;
          const isNearest  = i === 0;
          const distKm     = parseDistKm(h.distance);
          const urgColor   = distKm < 0.5 ? '#10B981' : distKm < 2 ? '#F59E0B' : '#4A90D9';
          const typeIcon   = h.type === 'ambulance' ? '🚑' : '🏥';

          return (
            <TouchableOpacity
              key={h.id ?? i}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelected(h)}
              activeOpacity={0.8}>

              {/* Left: radio circle */}
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>

              {/* Icon */}
              <View style={[styles.iconWrap, {backgroundColor: isSelected ? '#FEE2E2' : colors.surfaceAlt}]}>
                <Text style={styles.iconText}>{typeIcon}</Text>
              </View>

              {/* Info */}
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.hospitalName} numberOfLines={1}>{h.name}</Text>
                  {isNearest && (
                    <View style={styles.nearestBadge}>
                      <Text style={styles.nearestText}>NEAREST</Text>
                    </View>
                  )}
                </View>
                {!!h.address && (
                  <Text style={styles.address} numberOfLines={1}>{h.address}</Text>
                )}
                <View style={styles.metaRow}>
                  <View style={[styles.distBadge, {backgroundColor: urgColor + '18'}]}>
                    <Text style={[styles.distText, {color: urgColor}]}>
                      📍 {h.distance || 'National'}
                    </Text>
                  </View>
                  <View style={styles.availBadge}>
                    <View style={styles.availDot} />
                    <Text style={styles.availText}>24/7 Emergency</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{height: 140}} />
      </Animated.ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {!!selected && (
          <View style={styles.selectedPreview}>
            <Text style={styles.selectedLabel}>Sending to:</Text>
            <Text style={styles.selectedName} numberOfLines={1}>{selected.name}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.sendBtn, (!selected || sending) && styles.sendBtnDisabled]}
          onPress={() => setConfirmVisible(true)}
          disabled={!selected || sending}
          activeOpacity={0.85}>
          {sending
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={styles.sendBtnIcon}>🚨</Text>
                <Text style={styles.sendBtnText}>Send Emergency Alert</Text>
              </>}
        </TouchableOpacity>
      </View>

      {/* Confirmation modal */}
      <Modal transparent animationType="fade" visible={confirmVisible} onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>

            <View style={styles.modalIconRing}>
              <Text style={{fontSize: 34}}>🚨</Text>
            </View>

            <Text style={styles.modalTitle}>Confirm Emergency Alert</Text>
            <Text style={styles.modalSub}>
              Your GPS location will be sent immediately to:
            </Text>

            <View style={styles.modalHospitalRow}>
              <Text style={{fontSize: 22}}>
                {selected?.type === 'ambulance' ? '🚑' : '🏥'}
              </Text>
              <View style={{flex: 1}}>
                <Text style={styles.modalHospitalName}>{selected?.name}</Text>
                <Text style={styles.modalHospitalDist}>
                  {selected?.distance || 'National Emergency'}
                </Text>
              </View>
            </View>

            <Text style={styles.modalNote}>
              + Your saved emergency contacts will also be notified
            </Text>

            <TouchableOpacity style={styles.modalSendBtn} onPress={handleSend} activeOpacity={0.85}>
              <Text style={styles.modalSendText}>Send Alert Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setConfirmVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},

  // Loading / error state
  loadingWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 14,
  },
  loadingRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  loadingEmoji:    {fontSize: 46},
  errorEmoji:      {fontSize: 52, marginBottom: 8},
  loadingTitle:    {fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center'},
  loadingSubtitle: {fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20},
  call112Btn: {
    marginTop: 8, backgroundColor: colors.primary,
    paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14,
  },
  call112Text: {color: '#fff', fontWeight: '800', fontSize: 15},
  cancelLink:  {paddingBottom: 28, alignItems: 'center'},
  cancelLinkText: {fontSize: 14, color: colors.textSecondary, fontWeight: '600'},

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn:      {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  backBtnText:  {fontSize: 32, color: colors.text, lineHeight: 36},
  headerCenter: {flex: 1, alignItems: 'center'},
  headerTitle:  {fontSize: 17, fontWeight: '900', color: colors.text},
  headerSub:    {fontSize: 11, color: colors.textSecondary, marginTop: 2},
  headerSpacer: {width: 40},

  // Banners
  urgencyBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1, borderBottomColor: '#FDE68A',
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  urgencyIcon: {fontSize: 16},
  urgencyText: {flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 18},

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1, borderBottomColor: '#BFDBFE',
    paddingHorizontal: 16, paddingVertical: 8, gap: 8,
  },
  offlineIcon: {fontSize: 14},
  offlineText: {flex: 1, fontSize: 11, color: '#1E40AF', fontWeight: '600'},

  // List
  scroll: {paddingHorizontal: 16, paddingTop: 14},

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16, borderWidth: 1.5, borderColor: colors.border,
    padding: 14, marginBottom: 10, gap: 12,
    elevation: 2,
    shadowColor: '#000', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF5F5',
    elevation: 5,
    shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 8,
  },

  // Radio button
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: {borderColor: colors.primary},
  radioDot: {
    width: 11, height: 11, borderRadius: 5.5,
    backgroundColor: colors.primary,
  },

  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconText: {fontSize: 26},

  cardInfo: {flex: 1, gap: 4},
  nameRow:  {flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'},
  hospitalName: {fontSize: 14, fontWeight: '800', color: colors.text, flexShrink: 1},
  nearestBadge: {
    backgroundColor: colors.primary, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  nearestText: {color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5},
  address: {fontSize: 11, color: colors.textSecondary, lineHeight: 16},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2},
  distBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, flexShrink: 0,
  },
  distText: {fontSize: 11, fontWeight: '700'},
  availBadge: {flexDirection: 'row', alignItems: 'center', gap: 4},
  availDot:   {width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981'},
  availText:  {fontSize: 11, color: '#10B981', fontWeight: '700'},

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24,
    gap: 8,
    elevation: 16,
    shadowColor: '#000', shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.08, shadowRadius: 12,
  },
  selectedPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 4,
  },
  selectedLabel: {fontSize: 12, color: colors.textMuted, fontWeight: '600'},
  selectedName:  {flex: 1, fontSize: 13, fontWeight: '800', color: colors.text},
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: colors.primary,
    borderRadius: 16, paddingVertical: 17,
    elevation: 8, shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 12,
  },
  sendBtnDisabled: {backgroundColor: colors.textMuted, elevation: 0, shadowOpacity: 0},
  sendBtnIcon: {fontSize: 20},
  sendBtnText: {color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5},

  // Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: colors.surface, borderRadius: 24,
    padding: 28, width: '88%', alignItems: 'center',
    elevation: 24,
    shadowColor: '#000', shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2, shadowRadius: 20,
  },
  modalIconRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: {fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 6},
  modalSub:   {fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 16},
  modalHospitalRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, backgroundColor: colors.surfaceAlt,
    borderRadius: 14, padding: 14, width: '100%', marginBottom: 12,
  },
  modalHospitalName: {fontSize: 15, fontWeight: '800', color: colors.text},
  modalHospitalDist: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  modalNote: {
    fontSize: 12, color: colors.textSecondary,
    textAlign: 'center', marginBottom: 20, lineHeight: 18,
  },
  modalSendBtn: {
    width: '100%', backgroundColor: colors.primary,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 10,
    elevation: 4, shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.35, shadowRadius: 8,
  },
  modalSendText:   {color: '#fff', fontSize: 16, fontWeight: '900'},
  modalCancelBtn:  {paddingVertical: 10},
  modalCancelText: {fontSize: 14, color: colors.textSecondary, fontWeight: '600'},
});

export default SelectHospitalScreen;
