import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {getMedicalProfile, saveMedicalProfile} from '../services/api';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';

const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];

const EMPTY_FORM = {
  bloodGroup:            '',
  allergies:             '',
  medications:           '',
  healthNotes:           '',
  emergencyContactName:  '',
  emergencyContactPhone: '',
};

const TEAL = '#00BFA5';

const buildQrText = p => {
  const lines = ['*** ROADSOS MEDICAL ALERT ***'];
  if (p.bloodGroup)            {lines.push(`Blood Type : ${p.bloodGroup}`);}
  if (p.allergies)             {lines.push(`Allergies  : ${p.allergies}`);}
  if (p.medications)           {lines.push(`Medications: ${p.medications}`);}
  if (p.healthNotes)           {lines.push(`Notes      : ${p.healthNotes}`);}
  if (p.emergencyContactName)  {lines.push(`Emergency  : ${p.emergencyContactName}`);}
  if (p.emergencyContactPhone) {lines.push(`Phone      : ${p.emergencyContactPhone}`);}
  lines.push('Scan for emergency medical info');
  return lines.join('\n');
};

const SectionLabel = ({text}) => (
  <Text style={styles.sectionLabel}>{text}</Text>
);

// ─── Medical QR Screen ───────────────────────────────────────────────────────
const MedicalQRScreen = ({navigation}) => {
  const {userId} = useAuth();
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [savedProfile, setSavedProfile] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState('');
  const [error,        setError]        = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMedicalProfile();
      const p   = res.data.data;
      setSavedProfile(p);
      setForm({
        bloodGroup:            p.bloodGroup            || '',
        allergies:             p.allergies             || '',
        medications:           p.medications           || '',
        healthNotes:           p.healthNotes           || '',
        emergencyContactName:  p.emergencyContactName  || '',
        emergencyContactPhone: p.emergencyContactPhone || '',
      });
    } catch (err) {
      if (err.response?.status === 404) {
        setSavedProfile(null);
      } else {
        setError('Could not load profile. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await saveMedicalProfile(form);
      setSavedProfile(res.data.data);
      setSaveMsg('✓ Profile saved. QR code updated.');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveMsg('✕ Could not save. Check backend connection.');
    } finally {
      setSaving(false);
    }
  };

  const set = (field, value) => setForm(prev => ({...prev, [field]: value}));

  const qrText = useMemo(
    () => (savedProfile ? buildQrText(savedProfile) : null),
    [savedProfile],
  );

  const hasProfile = !!savedProfile && (
    savedProfile.bloodGroup ||
    savedProfile.allergies  ||
    savedProfile.medications
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}
            activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical QR</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>ID: {userId}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.spinner} size="large" />
          ) : (
            <>
              {/* ── QR Code card ── */}
              <View style={styles.qrCard}>
                <Text style={styles.qrCardTitle}>Emergency Medical QR</Text>
                <Text style={styles.qrCardSub}>
                  Show this to first responders or stick it on your vehicle
                </Text>

                <View style={styles.qrBox}>
                  {hasProfile && qrText ? (
                    <QRCode
                      value={qrText}
                      size={200}
                      backgroundColor="#FFFFFF"
                      color="#000000"
                    />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Text style={styles.qrPlaceholderIcon}>🏥</Text>
                      <Text style={styles.qrPlaceholderText}>
                        Fill in your medical details below and tap Save to generate your QR code.
                      </Text>
                    </View>
                  )}
                </View>

                {hasProfile && (
                  <View style={styles.qrInfoRow}>
                    <View style={styles.qrInfoChip}>
                      <Text style={styles.qrInfoChipText}>🩸 {savedProfile.bloodGroup || '—'}</Text>
                    </View>
                    {!!savedProfile.allergies && (
                      <View style={styles.qrInfoChip}>
                        <Text style={styles.qrInfoChipText} numberOfLines={1}>
                          ⚠ {savedProfile.allergies}
                        </Text>
                      </View>
                    )}
                    {!!savedProfile.emergencyContactName && (
                      <View style={styles.qrInfoChip}>
                        <Text style={styles.qrInfoChipText}>
                          👤 {savedProfile.emergencyContactName}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* ── Error ── */}
              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* ── Form ── */}
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Medical Details</Text>
                <Text style={styles.formSub}>
                  This information is stored on your device's backend and encoded into the QR code.
                </Text>

                {/* Blood Group */}
                <SectionLabel text="Blood Group" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}>
                  {BLOOD_GROUPS.map(bg => (
                    <TouchableOpacity
                      key={bg}
                      style={[styles.chip, form.bloodGroup === bg && styles.chipSelected]}
                      onPress={() => set('bloodGroup', form.bloodGroup === bg ? '' : bg)}>
                      <Text style={[styles.chipText, form.bloodGroup === bg && styles.chipTextSelected]}>
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Allergies */}
                <SectionLabel text="Allergies" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Penicillin, Aspirin, Peanuts"
                  placeholderTextColor={colors.textMuted}
                  value={form.allergies}
                  onChangeText={v => set('allergies', v)}
                  multiline
                  numberOfLines={2}
                />

                {/* Medications */}
                <SectionLabel text="Current Medications" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Metformin 500mg, Atorvastatin 10mg"
                  placeholderTextColor={colors.textMuted}
                  value={form.medications}
                  onChangeText={v => set('medications', v)}
                  multiline
                  numberOfLines={2}
                />

                {/* Health Notes */}
                <SectionLabel text="Medical Conditions / Notes" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Type 2 Diabetic, Heart condition, Pregnant"
                  placeholderTextColor={colors.textMuted}
                  value={form.healthNotes}
                  onChangeText={v => set('healthNotes', v)}
                  multiline
                  numberOfLines={2}
                />

                {/* Emergency Contact */}
                <SectionLabel text="Emergency Contact Name" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={colors.textMuted}
                  value={form.emergencyContactName}
                  onChangeText={v => set('emergencyContactName', v)}
                />

                <SectionLabel text="Emergency Contact Phone" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +91 98765 43210"
                  placeholderTextColor={colors.textMuted}
                  value={form.emergencyContactPhone}
                  onChangeText={v => set('emergencyContactPhone', v)}
                  keyboardType="phone-pad"
                />

                {/* Save message */}
                {!!saveMsg && (
                  <View style={[
                    styles.saveMsgBox,
                    saveMsg.startsWith('✓') ? styles.saveMsgSuccess : styles.saveMsgError,
                  ]}>
                    <Text style={[
                      styles.saveMsgText,
                      saveMsg.startsWith('✓') ? styles.saveMsgTextSuccess : styles.saveMsgTextError,
                    ]}>
                      {saveMsg}
                    </Text>
                  </View>
                )}

                {/* Save button */}
                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}>
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.saveBtnText}>💾  Save & Generate QR</Text>}
                </TouchableOpacity>
              </View>

              {/* ── What gets encoded note ── */}
              <View style={styles.noteCard}>
                <Text style={styles.noteTitle}>What gets encoded in the QR?</Text>
                <Text style={styles.noteText}>
                  The QR code contains your blood type, allergies, medications, medical conditions and emergency contact — in plain text.{'\n\n'}
                  Any standard QR scanner or smartphone camera can read it without any app.
                </Text>
              </View>

              <View style={{height: 40}} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  flex:      {flex: 1},
  spinner:   {marginTop: 80},

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
    backgroundColor: colors.surface,
  },
  backBtn: {
    paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  backBtnText:     {color: colors.primary, fontSize: 14, fontWeight: '700'},
  headerTitle:     {flex: 1, color: colors.text, fontSize: 18, fontWeight: '900'},
  headerBadge:     {backgroundColor: TEAL + '18', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: TEAL + '44'},
  headerBadgeText: {color: TEAL, fontSize: 11, fontWeight: '700'},

  scroll: {paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8},

  // QR card
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TEAL + '33',
    padding: 20,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: TEAL,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  qrCardTitle: {color: colors.text, fontSize: 17, fontWeight: '900', letterSpacing: 0.5},
  qrCardSub:   {color: colors.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 18},

  qrBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 232,
    minHeight: 232,
    borderWidth: 1,
    borderColor: colors.border,
  },

  qrPlaceholder:      {alignItems: 'center', gap: 12, paddingHorizontal: 8},
  qrPlaceholderIcon:  {fontSize: 48},
  qrPlaceholderText:  {color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18},

  qrInfoRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center'},
  qrInfoChip: {
    backgroundColor: TEAL + '14',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: TEAL + '44',
    maxWidth: 180,
  },
  qrInfoChipText: {color: TEAL, fontSize: 12, fontWeight: '700'},

  // Error
  errorBox:  {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    marginBottom: 16,
  },
  errorText: {color: '#B91C1C', fontSize: 13, textAlign: 'center'},

  // Form
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  formTitle: {color: colors.text, fontSize: 16, fontWeight: '900'},
  formSub:   {color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 4},

  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 6,
  },

  chipRow: {gap: 8, paddingVertical: 4},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected:     {backgroundColor: TEAL + '18', borderColor: TEAL},
  chipText:         {color: colors.textSecondary, fontSize: 14, fontWeight: '700'},
  chipTextSelected: {color: TEAL},

  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
    textAlignVertical: 'top',
  },

  saveMsgBox:         {borderRadius: 8, padding: 10, borderWidth: 1},
  saveMsgSuccess:     {backgroundColor: colors.successLight, borderColor: colors.success + '44'},
  saveMsgError:       {backgroundColor: '#FEF2F2', borderColor: '#FECACA'},
  saveMsgText:        {fontSize: 13, fontWeight: '600', textAlign: 'center'},
  saveMsgTextSuccess: {color: colors.success},
  saveMsgTextError:   {color: '#B91C1C'},

  saveBtn: {
    backgroundColor: TEAL,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: {opacity: 0.5},
  saveBtnText: {color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5},

  // Note card
  noteCard: {
    backgroundColor: TEAL + '0D',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TEAL + '28',
    padding: 16,
    gap: 8,
  },
  noteTitle: {color: TEAL, fontSize: 13, fontWeight: '800'},
  noteText:  {color: colors.textSecondary, fontSize: 12, lineHeight: 19},
});

export default MedicalQRScreen;
