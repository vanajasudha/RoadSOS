import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useNetwork} from '../context/NetworkContext';

const OfflineBanner = () => {
  const {mode, pendingCount, recheckNow} = useNetwork();

  if (mode === 'online') {return null;}

  if (mode === 'checking') {
    return (
      <View style={[styles.banner, styles.checking]}>
        <ActivityIndicator size="small" color="#1D4ED8" />
        <Text style={styles.checkingText}>Checking connection...</Text>
      </View>
    );
  }

  // offline
  const queueNote = pendingCount > 0
    ? ` · ${pendingCount} alert${pendingCount > 1 ? 's' : ''} queued`
    : '';

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.text}>
        {`Offline Mode: using cached data${queueNote}`}
      </Text>
      <TouchableOpacity onPress={recheckNow} style={styles.retryBtn} activeOpacity={0.7}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: 14,
    paddingVertical:   10,
    gap:               8,
  },
  checking: {
    backgroundColor:   '#EFF6FF',
    borderBottomColor: '#BFDBFE',
  },
  checkingText: {
    fontSize:   12,
    color:      '#1D4ED8',
    fontWeight: '600',
  },
  icon: {fontSize: 15},
  text: {
    flex:       1,
    fontSize:   12,
    color:      '#92400E',
    fontWeight: '600',
    lineHeight: 17,
  },
  retryBtn: {
    backgroundColor:   '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical:    5,
    borderRadius:       8,
  },
  retryText: {color: '#fff', fontSize: 11, fontWeight: '800'},
});

export default OfflineBanner;
