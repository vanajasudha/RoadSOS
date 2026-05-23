import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {colors} from '../theme/colors';
import api from '../services/api';

const formatDate = iso => {
  if (!iso) {return '';}
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'}) +
    '  ' +
    d.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'});
};

const AlertCard = ({alert, index}) => {
  const isResolved = alert.resolved;
  return (
    <View style={styles.card}>
      {/* Timeline connector */}
      <View style={styles.timelineCol}>
        <View style={[styles.dot, isResolved ? styles.dotResolved : styles.dotActive]} />
        {index !== 0 && <View style={styles.line} />}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>
            {alert.description || 'Emergency Alert'}
          </Text>
          <View style={[styles.badge, isResolved ? styles.badgeResolved : styles.badgeActive]}>
            <Text style={[styles.badgeText, isResolved ? styles.badgeTextResolved : styles.badgeTextActive]}>
              {isResolved ? 'Resolved' : 'Active'}
            </Text>
          </View>
        </View>

        <Text style={styles.cardDate}>{formatDate(alert.createdAt)}</Text>

        {alert.location?.coordinates && (
          <View style={styles.locRow}>
            <Text style={styles.locIcon}>📍</Text>
            <Text style={styles.locText}>
              {alert.location.coordinates[1]?.toFixed(5)}, {alert.location.coordinates[0]?.toFixed(5)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const AlertHistoryScreen = () => {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/alerts');
      const data = res.data.data || [];
      setAlerts(data.slice().reverse());
    } catch {
      setError('Could not load alert history.\nMake sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alert History</Text>
          <Text style={styles.headerSub}>Past SOS and crash alerts</Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, loading && styles.refreshBtnDisabled]}
          onPress={fetchAlerts}
          disabled={loading}
          activeOpacity={0.7}>
          {loading
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={styles.refreshText}>↻</Text>}
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading alerts...</Text>
        </View>
      )}

      {!!error && !loading && (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAlerts}>
            <Text style={styles.retryText}>↻  Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && alerts.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No alerts yet</Text>
          <Text style={styles.emptyText}>
            When you trigger an SOS or crash alert,{'\n'}it will appear here.
          </Text>
        </View>
      )}

      {!loading && !error && alerts.length > 0 && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{alerts.length}</Text>
              <Text style={styles.statLabel}>Total Alerts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, {color: colors.success}]}>
                {alerts.filter(a => a.resolved).length}
              </Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, {color: colors.error}]}>
                {alerts.filter(a => !a.resolved).length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Timeline</Text>

          {alerts.map((alert, i) => (
            <AlertCard key={alert._id} alert={alert} index={i} />
          ))}

          <View style={{height: 24}} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},

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
  headerTitle: {fontSize: 22, fontWeight: '900', color: colors.text},
  headerSub:   {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  refreshBtn:  {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  refreshBtnDisabled: {opacity: 0.6},
  refreshText: {color: colors.primary, fontSize: 20, fontWeight: '700'},

  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32},
  loadingText: {color: colors.textSecondary, fontSize: 14},
  errorIcon:   {fontSize: 40},
  errorText:   {color: colors.error, fontSize: 14, textAlign: 'center', lineHeight: 22},
  retryBtn:    {backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10},
  retryText:   {color: '#fff', fontWeight: '700', fontSize: 14},
  emptyIcon:   {fontSize: 48},
  emptyTitle:  {fontSize: 18, fontWeight: '800', color: colors.text},
  emptyText:   {fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20},

  scroll: {paddingHorizontal: 16, paddingTop: 16},

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  statNum:   {fontSize: 28, fontWeight: '900', color: colors.text},
  statLabel: {fontSize: 11, color: colors.textSecondary, fontWeight: '600'},

  sectionTitle: {fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1},

  // Alert card
  card: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 14,
  },
  timelineCol: {
    alignItems: 'center',
    width: 20,
    paddingTop: 4,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    flexShrink: 0,
    zIndex: 1,
  },
  dotActive:   {backgroundColor: colors.error},
  dotResolved: {backgroundColor: colors.success},
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 4,
    marginBottom: -8,
  },

  cardBody: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardTop:  {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8},
  cardTitle:{flex: 1, fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20},
  cardDate: {fontSize: 12, color: colors.textMuted},

  badge:             {paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, flexShrink: 0},
  badgeActive:       {backgroundColor: colors.primaryLight},
  badgeResolved:     {backgroundColor: colors.successLight},
  badgeText:         {fontSize: 11, fontWeight: '700'},
  badgeTextActive:   {color: colors.error},
  badgeTextResolved: {color: colors.success},

  locRow:  {flexDirection: 'row', alignItems: 'center', gap: 4},
  locIcon: {fontSize: 12},
  locText: {fontSize: 11, color: colors.textSecondary},
});

export default AlertHistoryScreen;
