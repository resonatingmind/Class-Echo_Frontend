import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import {
  getSchoolTimeSlots,
  createSchoolTimeSlot,
  updateSchoolTimeSlot,
  deleteSchoolTimeSlot,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { TimeSlotOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminTimeSlots'>;

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function SchoolAdminTimeSlotsScreen({ navigation }: Props) {
  const { session } = useAuth();

  const [slots, setSlots] = useState<TimeSlotOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlotOut | null>(null);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isBreak, setIsBreak] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const data = await getSchoolTimeSlots(session.token);
        setSlots(data.sort((a, b) => a.display_order - b.display_order));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load time slots.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openCreate = () => {
    setEditingSlot(null);
    setName('');
    setStartTime('08:00');
    setEndTime('08:45');
    setIsBreak(false);
    setModalError(null);
    setModalVisible(true);
  };

  const openEdit = (slot: TimeSlotOut) => {
    setEditingSlot(slot);
    setName(slot.name);
    setStartTime(slot.start_time);
    setEndTime(slot.end_time);
    setIsBreak(slot.is_break);
    setModalError(null);
    setModalVisible(true);
  };

  const validateTime = (t: string) => /^\d{1,2}:\d{2}$/.test(t);

  const handleSave = async () => {
    if (!session || submitting) return;
    if (!name.trim()) { setModalError('Name is required.'); return; }
    if (!validateTime(startTime)) { setModalError('Start time must be HH:MM (e.g. 08:00).'); return; }
    if (!validateTime(endTime)) { setModalError('End time must be HH:MM (e.g. 08:45).'); return; }

    setSubmitting(true);
    setModalError(null);
    try {
      const payload = {
        name: name.trim(),
        start_time: startTime,
        end_time: endTime,
        is_break: isBreak,
        display_order: editingSlot ? editingSlot.display_order : slots.length,
      };

      if (editingSlot) {
        await updateSchoolTimeSlot(session.token, editingSlot.id, payload);
      } else {
        await createSchoolTimeSlot(session.token, payload);
      }

      setModalVisible(false);
      void load(true);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (slot: TimeSlotOut) => {
    Alert.alert('Delete Time Slot', `Delete "${slot.name}"? This may affect existing timetable entries.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!session) return;
          try {
            await deleteSchoolTimeSlot(session.token, slot.id);
            void load(true);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Time Slots</Text>
        <Pressable onPress={openCreate} style={styles.addBtn}>
          <Ionicons color={colors.accent} name="add-circle" size={28} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
          <Text style={styles.emptyTitle}>Could not load</Text>
          <Text style={styles.emptyBody}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              onRefresh={() => { setRefreshing(true); void load(true); }}
              refreshing={refreshing}
              tintColor={colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Heading */}
          <View style={styles.pageHeading}>
            <Text style={styles.kicker}>SCHOOL SCHEDULE</Text>
            <Text style={styles.pageTitle}>Period Configuration</Text>
            <Text style={styles.pageSubtitle}>
              Define your school's daily periods. These time slots are used to build teacher timetables.
            </Text>
          </View>

          {slots.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons color={colors.textMuted} name="time-outline" size={48} />
              <Text style={styles.emptyTitle}>No time slots yet</Text>
              <Text style={styles.emptyBody}>
                Add periods and breaks to configure your school's daily schedule.
              </Text>
              <Pressable onPress={openCreate} style={styles.addInlineBtn}>
                <Ionicons color="#fff" name="add" size={16} />
                <Text style={styles.addInlineBtnText}>Add Period</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.slotList}>
              {slots.map((slot, idx) => (
                <View key={slot.id} style={[styles.slotCard, slot.is_break && styles.slotCardBreak]}>
                  <View style={styles.slotOrder}>
                    <Text style={styles.slotOrderText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.slotInfo}>
                    <Text style={styles.slotName}>{slot.name}</Text>
                    <View style={styles.slotTimesRow}>
                      <Ionicons color={colors.textMuted} name="time-outline" size={13} />
                      <Text style={styles.slotTime}>
                        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                      </Text>
                      {slot.is_break && (
                        <View style={styles.breakBadge}>
                          <Text style={styles.breakBadgeText}>Break</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.slotActions}>
                    <Pressable onPress={() => openEdit(slot)} hitSlop={8} style={styles.actionBtn}>
                      <Ionicons color={colors.textSecondary} name="create-outline" size={18} />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(slot)} hitSlop={8} style={styles.actionBtn}>
                      <Ionicons color="#B42318" name="trash-outline" size={18} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal */}
      <Modal animationType="slide" onRequestClose={() => setModalVisible(false)} transparent visible={modalVisible}>
        <Pressable onPress={() => setModalVisible(false)} style={styles.overlay}>
          <Pressable style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>
              {editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
            </Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>NAME *</Text>
              <TextInput
                autoCapitalize="words"
                autoFocus
                onChangeText={setName}
                placeholder="e.g. Period 1, Lunch Break, Assembly"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.input}
                value={name}
              />
            </View>

            <View style={styles.timeRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>START TIME *</Text>
                <TextInput
                  onChangeText={setStartTime}
                  placeholder="08:00"
                  placeholderTextColor={colors.textPlaceholder}
                  style={styles.input}
                  value={startTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>END TIME *</Text>
                <TextInput
                  onChangeText={setEndTime}
                  placeholder="08:45"
                  placeholderTextColor={colors.textPlaceholder}
                  style={styles.input}
                  value={endTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Mark as Break / Lunch</Text>
                <Text style={styles.switchDesc}>Break slots are excluded from teaching schedules.</Text>
              </View>
              <Switch
                onValueChange={setIsBreak}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#fff"
                value={isBreak}
              />
            </View>

            {modalError ? (
              <View style={styles.errorBox}>
                <Ionicons color="#B42318" name="alert-circle-outline" size={16} />
                <Text style={styles.errorText}>{modalError}</Text>
              </View>
            ) : null}

            <View style={styles.sheetActions}>
              <Pressable onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={submitting}
                onPress={handleSave}
                style={[styles.saveBtn, submitting && styles.btnDisabled]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveText}>{editingSlot ? 'Save' : 'Add'}</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  addBtn: { width: 36, alignItems: 'flex-end' },

  listContent: { paddingBottom: 40 },
  pageHeading: { backgroundColor: colors.surface, padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8, marginBottom: 20 },
  kicker: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  pageTitle: { color: colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },

  slotList: { paddingHorizontal: 16, gap: 12 },
  slotCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 },
  slotCardBreak: { backgroundColor: '#FFF4E0', borderColor: '#FBBF7A' },
  slotOrder: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  slotOrderText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  slotInfo: { flex: 1, gap: 4 },
  slotName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  slotTimesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slotTime: { color: colors.textSecondary, fontSize: 13 },
  breakBadge: { backgroundColor: '#FFF4E0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#FBBF7A' },
  breakBadgeText: { color: '#92400E', fontSize: 11, fontWeight: '700' },
  slotActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.surfaceMuted },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyState: { alignItems: 'center', padding: 40, gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: colors.accentDark, fontWeight: '700', fontSize: 14 },
  addInlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
  addInlineBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  field: { gap: 6 },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  input: { height: 50, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary },
  timeRow: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  switchDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF1F1', borderRadius: 10, padding: 12 },
  errorText: { color: '#B42318', fontSize: 13, flex: 1, fontWeight: '600' },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, height: 50, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.45 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
