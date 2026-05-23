import React, {useState, useRef, useEffect} from 'react';
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
  ScrollView,
} from 'react-native';
import {colors} from '../theme/colors';
import {verifyOtp} from '../services/api';
import {useAuth} from '../context/AuthContext';

const OTP_LENGTH = 6;

const OTPScreen = ({navigation, route}) => {
  const {phone, devOtp} = route.params ?? {};
  const {login} = useAuth();

  const [digits,    setDigits]    = useState(Array(OTP_LENGTH).fill(''));
  const [name,      setName]      = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const inputRefs = useRef([]);

  // Auto-fill if devOtp is provided
  useEffect(() => {
    if (devOtp && devOtp.length === OTP_LENGTH) {
      setDigits(devOtp.split(''));
    }
  }, [devOtp]);

  const handleDigit = (text, index) => {
    const char = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError('');
    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key, index) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otp = digits.join('');
    if (otp.length !== OTP_LENGTH) {
      setError('Enter all 6 digits');
      return;
    }
    if (needsName && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await verifyOtp(phone, otp, needsName ? name.trim() : undefined);
      const {token, user} = res.data;

      if (!token || !user) {
        setError('Unexpected server response. Try again.');
        return;
      }

      login(user, token);
      // Navigation handled by App.js auth gate (CommonActions.reset)
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresName) {
        setNeedsName(true);
        setError('');
      } else {
        setError(data?.message ?? 'Verification failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const otp      = digits.join('');
  const canSubmit = otp.length === OTP_LENGTH && (!needsName || !!name.trim()) && !loading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">

          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')}
            activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🔐</Text>
          </View>
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.sub}>
            6-digit code sent to{'\n'}
            <Text style={styles.phone}>+91 {phone}</Text>
          </Text>

          {/* Dev hint */}
          {!!devOtp && (
            <View style={styles.devHint}>
              <Text style={styles.devHintLabel}>Dev mode — OTP:</Text>
              <Text style={styles.devHintOtp}>{devOtp}</Text>
            </View>
          )}

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* OTP boxes */}
          <View style={styles.boxRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={r => {inputRefs.current[i] = r;}}
                style={[styles.box, d && styles.boxFilled]}
                value={d}
                onChangeText={t => handleDigit(t, i)}
                onKeyPress={({nativeEvent}) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Name input for new users */}
          {needsName && (
            <View style={styles.nameWrap}>
              <Text style={styles.nameLabel}>Welcome! What's your name?</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="Your full name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={t => {setName(t); setError('');}}
                autoFocus
                returnKeyType="done"
              />
            </View>
          )}

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.btn, !canSubmit && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={!canSubmit}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Verify & Continue</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  kav:       {flex: 1},
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 20,
  },

  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: {color: colors.primary, fontSize: 14, fontWeight: '700'},

  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {fontSize: 40},

  title: {fontSize: 26, fontWeight: '900', color: colors.text},
  sub:   {fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22},
  phone: {fontWeight: '800', color: colors.text},

  devHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'stretch',
  },
  devHintLabel: {fontSize: 12, color: '#78650A', fontWeight: '600'},
  devHintOtp:   {fontSize: 20, fontWeight: '900', color: '#78650A', letterSpacing: 4},

  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    alignSelf: 'stretch',
  },
  errorText: {color: colors.error, fontSize: 13, fontWeight: '600', textAlign: 'center'},

  boxRow: {flexDirection: 'row', gap: 10},
  box: {
    width: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  nameWrap: {alignSelf: 'stretch', gap: 8},
  nameLabel: {fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center'},
  nameInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },

  btn: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {opacity: 0.45},
  btnText: {color: '#fff', fontSize: 16, fontWeight: '800'},
});

export default OTPScreen;
