import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {getContacts, addContact, deleteContact} from '../services/api';
import {saveContactsCache, getContactsCache} from '../services/offlineStorage';
import {colors} from '../theme/colors';

const MAX_CONTACTS = 5;

const RELATIONSHIP_SUGGESTIONS = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Child'];

// ─── Single contact card ──────────────────────────────────────────────────────
const ContactCard = ({contact, onDelete}) => (
  <View style={styles.card}>
    <View style={styles.cardAvatar}>
      <Text style={styles.cardAvatarText}>
        {contact.name.charAt(0).toUpperCase()}
      </Text>
    </View>
    <View style={styles.cardInfo}>
      <Text style={styles.cardName}>{contact.name}</Text>
      {!!contact.relationship && (
        <Text style={styles.cardRelationship}>{contact.relationship}</Text>
      )}
      <Text style={styles.cardPhone}>📞 {contact.phone}</Text>
    </View>
    <TouchableOpacity
      style={styles.deleteBtn}
      onPress={() => onDelete(contact)}
      activeOpacity={0.8}
      hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
      <Text style={styles.deleteBtnText}>✕</Text>
    </TouchableOpacity>
  </View>
);

// ─── Contacts Screen ──────────────────────────────────────────────────────────
const ContactsScreen = ({navigation}) => {
  const [contacts,    setContacts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [listError,   setListError]   = useState('');
  const [formError,   setFormError]   = useState('');

  const [name,         setName]         = useState('');
  const [phone,        setPhone]        = useState('');
  const [relationship, setRelationship] = useState('');

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const res  = await getContacts();
      const data = res.data.data || [];
      setContacts(data);
      saveContactsCache(data); // persist for offline access
    } catch {
      // Fall back to device cache when offline or backend unreachable
      const cached = await getContactsCache();
      if (cached.length > 0) {
        setContacts(cached);
        setListError('');
      } else {
        setListError('Could not load contacts. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAdd = async () => {
    setFormError('');
    if (!name.trim())  {setFormError('Name is required.'); return;}
    if (!phone.trim()) {setFormError('Phone number is required.'); return;}
    if (contacts.length >= MAX_CONTACTS) {
      setFormError(`Maximum ${MAX_CONTACTS} contacts allowed.`); return;
    }

    setSaving(true);
    try {
      await addContact(name.trim(), phone.trim(), relationship.trim());
      setName('');
      setPhone('');
      setRelationship('');
      await fetchContacts();
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not add contact. Try again.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = contact => {
    Alert.alert(
      'Remove Contact',
      `Remove ${contact.name} from emergency contacts?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(contact._id);
              await fetchContacts();
            } catch {
              Alert.alert('Error', 'Could not remove contact. Try again.');
            }
          },
        },
      ],
    );
  };

  const atMax = contacts.length >= MAX_CONTACTS;

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
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <View style={[styles.countBadge, atMax && styles.countBadgeFull]}>
            <Text style={[styles.countBadgeText, atMax && styles.countBadgeTextFull]}>
              {contacts.length}/{MAX_CONTACTS}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* ── Info banner ── */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>🔔</Text>
            <Text style={styles.infoText}>
              These people will be automatically notified when you trigger an SOS or crash alert.
            </Text>
          </View>

          {/* ── Add contact form ── */}
          {!atMax && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Add New Contact</Text>

              {!!formError && (
                <View style={styles.formErrorBox}>
                  <Text style={styles.formErrorText}>⚠ {formError}</Text>
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder="Full Name *"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={t => {setName(t); setFormError('');}}
                returnKeyType="next"
              />

              {/* Relationship chips */}
              <Text style={styles.chipHint}>Relationship (optional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}>
                {RELATIONSHIP_SUGGESTIONS.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.chip, relationship === r && styles.chipSelected]}
                    onPress={() => setRelationship(relationship === r ? '' : r)}>
                    <Text style={[styles.chipText, relationship === r && styles.chipTextSelected]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={styles.input}
                placeholder="Or type relationship..."
                placeholderTextColor={colors.textMuted}
                value={relationship}
                onChangeText={setRelationship}
                returnKeyType="next"
              />

              <TextInput
                style={styles.input}
                placeholder="Phone Number *"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={t => {setPhone(t); setFormError('');}}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />

              <TouchableOpacity
                style={[styles.addBtn, saving && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={saving}
                activeOpacity={0.8}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.addBtnText}>+ Add Contact</Text>}
              </TouchableOpacity>
            </View>
          )}

          {atMax && (
            <View style={styles.maxBanner}>
              <Text style={styles.maxBannerText}>
                ✓ You have {MAX_CONTACTS} contacts saved (maximum). Remove one to add another.
              </Text>
            </View>
          )}

          {/* ── Contacts list ── */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              {contacts.length === 0 ? 'No contacts saved yet' : 'Saved Contacts'}
            </Text>
            {contacts.length > 0 && (
              <Text style={styles.listSubtitle}>Tap ✕ to remove</Text>
            )}
          </View>

          {loading && (
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          )}

          {!!listError && !loading && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{listError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchContacts}>
                <Text style={styles.retryBtnText}>↻ Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && !listError && contacts.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyText}>
                No emergency contacts added yet.{'\n'}
                Add people who should be called if you are in an accident.
              </Text>
            </View>
          )}

          {!loading && contacts.map(contact => (
            <ContactCard
              key={contact._id}
              contact={contact}
              onDelete={handleDelete}
            />
          ))}

          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  flex:      {flex: 1},

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
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText:  {color: colors.primary, fontSize: 14, fontWeight: '700'},
  headerTitle:  {flex: 1, color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 0.3},
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countBadgeFull:     {borderColor: colors.success, backgroundColor: colors.successLight},
  countBadgeText:     {color: colors.textSecondary, fontSize: 13, fontWeight: '800'},
  countBadgeTextFull: {color: colors.success},

  scroll: {paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8},

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#F5F0FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 14,
    gap: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {fontSize: 20},
  infoText: {flex: 1, color: '#6D28D9', fontSize: 13, lineHeight: 19},

  // Form card
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  formTitle: {color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 2},

  formErrorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
  },
  formErrorText: {color: '#B91C1C', fontSize: 13},

  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },

  chipHint: {color: colors.textMuted, fontSize: 12, marginBottom: 2},
  chipRow:  {gap: 8, paddingVertical: 2},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected:     {backgroundColor: colors.primaryLight, borderColor: colors.primary},
  chipText:         {color: colors.textSecondary, fontSize: 13, fontWeight: '600'},
  chipTextSelected: {color: colors.primary},

  addBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnDisabled: {opacity: 0.5},
  addBtnText: {color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5},

  // Max reached
  maxBanner: {
    backgroundColor: colors.successLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success + '55',
    padding: 14,
    marginBottom: 16,
  },
  maxBannerText: {color: colors.success, fontSize: 13, fontWeight: '600', textAlign: 'center'},

  // List
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listTitle:    {color: colors.text, fontSize: 16, fontWeight: '800'},
  listSubtitle: {color: colors.textMuted, fontSize: 12},
  spinner:      {marginVertical: 24},

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  errorText:    {color: '#B91C1C', fontSize: 13, textAlign: 'center'},
  retryBtn:     {backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8},
  retryBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},

  emptyBox:  {alignItems: 'center', paddingVertical: 32, gap: 12},
  emptyIcon: {fontSize: 48},
  emptyText: {color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22},

  // Contact card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardAvatarText:   {color: colors.primary, fontSize: 20, fontWeight: '900'},
  cardInfo:         {flex: 1, gap: 2},
  cardName:         {color: colors.text, fontSize: 15, fontWeight: '800'},
  cardRelationship: {color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5},
  cardPhone:        {color: colors.textSecondary, fontSize: 13, marginTop: 2},

  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deleteBtnText: {color: colors.error, fontSize: 14, fontWeight: '800'},
});

export default ContactsScreen;
