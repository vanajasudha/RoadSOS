import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {colors} from '../theme/colors';
import {sendOtp} from '../services/api';

const LoginScreen = ({navigation}) => {
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSend = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res    = await sendOtp(cleaned);
      const devOtp = res.data?.otp;
      navigation.navigate('OTP', {phone: cleaned, devOtp});
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to send OTP. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = phone.replace(/\D/g, '').length === 10 && !loading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}>

        {/* Branding */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🚨</Text>
          </View>
          <Text style={styles.appName}>RoadSOS</Text>
          <Text style={styles.tagline}>Emergency assistance at your fingertips</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in with OTP</Text>
          <Text style={styles.cardSub}>
            We'll send a 6-digit code to your mobile number
          </Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.phoneRow}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={t => {setPhone(t.replace(/\D/g, '')); setError('');}}
              returnKeyType="done"
              onSubmitEditing={canSubmit ? handleSend : undefined}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, !canSubmit && styles.btnDisabled]}
            onPress={handleSend}
            disabled={!canSubmit}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Send OTP</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 24,
  },

  logoWrap: {alignItems: 'center', gap: 10},
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  logoIcon:  {fontSize: 44},
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  tagline: {fontSize: 13, color: colors.textSecondary, textAlign: 'center'},

  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 16,
    gap: 16,
  },
  cardTitle: {fontSize: 20, fontWeight: '800', color: colors.text},
  cardSub:   {fontSize: 13, color: colors.textSecondary, lineHeight: 19},

  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {color: colors.error, fontSize: 13, fontWeight: '600'},

  phoneRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  prefix: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
  },
  prefixText: {fontSize: 16, fontWeight: '700', color: colors.text},
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 18,
    color: colors.text,
    letterSpacing: 1,
  },

  btn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {opacity: 0.45},
  btnText: {color: '#fff', fontSize: 16, fontWeight: '800'},

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
});

export default LoginScreen;
