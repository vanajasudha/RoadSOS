import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  PermissionsAndroid,
  Platform,
  Animated,
  Vibration,
  BackHandler,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {sendAlert} from '../services/api';
import {useNetwork} from '../context/NetworkContext';
import {saveLastLocation, savePendingAlert, getLastLocation} from '../services/offlineStorage';
import {colors} from '../theme/colors';

const COUNTDOWN_SECONDS = 15;

const requestLocationPermission = async () => {
  if (Platform.OS === 'ios') {
    const auth = await Geolocation.requestAuthorization('whenInUse');
    return auth === 'granted';
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'RoadSOS Location Permission',
      message: 'RoadSOS needs your location to send emergency alerts.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

const CountdownScreen = ({navigation, route}) => {
  const source  = route?.params?.source;
  const isSensor = source === 'sensor';

  const {mode, refreshPendingCount} = useNetwork();

  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [modal,   setModal]   = useState({visible: false, success: false, message: ''});

  const intervalRef = useRef(null);
  const firedRef    = useRef(false);

  const bgPulse  = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isSensor) {
      Vibration.vibrate([0, 300, 100, 300, 100, 300]);

      const bgAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(bgPulse,  {toValue: 1, duration: 600, useNativeDriver: true}),
          Animated.timing(bgPulse,  {toValue: 0, duration: 600, useNativeDriver: true}),
        ]),
      );
      const ringAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(ringPulse, {toValue: 1.06, duration: 500, useNativeDriver: true}),
          Animated.timing(ringPulse, {toValue: 1,    duration: 500, useNativeDriver: true}),
        ]),
      );
      bgAnim.start();
      ringAnim.start();

      return () => {
        bgAnim.stop();
        ringAnim.stop();
        Vibration.cancel();
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          if (!firedRef.current) {
            firedRef.current = true;
            triggerCrashAlert();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intercept hardware back: cancel countdown or close result modal
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modal.visible) {
        handleModalClose();
        return true;
      }
      if (!sending) {
        handleCancel();
        return true;
      }
      return true; // block back while alert is sending
    });
    return () => handler.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal.visible, sending]);

  const handleCancel = () => {
    clearInterval(intervalRef.current);
    Vibration.cancel();
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs');
  };

  const triggerCrashAlert = async () => {
    setSending(true);
    Vibration.cancel();

    const granted = await requestLocationPermission();
    if (!granted) {
      setSending(false);
      setModal({visible: true, success: false, message: 'Location permission denied.\nCould not send crash alert.'});
      return;
    }

    const description = isSensor
      ? 'Automatic crash alert — triggered by motion sensors'
      : 'Automatic crash alert triggered';

    Geolocation.getCurrentPosition(
      async position => {
        const {latitude, longitude} = position.coords;

        // Always persist last known location
        await saveLastLocation(latitude, longitude);

        if (mode === 'offline') {
          // Offline: queue alert locally
          await savePendingAlert({lat: latitude, lng: longitude}, description);
          await refreshPendingCount();
          setSending(false);
          navigation.replace('AlertSent', {
            latitude, longitude,
            notifiedContacts: [],
            timestamp: new Date().toISOString(),
            source: isSensor ? 'sensor' : 'crash',
            isOffline: true,
          });
          return;
        }

        try {
          const res      = await sendAlert({lat: latitude, lng: longitude}, description);
          const notified = res.data.notifiedContacts || [];
          const alertId  = res.data._id ?? res.data.alertId ?? null;
          setSending(false);
          navigation.replace('AlertSent', {
            latitude, longitude,
            notifiedContacts: notified,
            alertId,
            timestamp: new Date().toISOString(),
            source: isSensor ? 'sensor' : 'crash',
            isOffline: false,
          });
        } catch {
          // Network error — queue offline
          await savePendingAlert({lat: latitude, lng: longitude}, description);
          await refreshPendingCount();
          setSending(false);
          navigation.replace('AlertSent', {
            latitude, longitude,
            notifiedContacts: [],
            timestamp: new Date().toISOString(),
            source: isSensor ? 'sensor' : 'crash',
            isOffline: true,
          });
        }
      },
      async error => {
        // GPS failed — try last known location if offline
        if (mode === 'offline') {
          const lastLoc = await getLastLocation();
          if (lastLoc) {
            await savePendingAlert(
              {lat: lastLoc.lat, lng: lastLoc.lng},
              `${description} (last known location)`,
            );
            await refreshPendingCount();
            setSending(false);
            navigation.replace('AlertSent', {
              latitude: lastLoc.lat,
              longitude: lastLoc.lng,
              notifiedContacts: [],
              timestamp: new Date().toISOString(),
              source: isSensor ? 'sensor' : 'crash',
              isOffline: true,
            });
            return;
          }
        }
        setSending(false);
        setModal({visible: true, success: false, message: `Could not get location.\n${error.message}`});
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  };

  const handleModalClose = () => {
    setModal({...modal, visible: false});
    navigation.goBack();
  };

  const ringColor = seconds <= 5 ? '#EF4444' : seconds <= 10 ? '#F97316' : '#FBBF24';

  const bgOpacity = bgPulse.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 0.15],
  });

  return (
    <SafeAreaView style={styles.container}>

      {/* Pulsing red overlay — sensor mode only */}
      {isSensor && (
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.sensorBg, {opacity: bgOpacity}]}
          pointerEvents="none"
        />
      )}

      <View style={styles.content}>

        {/* Icon */}
        <View style={[styles.iconWrap, isSensor && styles.iconWrapSensor]}>
          <Text style={styles.icon}>{isSensor ? '📡' : '⚠'}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isSensor ? 'Crash Detected\nfrom Sensors' : 'Possible Accident\nDetected'}
        </Text>

        {isSensor && (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>📳 Motion sensor · Impact detected</Text>
          </View>
        )}

        <Text style={styles.subtitle}>Are you safe?</Text>

        {/* Countdown ring or sending spinner */}
        {sending ? (
          <View style={styles.sendingWrap}>
            <ActivityIndicator size="large" color="#EF4444" />
            <Text style={styles.sendingText}>
              {mode !== 'offline' ? 'Sending alert...' : 'Saving offline...'}
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.ringWrap,
              {borderColor: ringColor},
              isSensor && {transform: [{scale: ringPulse}]},
            ]}>
            <Text style={[styles.countdownNumber, {color: ringColor}]}>{seconds}</Text>
            <Text style={[styles.countdownLabel,  {color: ringColor}]}>seconds</Text>
          </Animated.View>
        )}

        {/* Info */}
        <Text style={styles.info}>
          {isSensor
            ? 'Motion sensors detected a sudden impact.\nAn emergency alert will be sent automatically.'
            : 'An emergency alert will be sent automatically\nwhen the countdown reaches zero.'}
        </Text>

        {/* Offline notice */}
        {mode === 'offline' && (
          <View style={styles.offlineNote}>
            <Text style={styles.offlineNoteText}>
              📡 Offline: alert will be saved locally and synced when connected.
            </Text>
          </View>
        )}

        {/* Cancel — full width */}
        {!sending && seconds > 0 && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            activeOpacity={0.8}>
            <Text style={styles.cancelText}>I'M SAFE — CANCEL</Text>
          </TouchableOpacity>
        )}

        {/* Sensor status indicators */}
        {isSensor && (
          <View style={styles.sensorRow}>
            <View style={styles.sensorItem}>
              <View style={[styles.sensorDot, {backgroundColor: '#EF4444'}]} />
              <Text style={styles.sensorItemText}>Accelerometer</Text>
            </View>
            <View style={styles.sensorItem}>
              <View style={[styles.sensorDot, {backgroundColor: '#F97316'}]} />
              <Text style={styles.sensorItemText}>Gyroscope</Text>
            </View>
            <View style={styles.sensorItem}>
              <View style={[styles.sensorDot, {backgroundColor: '#10B981'}]} />
              <Text style={styles.sensorItemText}>GPS</Text>
            </View>
          </View>
        )}
      </View>

      {/* Result Modal */}
      <Modal transparent animationType="fade" visible={modal.visible}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIconWrap, modal.success ? styles.iconWrapSuccess : styles.iconWrapError]}>
              <Text style={styles.modalIconText}>{modal.success ? '✓' : '✕'}</Text>
            </View>
            <Text style={styles.modalTitle}>
              {modal.success ? 'Alert Sent!' : 'Something went wrong'}
            </Text>
            <Text style={styles.modalMessage}>{modal.message}</Text>
            <TouchableOpacity
              style={[styles.modalBtn, modal.success ? styles.btnSuccess : styles.btnError]}
              onPress={handleModalClose}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ── (dark bg — this is an emergency overlay screen)
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.darkBg},
  sensorBg:  {backgroundColor: '#FF0000'},

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 20,
  },

  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FBBF2422',
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapSensor: {backgroundColor: '#EF444422'},
  icon: {fontSize: 40},

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 36,
  },

  sourceBadge: {
    backgroundColor: '#EF444422',
    borderWidth: 1,
    borderColor: '#EF444455',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  sourceBadgeText: {color: '#EF4444', fontSize: 12, fontWeight: '700'},

  subtitle: {fontSize: 13, color: '#9CA3AF', letterSpacing: 2, textTransform: 'uppercase'},

  // Countdown ring
  ringWrap: {
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#111827',
  },
  countdownNumber: {fontSize: 70, fontWeight: '900'},
  countdownLabel:  {fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginTop: -4},

  sendingWrap: {width: 180, height: 180, alignItems: 'center', justifyContent: 'center', gap: 16},
  sendingText: {color: '#9CA3AF', fontSize: 14, letterSpacing: 1},

  info: {color: '#9CA3AF', fontSize: 13, textAlign: 'center', lineHeight: 20},

  offlineNote: {
    backgroundColor: '#FBBF2415',
    borderWidth: 1,
    borderColor: '#FBBF2440',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: '100%',
  },
  offlineNoteText: {color: '#FBBF24', fontSize: 12, fontWeight: '600', textAlign: 'center'},

  cancelBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    paddingHorizontal: 0,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  cancelText: {color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 2},

  // Sensor row
  sensorRow: {flexDirection: 'row', gap: 16, marginTop: 4},
  sensorItem: {flexDirection: 'row', alignItems: 'center', gap: 5},
  sensorDot: {width: 8, height: 8, borderRadius: 4},
  sensorItemText: {color: '#6B7280', fontSize: 11, fontWeight: '600'},

  // Modal
  overlay:  {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center'},
  modalBox: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 32,
    width: '82%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalIconWrap:    {width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16},
  iconWrapSuccess:  {backgroundColor: '#10B98122'},
  iconWrapError:    {backgroundColor: '#EF444422'},
  modalIconText:    {fontSize: 32, fontWeight: '900'},
  modalTitle:       {color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 10},
  modalMessage:     {color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24},
  modalBtn:         {paddingVertical: 14, paddingHorizontal: 48, borderRadius: 12},
  btnSuccess:       {backgroundColor: '#10B981'},
  btnError:         {backgroundColor: '#EF4444'},
  modalBtnText:     {color: '#fff', fontWeight: '700', fontSize: 15},
});

export default CountdownScreen;
