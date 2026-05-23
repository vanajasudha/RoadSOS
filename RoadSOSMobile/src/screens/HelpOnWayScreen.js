import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  BackHandler,
  Linking,
} from 'react-native';
import {colors} from '../theme/colors';

const MAP_H = 270;

const HelpOnWayScreen = ({navigation, route}) => {
  const {
    contactName  = '108 Ambulance',
    contactPhone = '108',
    etaSeconds   = 320,
    distanceKm   = 0.8,
  } = route.params ?? {};

  const [eta,    setEta]    = useState(etaSeconds);
  const [status, setStatus] = useState('En route');

  const ambulanceX = useRef(new Animated.Value(0.15)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Op    = useRef(new Animated.Value(0.7)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Op    = useRef(new Animated.Value(0.7)).current;
  const cardY      = useRef(new Animated.Value(80)).current;
  const cardOp     = useRef(new Animated.Value(0)).current;
  const liveDotOp  = useRef(new Animated.Value(1)).current;
  const glowOp     = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Card entrance
    Animated.parallel([
      Animated.timing(cardY,  {toValue: 0,   duration: 480, useNativeDriver: true}),
      Animated.timing(cardOp, {toValue: 1,   duration: 480, useNativeDriver: true}),
    ]).start();

    // Ambulance movement — loops forward then reset
    Animated.loop(
      Animated.sequence([
        Animated.timing(ambulanceX, {
          toValue: 0.84,
          duration: 5500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ambulanceX, {
          toValue: 0.18,
          duration: 3200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Destination pulse ring 1
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ring1Scale, {toValue: 3,   duration: 1600, useNativeDriver: true}),
          Animated.timing(ring1Op,   {toValue: 0,   duration: 1600, useNativeDriver: true}),
        ]),
        Animated.parallel([
          Animated.timing(ring1Scale, {toValue: 1,   duration: 0,    useNativeDriver: true}),
          Animated.timing(ring1Op,   {toValue: 0.7, duration: 0,    useNativeDriver: true}),
        ]),
      ]),
    ).start();

    // Destination pulse ring 2 — offset by 800 ms
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ring2Scale, {toValue: 3,   duration: 1600, useNativeDriver: true}),
            Animated.timing(ring2Op,   {toValue: 0,   duration: 1600, useNativeDriver: true}),
          ]),
          Animated.parallel([
            Animated.timing(ring2Scale, {toValue: 1,   duration: 0,    useNativeDriver: true}),
            Animated.timing(ring2Op,   {toValue: 0.7, duration: 0,    useNativeDriver: true}),
          ]),
        ]),
      ).start();
    }, 800);

    // Live dot blink
    Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotOp, {toValue: 0.15, duration: 550, useNativeDriver: true}),
        Animated.timing(liveDotOp, {toValue: 1,    duration: 550, useNativeDriver: true}),
      ]),
    ).start();

    // Ambulance glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOp, {toValue: 1,   duration: 800, useNativeDriver: true}),
        Animated.timing(glowOp, {toValue: 0.3, duration: 800, useNativeDriver: true}),
      ]),
    ).start();

    // ETA countdown
    const timer = setInterval(() => {
      setEta(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('Arrived');
          return 0;
        }
        const next = prev - 1;
        if (next <= 60) {setStatus('Arriving soon');}
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.navigate('MainTabs');
      return true;
    });
    return () => handler.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatEta = secs => {
    if (secs <= 0) {return 'Now';}
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
  };

  const ambulanceTranslateX = ambulanceX.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 80],
  });

  const statusColor =
    status === 'Arrived'       ? '#10B981' :
    status === 'Arriving soon' ? '#F59E0B' : '#3B82F6';

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Map area ────────────────────────────────────────────────────── */}
      <View style={styles.mapArea}>

        {/* Faint grid */}
        {[40, 90, 140, 190, 240].map(top => (
          <View key={`h${top}`} style={[styles.grid, {top, left: 0, right: 0, height: 1}]} />
        ))}
        {['15%', '30%', '45%', '60%', '75%', '90%'].map(left => (
          <View key={`v${left}`} style={[styles.grid, {left, top: 0, bottom: 0, width: 1}]} />
        ))}

        {/* Route line (grey) */}
        <View style={styles.routeLine} />

        {/* Origin dot */}
        <View style={styles.originDot} />

        {/* Ambulance */}
        <Animated.View style={[styles.ambulanceWrap, {transform: [{translateX: ambulanceTranslateX}]}]}>
          <Animated.View style={[styles.ambulanceGlow, {opacity: glowOp}]} />
          <View style={styles.ambulanceBubble}>
            <Text style={styles.ambulanceEmoji}>🚑</Text>
          </View>
          <View style={styles.ambulanceStem} />
        </Animated.View>

        {/* Destination rings */}
        <View style={styles.destinationWrap}>
          <Animated.View style={[styles.ring, {transform: [{scale: ring1Scale}], opacity: ring1Op}]} />
          <Animated.View style={[styles.ring, {transform: [{scale: ring2Scale}], opacity: ring2Op}]} />
          <View style={styles.destPin}>
            <View style={styles.destPinInner} />
          </View>
        </View>

        {/* Live badge */}
        <View style={styles.liveBadge}>
          <Animated.View style={[styles.liveDot, {opacity: liveDotOp}]} />
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>

        {/* ETA floating tag */}
        <View style={styles.etaTag}>
          <Text style={styles.etaTagText}>{formatEta(eta)}</Text>
        </View>
      </View>

      {/* ── Bottom card ─────────────────────────────────────────────────── */}
      <Animated.View style={[styles.card, {transform: [{translateY: cardY}], opacity: cardOp}]}>
        <View style={styles.cardHandle} />

        <Text style={styles.headline}>Help is on the way!</Text>
        <Text style={styles.subline}>Stay calm, we will reach you soon.</Text>

        {/* Service row */}
        <View style={styles.serviceRow}>
          <View style={styles.serviceIcon}>
            <Text style={{fontSize: 28}}>🚑</Text>
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{contactName}</Text>
            <Text style={[styles.serviceStatus, {color: statusColor}]}>{status}</Text>
          </View>
          <View style={[styles.etaBadge, {backgroundColor: statusColor + '20', borderColor: statusColor + '40'}]}>
            <Text style={[styles.etaBadgeText, {color: statusColor}]}>{formatEta(eta)}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, {color: statusColor}]}>{formatEta(eta)}</Text>
            <Text style={styles.statLabel}>ETA</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{distanceKm} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, {color: statusColor, fontSize: 11}]}>{status}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {/* Call button */}
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL(`tel:${contactPhone}`)}
          activeOpacity={0.85}>
          <Text style={styles.callBtnIcon}>📞</Text>
          <Text style={styles.callBtnText}>Call {contactName}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate('MainTabs')}
          activeOpacity={0.75}>
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </Animated.View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0D1117'},

  // Map
  mapArea: {
    height: MAP_H,
    backgroundColor: '#0D1117',
    overflow: 'hidden',
  },
  grid: {position: 'absolute', backgroundColor: 'rgba(255,255,255,0.035)'},

  routeLine: {
    position: 'absolute',
    top: MAP_H / 2,
    left: '11%',
    right: '18%',
    height: 3,
    backgroundColor: 'rgba(148,163,184,0.25)',
    borderRadius: 2,
  },

  originDot: {
    position: 'absolute',
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#3B82F6',
    borderWidth: 2.5, borderColor: '#1D4ED8',
    top: MAP_H / 2 - 7,
    left: '10%',
    elevation: 4,
  },

  // Ambulance
  ambulanceWrap: {
    position: 'absolute',
    top: MAP_H / 2 - 36,
    left: '50%',
    alignItems: 'center',
  },
  ambulanceGlow: {
    position: 'absolute',
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#3B82F6',
    top: -9,
  },
  ambulanceBubble: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#1E3A5F',
    borderWidth: 2, borderColor: '#3B82F6',
    alignItems: 'center', justifyContent: 'center',
    elevation: 10,
    shadowColor: '#3B82F6',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 14,
  },
  ambulanceEmoji: {fontSize: 28},
  ambulanceStem:  {width: 2, height: 8, backgroundColor: '#3B82F6', borderRadius: 1, marginTop: 2},

  // Destination
  destinationWrap: {
    position: 'absolute',
    top: MAP_H / 2 - 26,
    right: '13%',
    width: 52, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: '#10B981',
  },
  destPin: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  destPinInner: {width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff'},

  // Map overlays
  liveBadge: {
    position: 'absolute',
    top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)',
  },
  liveDot:       {width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981'},
  liveBadgeText: {color: '#10B981', fontSize: 11, fontWeight: '900', letterSpacing: 1.5},

  etaTag: {
    position: 'absolute',
    top: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)',
  },
  etaTagText: {color: '#93C5FD', fontSize: 13, fontWeight: '900'},

  // Bottom card
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 20,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -8},
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  cardHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginBottom: 18,
  },

  headline: {fontSize: 22, fontWeight: '900', color: '#0F172A', textAlign: 'center'},
  subline:  {fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 14},

  // Service row
  serviceRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16, padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  serviceIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  serviceInfo:   {flex: 1, gap: 3},
  serviceName:   {fontSize: 15, fontWeight: '800', color: '#0F172A'},
  serviceStatus: {fontSize: 12, fontWeight: '700'},
  etaBadge: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', minWidth: 60,
  },
  etaBadgeText: {fontSize: 13, fontWeight: '900'},

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 18, overflow: 'hidden',
  },
  statBox:     {flex: 1, alignItems: 'center', paddingVertical: 13, gap: 3},
  statValue:   {fontSize: 15, fontWeight: '900', color: '#0F172A'},
  statLabel:   {fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8},
  statDivider: {width: 1, backgroundColor: '#E2E8F0'},

  // Buttons
  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#10B981',
    borderRadius: 16, paddingVertical: 16,
    marginBottom: 10,
    elevation: 6,
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  callBtnIcon: {fontSize: 20},
  callBtnText: {color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5},

  homeBtn: {
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  homeBtnText: {color: '#94A3B8', fontWeight: '700', fontSize: 14},
});

export default HelpOnWayScreen;
