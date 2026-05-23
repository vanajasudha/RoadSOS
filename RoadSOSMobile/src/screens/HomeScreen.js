import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Vibration,
} from 'react-native';
import {useNetwork} from '../context/NetworkContext';
import {useAuth} from '../context/AuthContext';
import OfflineBanner from '../components/OfflineBanner';
import {colors} from '../theme/colors';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) {return 'Good Morning';}
  if (h < 17) {return 'Good Afternoon';}
  return 'Good Evening';
};

// ─── Quick action shortcut card ───────────────────────────────────────────────
const ShortcutCard = ({icon, label, sublabel, color, onPress}) => (
  <TouchableOpacity
    style={[styles.shortcut, {borderTopColor: color}]}
    onPress={onPress}
    activeOpacity={0.75}>
    <View style={[styles.shortcutIconWrap, {backgroundColor: color + '18'}]}>
      <Text style={styles.shortcutIcon}>{icon}</Text>
    </View>
    <Text style={styles.shortcutLabel}>{label}</Text>
    <Text style={styles.shortcutSub}>{sublabel}</Text>
  </TouchableOpacity>
);

// ─── Home Screen ──────────────────────────────────────────────────────────────
const HomeScreen = ({navigation}) => {
  const {mode, refreshPendingCount} = useNetwork();
  const {user} = useAuth();

  const firstName = user?.name?.split(' ')[0] ?? '';
  const initial   = user?.name?.charAt(0)?.toUpperCase() ?? '';

  const [modal, setModal] = useState({visible: false, success: false, message: ''});
  const [driveMode, setDriveMode]           = useState(false);
  const [simSecondsLeft, setSimSecondsLeft] = useState(0);
  const [crashFlash, setCrashFlash]         = useState(false);

  const driveModeTimerRef = useRef(null);
  const simIntervalRef    = useRef(null);
  const flashAnim         = useRef(new Animated.Value(0)).current;

  // Live status dot pulse (online only)
  const livePulse   = useRef(new Animated.Value(1)).current;
  const livePulseOp = useRef(new Animated.Value(0.5)).current;

  // SOS pulse rings
  const ring1        = useRef(new Animated.Value(1)).current;
  const ring2        = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Opacity = useRef(new Animated.Value(0.3)).current;

  // SOS rings animation (always running)
  useEffect(() => {
    const r1 = Animated.loop(
      Animated.parallel([
        Animated.timing(ring1, {toValue: 1.55, duration: 1600, useNativeDriver: true}),
        Animated.timing(ring1Opacity, {toValue: 0, duration: 1600, useNativeDriver: true}),
      ]),
    );
    const r2 = Animated.loop(
      Animated.parallel([
        Animated.timing(ring2, {toValue: 1.85, duration: 1600, delay: 500, useNativeDriver: true}),
        Animated.timing(ring2Opacity, {toValue: 0, duration: 1600, delay: 500, useNativeDriver: true}),
      ]),
    );
    r1.start();
    r2.start();
    return () => { r1.stop(); r2.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live status dot sonar pulse (online only)
  useEffect(() => {
    if (mode === 'online') {
      livePulse.setValue(1);
      livePulseOp.setValue(0.5);
      const a = Animated.loop(
        Animated.parallel([
          Animated.timing(livePulse,   {toValue: 2.8, duration: 1400, useNativeDriver: true}),
          Animated.timing(livePulseOp, {toValue: 0,   duration: 1400, useNativeDriver: true}),
        ]),
      );
      a.start();
      return () => a.stop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    return () => {
      clearTimeout(driveModeTimerRef.current);
      clearInterval(simIntervalRef.current);
      Vibration.cancel();
    };
  }, []);

  // ── Drive Mode logic ─────────────────────────────────────────────────────────
  const toggleDriveMode = () => {
    if (driveMode) {
      setDriveMode(false);
      clearTimeout(driveModeTimerRef.current);
      clearInterval(simIntervalRef.current);
      setSimSecondsLeft(0);
      Vibration.cancel();
    } else {
      setDriveMode(true);
      const delaySec = Math.floor(15 + Math.random() * 6);
      setSimSecondsLeft(delaySec);
      Vibration.vibrate([0, 80, 40, 80]);
      simIntervalRef.current = setInterval(() => {
        setSimSecondsLeft(prev => {
          if (prev <= 1) { clearInterval(simIntervalRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
      driveModeTimerRef.current = setTimeout(triggerSimulatedCrash, delaySec * 1000);
    }
  };

  const triggerSimulatedCrash = () => {
    setDriveMode(false);
    clearInterval(simIntervalRef.current);
    Vibration.vibrate([0, 400, 120, 400, 120, 400, 120, 400]);
    setCrashFlash(true);
    Animated.sequence([
      Animated.timing(flashAnim, {toValue: 0.92, duration: 90,  useNativeDriver: true}),
      Animated.timing(flashAnim, {toValue: 0.12, duration: 90,  useNativeDriver: true}),
      Animated.timing(flashAnim, {toValue: 0.92, duration: 90,  useNativeDriver: true}),
      Animated.timing(flashAnim, {toValue: 0.12, duration: 90,  useNativeDriver: true}),
      Animated.timing(flashAnim, {toValue: 0.92, duration: 90,  useNativeDriver: true}),
      Animated.timing(flashAnim, {toValue: 0,    duration: 200, useNativeDriver: true}),
    ]).start(() => {
      setCrashFlash(false);
      flashAnim.setValue(0);
      navigation.navigate('Countdown', {source: 'sensor'});
    });
  };

  // ── SOS → navigate to hospital selection ─────────────────────────────────────
  const handleSOS = () => navigation.navigate('SelectHospital');

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {firstName ? `Stay Safe, ${firstName}` : getGreeting()}
            </Text>
            <Text style={styles.headerTagline}>We're here to help you</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}>
            {initial ? (
              <Text style={styles.avatarInitial}>{initial}</Text>
            ) : (
              <Text style={styles.avatarEmoji}>🚗</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Status pill ── */}
        <View style={[
          styles.statusPill,
          mode === 'offline'  && styles.statusPillOffline,
          mode === 'checking' && styles.statusPillChecking,
        ]}>
          <View style={styles.statusDotWrap}>
            {mode === 'online' && (
              <Animated.View style={[
                styles.statusDotPulse,
                {opacity: livePulseOp, transform: [{scale: livePulse}]},
              ]} />
            )}
            <View style={[
              styles.statusDot,
              mode === 'offline'  && styles.statusDotOffline,
              mode === 'checking' && styles.statusDotChecking,
            ]} />
          </View>
          <Text style={[
            styles.statusText,
            mode === 'offline'  && styles.statusTextOffline,
            mode === 'checking' && styles.statusTextChecking,
          ]}>
            {mode === 'online'   ? 'System Active · GPS Ready' :
             mode === 'checking' ? 'Checking connection...'    :
                                   'Offline · Cached Data'}
          </Text>
        </View>

        {/* ── SOS Button section ── */}
        <View style={styles.sosSection}>
          <View style={styles.sosRingWrap}>
            <Animated.View style={[
              styles.sosRing,
              {transform: [{scale: ring2}], opacity: ring2Opacity},
            ]} />
            <Animated.View style={[
              styles.sosRing,
              {transform: [{scale: ring1}], opacity: ring1Opacity},
            ]} />
              <TouchableOpacity
                style={styles.sosBtn}
                onPress={handleSOS}
                activeOpacity={0.8}>
                <Text style={styles.sosBtnText}>SOS</Text>
                <Text style={styles.sosBtnSub}>TAP FOR EMERGENCY</Text>
              </TouchableOpacity>
          </View>
          <Text style={styles.sosHint}>
            {mode === 'online'
              ? 'Press in case of road emergency'
              : mode === 'checking'
                ? 'Verifying connection...'
                : 'Offline: alert will be saved and synced later'}
          </Text>
        </View>

        {/* ── Drive Mode card ── */}
        <TouchableOpacity
          style={[styles.driveCard, driveMode && styles.driveCardOn]}
          onPress={toggleDriveMode}
          activeOpacity={0.85}>
          <View style={styles.driveLeft}>
            <View style={[styles.driveIconWrap, driveMode && styles.driveIconWrapOn]}>
              <Text style={styles.driveIcon}>🚗</Text>
            </View>
            <View>
              <Text style={[styles.driveLabel, driveMode && styles.driveLabelOn]}>Drive Mode</Text>
              <Text style={[styles.driveSub, driveMode && styles.driveSubOn]}>
                {driveMode
                  ? `Crash detection ON · ${simSecondsLeft}s remaining`
                  : 'Auto crash detection · Tap to enable'}
              </Text>
            </View>
          </View>
          <View style={[styles.toggle, driveMode && styles.toggleOn]}>
            <View style={[styles.toggleThumb, driveMode && styles.toggleThumbOn]} />
          </View>
        </TouchableOpacity>

        {/* ── Quick shortcuts grid ── */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.grid}>
          <ShortcutCard
            icon="📍"
            label="Nearby Help"
            sublabel="Hospitals, Police, Tow"
            color="#4A90D9"
            onPress={() => navigation.navigate('Nearby')}
          />
          <ShortcutCard
            icon="📞"
            label="Emergency Numbers"
            sublabel="100, 108, 101..."
            color="#FF3B30"
            onPress={() => navigation.navigate('Numbers')}
          />
          <ShortcutCard
            icon="👤"
            label="My Contacts"
            sublabel="Emergency contacts"
            color="#8B5CF6"
            onPress={() => navigation.navigate('Contacts')}
          />
          <ShortcutCard
            icon="🏥"
            label="Medical QR"
            sublabel="Health info card"
            color="#00BFA5"
            onPress={() => navigation.navigate('MedicalQR')}
          />
        </View>

        {/* ── Test Crash Detection (subtle secondary) ── */}
        <TouchableOpacity
          style={styles.simCrashBtn}
          onPress={() => navigation.navigate('Countdown', {source: 'manual'})}
          activeOpacity={0.75}>
          <View style={styles.simCrashIconWrap}>
            <Text style={styles.simCrashIcon}>⚠</Text>
          </View>
          <View style={styles.simCrashInfo}>
            <Text style={styles.simCrashLabel}>Test Crash Detection</Text>
            <Text style={styles.simCrashSub}>Preview the emergency alert flow</Text>
          </View>
          <Text style={styles.simCrashChevron}>›</Text>
        </TouchableOpacity>

        {/* ── Footer note ── */}
        <Text style={styles.footer}>
          Your GPS location is shared only when an emergency alert is triggered
        </Text>
        <View style={{height: 24}} />
      </ScrollView>

      {/* ── SOS Result Modal ── */}
      <Modal transparent animationType="fade" visible={modal.visible}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIconWrap, modal.success ? styles.modalIconWrapSuccess : styles.modalIconWrapError]}>
              <Text style={styles.modalIconText}>{modal.success ? '✓' : '✕'}</Text>
            </View>
            <Text style={styles.modalTitle}>
              {modal.success ? 'Alert Sent!' : 'Something went wrong'}
            </Text>
            <Text style={styles.modalMessage}>{modal.message}</Text>
            <TouchableOpacity
              style={[styles.modalBtn, modal.success ? styles.modalBtnSuccess : styles.modalBtnError]}
              onPress={() => setModal({...modal, visible: false})}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Crash flash overlay ── */}
      {crashFlash && (
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.crashOverlay, {opacity: flashAnim}]}
          pointerEvents="none">
          <Text style={styles.crashOverlayIcon}>⚠</Text>
          <Text style={styles.crashOverlayTitle}>IMPACT DETECTED</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  scroll:    {paddingBottom: 16},

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerLeft:    {flex: 1},
  greeting:      {fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: 0.2},
  headerTagline: {fontSize: 13, color: colors.textSecondary, marginTop: 3},
  avatarWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.primary + '22',
  },
  avatarInitial: {fontSize: 18, fontWeight: '900', color: colors.primary},
  avatarEmoji:   {fontSize: 22},

  // Status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.successLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 7,
    marginBottom: 8,
  },
  statusPillOffline:  {backgroundColor: '#FEF3C7'},
  statusPillChecking: {backgroundColor: '#EFF6FF'},

  statusDotWrap: {
    width: 8, height: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  statusDotPulse: {
    position: 'absolute',
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusDot:          {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success},
  statusDotOffline:   {backgroundColor: '#F59E0B'},
  statusDotChecking:  {backgroundColor: '#1D4ED8'},
  statusText:         {fontSize: 12, color: colors.success, fontWeight: '600'},
  statusTextOffline:  {color: '#92400E'},
  statusTextChecking: {color: '#1D4ED8'},

  // SOS section
  sosSection: {alignItems: 'center', paddingVertical: 28},
  sosRingWrap: {
    width: 220, height: 220,
    alignItems: 'center', justifyContent: 'center',
  },
  sosRing: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: colors.primary,
  },
  sosBtn: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 12,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  sosBtnLoading:     {backgroundColor: colors.textSecondary},
  sosBtnLoadingText: {color: '#fff', fontSize: 12, marginTop: 8},
  sosBtnText:        {color: '#FFFFFF', fontSize: 48, fontWeight: '900', letterSpacing: 2},
  sosBtnSub:         {color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 2},
  sosHint:           {marginTop: 20, fontSize: 13, color: colors.textSecondary, textAlign: 'center'},

  // Drive Mode
  driveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  driveCardOn: {
    borderColor: colors.driveGreen,
    backgroundColor: colors.driveGreenLight,
  },
  driveLeft:       {flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1},
  driveIconWrap:   {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  driveIconWrapOn: {backgroundColor: colors.driveGreen + '22'},
  driveIcon:       {fontSize: 24},
  driveLabel:      {fontSize: 15, fontWeight: '700', color: colors.text},
  driveLabelOn:    {color: colors.driveGreen},
  driveSub:        {fontSize: 11, color: colors.textSecondary, marginTop: 2},
  driveSubOn:      {color: colors.driveGreen},

  toggle: {
    width: 48, height: 26, borderRadius: 13,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn:    {backgroundColor: colors.driveGreen},
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  toggleThumbOn: {alignSelf: 'flex-end'},

  // Shortcuts grid
  sectionTitle: {
    fontSize: 16, fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 12,
    marginBottom: 20,
  },
  shortcut: {
    width: '46.5%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderTopWidth: 3,
    padding: 16, gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  shortcutIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  shortcutIcon:  {fontSize: 24},
  shortcutLabel: {fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 2},
  shortcutSub:   {fontSize: 11, color: colors.textSecondary, lineHeight: 15},

  // Test Crash Detection — subtle secondary row
  simCrashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  simCrashIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.warningLight,
    alignItems: 'center', justifyContent: 'center',
  },
  simCrashIcon:    {fontSize: 18},
  simCrashInfo:    {flex: 1},
  simCrashLabel:   {fontSize: 14, fontWeight: '700', color: colors.text},
  simCrashSub:     {fontSize: 11, color: colors.textSecondary, marginTop: 1},
  simCrashChevron: {fontSize: 22, color: colors.textMuted, fontWeight: '300'},

  // Footer
  footer: {
    fontSize: 11, color: colors.textMuted,
    textAlign: 'center', lineHeight: 17,
    paddingHorizontal: 32, marginBottom: 4,
  },

  // Modal
  overlay:  {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center'},
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: 24, padding: 32,
    width: '82%', alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  modalIconWrap:        {width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16},
  modalIconWrapSuccess: {backgroundColor: colors.successLight},
  modalIconWrapError:   {backgroundColor: colors.primaryLight},
  modalIconText:        {fontSize: 32, fontWeight: '900'},
  modalTitle:    {fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8},
  modalMessage:  {fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24},
  modalBtn:      {paddingVertical: 14, paddingHorizontal: 48, borderRadius: 12},
  modalBtnSuccess: {backgroundColor: colors.success},
  modalBtnError:   {backgroundColor: colors.error},
  modalBtnText:  {color: '#fff', fontWeight: '700', fontSize: 15},

  // Crash overlay
  crashOverlay: {
    backgroundColor: '#FF0000',
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  crashOverlayIcon:  {fontSize: 72, color: '#fff'},
  crashOverlayTitle: {fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 3},
});

export default HomeScreen;
