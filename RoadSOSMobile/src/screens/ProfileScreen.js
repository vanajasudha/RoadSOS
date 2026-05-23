import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import {colors} from '../theme/colors';
import {useAuth} from '../context/AuthContext';
import {API_BASE_URL} from '../services/api';

const VERSION = '1.0.0';

const MenuItem = ({icon, label, sub, color, onPress, badge}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIconWrap, {backgroundColor: (color || colors.primary) + '18'}]}>
      <Text style={styles.menuIcon}>{icon}</Text>
    </View>
    <View style={styles.menuInfo}>
      <Text style={styles.menuLabel}>{label}</Text>
      {!!sub && <Text style={styles.menuSub}>{sub}</Text>}
    </View>
    {badge ? (
      <View style={styles.menuBadge}>
        <Text style={styles.menuBadgeText}>{badge}</Text>
      </View>
    ) : (
      <Text style={styles.menuArrow}>›</Text>
    )}
  </TouchableOpacity>
);

const SectionHeader = ({title}) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const ProfileScreen = ({navigation}) => {
  const {user, logout} = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Sign Out', style: 'destructive', onPress: logout},
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSub}>Your emergency profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name ?? 'Driver'}</Text>
            <Text style={styles.userPhone}>+91 {user?.phone ?? '—'}</Text>
          </View>
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>

        {/* Emergency settings */}
        <SectionHeader title="Emergency Settings" />
        <View style={styles.section}>
          <MenuItem
            icon="👤"
            label="Emergency Contacts"
            sub="People notified during an alert"
            color="#8B5CF6"
            onPress={() => navigation.getParent()?.navigate('Contacts')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="🏥"
            label="Medical QR"
            sub="Blood type, allergies, medications"
            color="#00BFA5"
            onPress={() => navigation.getParent()?.navigate('MedicalQR')}
          />
        </View>

        {/* Quick links */}
        <SectionHeader title="Quick Links" />
        <View style={styles.section}>
          <MenuItem
            icon="📍"
            label="Nearby Services"
            sub="Find hospitals, police and towing"
            color="#4A90D9"
            onPress={() => navigation.navigate('Nearby')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="📞"
            label="Emergency Numbers"
            sub="India's emergency helplines"
            color={colors.error}
            onPress={() => navigation.navigate('Numbers')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="📋"
            label="Alert History"
            sub="Past SOS and crash alerts"
            color={colors.warning}
            onPress={() => navigation.navigate('History')}
          />
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>v{VERSION}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Server</Text>
            <Text style={styles.infoValue}>{API_BASE_URL.replace('http://', '')}</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Note */}
        <View style={styles.noteBanner}>
          <Text style={styles.noteIcon}>🛡</Text>
          <Text style={styles.noteText}>
            RoadSOS uses your GPS location only when an emergency alert is triggered.
            Your data is stored securely on our servers.
          </Text>
        </View>

        <View style={{height: 24}} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {fontSize: 22, fontWeight: '900', color: colors.text},
  headerSub:   {fontSize: 12, color: colors.textSecondary, marginTop: 2},

  scroll: {paddingHorizontal: 16, paddingTop: 20},

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {fontSize: 24, fontWeight: '900', color: colors.primary},
  userInfo:   {flex: 1},
  userName:   {fontSize: 18, fontWeight: '800', color: colors.text},
  userPhone:  {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeDot:  {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success},
  activeText: {fontSize: 12, color: colors.success, fontWeight: '700'},

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 4,
  },

  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  divider: {height: 1, backgroundColor: colors.divider, marginHorizontal: 14},

  menuItem: {flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14},
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuIcon:  {fontSize: 20},
  menuInfo:  {flex: 1, gap: 2},
  menuLabel: {fontSize: 14, fontWeight: '700', color: colors.text},
  menuSub:   {fontSize: 11, color: colors.textSecondary},
  menuArrow: {color: colors.textMuted, fontSize: 22, fontWeight: '300'},
  menuBadge: {backgroundColor: colors.primaryLight, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10},
  menuBadgeText: {color: colors.primary, fontSize: 12, fontWeight: '700'},

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  infoLabel: {fontSize: 14, color: colors.text, fontWeight: '600'},
  infoValue: {fontSize: 13, color: colors.textSecondary},

  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutText: {color: colors.error, fontSize: 15, fontWeight: '800'},

  noteBanner: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  noteIcon: {fontSize: 20},
  noteText: {flex: 1, fontSize: 12, color: '#1E40AF', lineHeight: 19},
});

export default ProfileScreen;
