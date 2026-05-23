import React, {useState, useCallback, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import {getNearbyServices} from '../services/api';
import {colors} from '../theme/colors';

const CACHE_KEY = '@roadsos_nearby_cache';

const CATEGORIES = [
  {type: 'ambulance', label: 'Ambulance', icon: '🚑', color: '#FF3B30'},
  {type: 'hospital',  label: 'Hospitals', icon: '🏥', color: '#FF6B6B'},
  {type: 'police',    label: 'Police',    icon: '🚔', color: '#4A90D9'},
  {type: 'tow_truck', label: 'Towing',    icon: '🚗', color: '#FF8C00'},
  {type: 'mechanic',  label: 'Mechanics', icon: '🔧', color: '#8E8E93'},
];

// ── Permissions ───────────────────────────────────────────────────────────────
const requestLocationPermission = async () => {
  if (Platform.OS === 'ios') {
    const auth = await Geolocation.requestAuthorization('whenInUse');
    return auth === 'granted';
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title:          'RoadSOS Location Permission',
      message:        'RoadSOS needs your location to find nearby services.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

// ── Maps helper ───────────────────────────────────────────────────────────────
const openInMaps = (lat, lng, name) => {
  const label       = encodeURIComponent(name);
  const geoUri      = Platform.OS === 'ios'
    ? `maps:?q=${label}&ll=${lat},${lng}`
    : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
  const webFallback = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  Linking.canOpenURL(geoUri)
    .then(supported => Linking.openURL(supported ? geoUri : webFallback))
    .catch(() => Linking.openURL(webFallback));
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseDistKm = dist => {
  if (!dist) {return 0.8;}
  const n = parseFloat(dist);
  if (isNaN(n)) {return 0.8;}
  if (dist.toLowerCase().includes('km')) {return parseFloat(n.toFixed(1));}
  return parseFloat((n / 1000).toFixed(1));
};
const calcEtaSecs = distKm => Math.max(120, Math.round(distKm * 240));

// ── Service row (vertical list item) ─────────────────────────────────────────
const ServiceRow = ({service, onTrack}) => {
  const cat     = CATEGORIES.find(c => c.type === service.type) ?? CATEGORIES[1];
  const hasPhone = !!service.phone;
  const hasMaps  = !!(service.lat && service.lng);

  return (
    <View style={styles.serviceRow}>
      <View style={[styles.serviceIconBox, {backgroundColor: cat.color + '18'}]}>
        <Text style={styles.serviceIconText}>{cat.icon}</Text>
      </View>

      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName} numberOfLines={1}>{service.name}</Text>
        {!!service.address && (
          <Text style={styles.serviceAddress} numberOfLines={1}>{service.address}</Text>
        )}
        <View style={[styles.serviceDistBadge, {backgroundColor: cat.color + '15'}]}>
          <Text style={[styles.serviceDistText, {color: cat.color}]}>
            📍 {service.distance}
          </Text>
        </View>
      </View>

      <View style={styles.serviceActions}>
        {hasPhone && (
          <TouchableOpacity
            style={[styles.serviceActionBtn, {backgroundColor: cat.color}]}
            onPress={() => Linking.openURL(`tel:${service.phone}`)}
            activeOpacity={0.8}>
            <Text style={styles.serviceActionIcon}>📞</Text>
          </TouchableOpacity>
        )}
        {hasMaps && (
          <TouchableOpacity
            style={styles.serviceMapBtn}
            onPress={() => openInMaps(service.lat, service.lng, service.name)}
            activeOpacity={0.8}>
            <Text style={styles.serviceActionIcon}>🗺</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.serviceTrackBtn}
          onPress={onTrack}
          activeOpacity={0.8}>
          <Text style={styles.serviceActionIcon}>📡</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
const NearbyServicesScreen = ({navigation}) => {
  const [services,     setServices]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [isOffline,    setIsOffline]    = useState(false);
  const [selectedType, setSelectedType] = useState('all');

  // Load cache on mount
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then(raw => {
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached?.length) { setServices(cached); setIsOffline(true); }
        }
      })
      .catch(() => {});
  }, []);

  const grouped = useMemo(() => {
    const map = {};
    CATEGORIES.forEach(c => {map[c.type] = [];});
    services.forEach(s => {if (map[s.type]) {map[s.type].push(s);}});
    return map;
  }, [services]);

  const filteredServices = useMemo(() => {
    if (selectedType === 'all') {return services;}
    return services.filter(s => s.type === selectedType);
  }, [services, selectedType]);

  const fetchNearby = useCallback(async () => {
    setLoading(true);
    setError('');
    const granted = await requestLocationPermission();
    if (!granted) {
      setLoading(false);
      setError('Location permission denied. Cannot fetch nearby services.');
      return;
    }
    Geolocation.getCurrentPosition(
      async position => {
        const {latitude, longitude} = position.coords;
        try {
          const res  = await getNearbyServices(latitude, longitude);
          const data = res.data.data || [];
          setServices(data);
          setIsOffline(false);
          setSelectedType('all');
          AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
        } catch {
          setError('Could not load nearby services.\nMake sure the backend is running.');
        } finally {
          setLoading(false);
        }
      },
      () => { setLoading(false); setError('Could not get GPS location.'); },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  }, []);

  const loaded = services.length > 0;

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Nearby Help</Text>
          <Text style={styles.headerSub}>Find emergency services near you</Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, loading && styles.refreshBtnDisabled]}
          onPress={fetchNearby}
          disabled={loading}
          activeOpacity={0.7}>
          {loading
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={styles.refreshText}>↻  Refresh</Text>}
        </TouchableOpacity>
      </View>

      {/* Filter chip bar — only shown when results are loaded */}
      {loaded && (
        <View style={styles.filterBarWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, selectedType === 'all' && styles.filterChipAll]}
              onPress={() => setSelectedType('all')}
              activeOpacity={0.75}>
              <Text style={[styles.filterChipText, selectedType === 'all' && styles.filterChipTextActive]}>
                All ({services.length})
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map(cat => {
              const count    = grouped[cat.type]?.length ?? 0;
              if (!count) {return null;}
              const isActive = selectedType === cat.type;
              return (
                <TouchableOpacity
                  key={cat.type}
                  style={[
                    styles.filterChip,
                    isActive && {backgroundColor: cat.color, borderColor: cat.color},
                  ]}
                  onPress={() => setSelectedType(cat.type)}
                  activeOpacity={0.75}>
                  <Text style={styles.filterChipIcon}>{cat.icon}</Text>
                  <Text style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextWhite,
                  ]}>
                    {cat.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* Cached/Offline notice */}
        {isOffline && !loading && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              📶  Cached results — tap Refresh for live data
            </Text>
          </View>
        )}

        {/* Error */}
        {!!error && !loading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptyTitle}>Searching nearby...</Text>
            <Text style={styles.emptyText}>
              Querying OpenStreetMap. This may take up to 30 seconds.
            </Text>
          </View>
        )}

        {/* Empty — first launch */}
        {!loading && !error && !loaded && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyTitle}>Find Nearby Services</Text>
            <Text style={styles.emptyText}>
              Tap the button below to find hospitals,{'\n'}ambulance, police and mechanics near you.
            </Text>
            <TouchableOpacity style={styles.findBtn} onPress={fetchNearby}>
              <Text style={styles.findBtnText}>↻  Find Nearby Help</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results — vertical list */}
        {!loading && loaded && (
          <>
            {filteredServices.length === 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  No {CATEGORIES.find(c => c.type === selectedType)?.label ?? 'services'} found nearby.
                </Text>
              </View>
            ) : (
              <View style={styles.serviceListCard}>
                {filteredServices.map((s, i) => (
                  <View key={s.id}>
                    <ServiceRow
                      service={s}
                      onTrack={() => navigation.navigate('HelpOnWay', {
                        contactName:  s.name,
                        contactPhone: s.phone || '108',
                        distanceKm:   parseDistKm(s.distance),
                        etaSeconds:   calcEtaSecs(parseDistKm(s.distance)),
                      })}
                    />
                    {i < filteredServices.length - 1 && (
                      <View style={styles.rowDivider} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{height: 80}} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     {flex: 1, backgroundColor: colors.background},
  scrollContent: {paddingTop: 12, paddingHorizontal: 16, paddingBottom: 100},

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: 0.3},
  headerSub:   {fontSize: 12, color: colors.textSecondary, marginTop: 3},

  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 100,
    justifyContent: 'center',
    minHeight: 40,
  },
  refreshBtnDisabled: {opacity: 0.6},
  refreshText: {color: colors.primary, fontSize: 14, fontWeight: '700'},

  // Filter bar
  filterBarWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterChipAll: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary + '44',
  },
  filterChipIcon:         {fontSize: 14},
  filterChipText:         {fontSize: 13, fontWeight: '700', color: colors.textSecondary},
  filterChipTextActive:   {color: colors.primary},
  filterChipTextWhite:    {color: '#fff'},

  // Offline/Error banners
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  offlineText: {flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600'},

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 18,
    marginBottom: 14,
  },
  errorText: {color: '#B91C1C', fontSize: 13, textAlign: 'center', lineHeight: 20},

  // Empty / loading state
  emptyState: {alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32, gap: 14},
  emptyIcon:  {fontSize: 52},
  emptyTitle: {fontSize: 18, fontWeight: '800', color: colors.text},
  emptyText:  {fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 21},
  findBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16, paddingHorizontal: 36,
    borderRadius: 14, marginTop: 4,
  },
  findBtnText: {color: '#fff', fontWeight: '800', fontSize: 15},

  // Service list card
  serviceListCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  rowDivider: {height: 1, backgroundColor: colors.divider, marginHorizontal: 16},

  noResults:     {alignItems: 'center', paddingVertical: 40},
  noResultsText: {fontSize: 14, color: colors.textMuted},

  // Service row
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  serviceIconBox: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  serviceIconText: {fontSize: 24},
  serviceInfo: {flex: 1, gap: 3},
  serviceName: {
    fontSize: 14, fontWeight: '800',
    color: colors.text, lineHeight: 19,
  },
  serviceAddress: {
    fontSize: 12, color: colors.textSecondary, lineHeight: 16,
  },
  serviceDistBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, marginTop: 2,
  },
  serviceDistText: {fontSize: 11, fontWeight: '700'},

  serviceActions: {flexDirection: 'row', gap: 6, flexShrink: 0},
  serviceActionBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceMapBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1, borderColor: '#BFDBFE',
    alignItems: 'center', justifyContent: 'center',
  },
  serviceTrackBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#0D1117',
    borderWidth: 1, borderColor: '#1E3A5F',
    alignItems: 'center', justifyContent: 'center',
  },
  serviceActionIcon: {fontSize: 16},
});

export default NearbyServicesScreen;
