import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Linking,
} from 'react-native';
import {colors} from '../theme/colors';

const NUMBERS = [
  {number: '112',  label: 'National Emergency',   sub: 'Single emergency number — police, fire, ambulance', icon: '🆘', color: '#E53935', priority: true},
  {number: '108',  label: 'Ambulance',             sub: 'Medical emergency and accident response',           icon: '🚑', color: '#FF3B30'},
  {number: '100',  label: 'Police',                sub: 'Law enforcement and security',                     icon: '🚔', color: '#4A90D9'},
  {number: '101',  label: 'Fire Brigade',          sub: 'Fire emergencies and rescue',                      icon: '🚒', color: '#FF6B00'},
  {number: '102',  label: 'Ambulance (Alt)',       sub: 'Alternative ambulance helpline',                   icon: '🏥', color: '#FF6B6B'},
  {number: '1095', label: 'Traffic Helpline',      sub: 'Road accidents and traffic police',                icon: '🚦', color: '#8B5CF6'},
  {number: '1091', label: "Women's Helpline",      sub: 'Safety and support for women',                    icon: '👩', color: '#EC4899'},
  {number: '1078', label: 'Disaster Management',   sub: 'National disaster response helpline',             icon: '⛑',  color: '#F59E0B'},
  {number: '14567',label: 'Senior Citizen Help',   sub: 'Elder abuse and distress helpline',               icon: '👴', color: '#059669'},
  {number: '181',  label: 'Road Accident',         sub: 'Road accident relief and support',                icon: '🛣',  color: '#DC2626'},
];

const NumberCard = ({item, onTrack}) => (
  <View style={[styles.card, item.priority && styles.cardPriority]}>
    <TouchableOpacity
      style={styles.cardMain}
      onPress={() => Linking.openURL(`tel:${item.number}`)}
      activeOpacity={0.75}>
      <View style={[styles.iconWrap, {backgroundColor: item.color + (item.priority ? '25' : '15')}]}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>{item.label}</Text>
        <Text style={styles.sub}>{item.sub}</Text>
      </View>
      <View style={[styles.numberBadge, {backgroundColor: item.color}]}>
        <Text style={styles.number}>{item.number}</Text>
      </View>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.trackRow}
      onPress={onTrack}
      activeOpacity={0.8}>
      <Text style={styles.trackRowIcon}>📡</Text>
      <Text style={styles.trackRowText}>Track Help</Text>
      <Text style={styles.trackRowArrow}>›</Text>
    </TouchableOpacity>
  </View>
);

const EmergencyNumbersScreen = ({navigation}) => (
  <SafeAreaView style={styles.container}>
    {/* ── Header ── */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Emergency Numbers</Text>
      <Text style={styles.headerSub}>Tap any number to call instantly</Text>
    </View>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <View style={styles.alertBanner}>
        <Text style={styles.alertIcon}>ℹ</Text>
        <Text style={styles.alertText}>
          These are India's official emergency helplines. All calls are free and available 24/7.
        </Text>
      </View>

      {NUMBERS.map(item => (
        <NumberCard
          key={item.number}
          item={item}
          onTrack={() => navigation.navigate('HelpOnWay', {
            contactName:  item.label,
            contactPhone: item.number,
            etaSeconds:   Math.floor(Math.random() * 180) + 240,
            distanceKm:   (Math.random() * 1.2 + 0.4).toFixed(1),
          })}
        />
      ))}

      <View style={{height: 24}} />
    </ScrollView>
  </SafeAreaView>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {fontSize: 22, fontWeight: '900', color: colors.text},
  headerSub:   {fontSize: 12, color: colors.textSecondary, marginTop: 2},

  scroll: {paddingHorizontal: 16, paddingTop: 16},

  alertBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 14,
    gap: 10,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  alertIcon: {fontSize: 18, color: '#3B82F6'},
  alertText: {flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 19},

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  cardPriority: {
    borderColor: colors.primary + '44',
    backgroundColor: colors.primaryLight,
  },

  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {fontSize: 24},

  info: {flex: 1, gap: 3},
  label: {fontSize: 14, fontWeight: '800', color: colors.text},
  sub:   {fontSize: 11, color: colors.textSecondary, lineHeight: 16},

  numberBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexShrink: 0,
  },
  number: {color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5},

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: '#0D1117',
  },
  trackRowIcon:  {fontSize: 13},
  trackRowText:  {flex: 1, fontSize: 12, fontWeight: '700', color: '#93C5FD', letterSpacing: 0.3},
  trackRowArrow: {fontSize: 16, color: '#3B82F6', fontWeight: '300'},
});

export default EmergencyNumbersScreen;
