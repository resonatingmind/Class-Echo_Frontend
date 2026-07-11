import { useCallback, useMemo, useState } from 'react';
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
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

import { TeacherTabBar } from '../components/TeacherTabBar';
import { useAuth } from '../context/AuthContext';
import {
  getTeacherTimetable,
  getSchoolTimeSlots,
  createTeacherTimetableEntry,
  deleteTeacherTimetableEntry,
  getTeacherClasses,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { TimetableOut, TimeSlotOut, MappingOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherTimetable'>;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CELL_COLORS = [
  { bg: '#D1E4FF', text: colors.accentDark, border: '#A8C8FF' },
  { bg: '#E8F7EE', text: '#127A40', border: '#A3D9B8' },
  { bg: '#FFF4E0', text: '#92400E', border: '#FBBF7A' },
  { bg: '#F5F0FF', text: '#6B21A8', border: '#D8C4F8' },
  { bg: '#FFE8EC', text: '#9B1239', border: '#F9A8BE' },
];

export function TeacherTimetableScreen({ navigation }: Props) {
  const { session } = useAuth();

  const [entries, setEntries] = useState<TimetableOut[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotOut[]>([]);
  const [myClasses, setMyClasses] = useState<MappingOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Entry Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selDay, setSelDay] = useState(0);
  const [selSlotId, setSelSlotId] = useState<number | null>(null);
  const [selSubjectId, setSelSubjectId] = useState<number | null>(null);
  const [selRoom, setSelRoom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [ttData, slotsData, classesData] = await Promise.all([
          getTeacherTimetable(session.token),
          getSchoolTimeSlots(session.token),
          getTeacherClasses(session.token),
        ]);
        setEntries(ttData);
        setTimeSlots(slotsData.filter((s) => !s.is_break).sort((a, b) => a.display_order - b.display_order));
        setMyClasses(classesData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load timetable.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Build a lookup: day → slotId → entry
  const grid = useMemo<Record<number, Record<number, TimetableOut>>>(() => {
    const map: Record<number, Record<number, TimetableOut>> = {};
    for (let d = 0; d < 6; d++) map[d] = {};
    for (const e of entries) {
      map[e.day_of_week] = map[e.day_of_week] ?? {};
      map[e.day_of_week][e.time_slot_id] = e;
    }
    return map;
  }, [entries]);

  const openModal = (day: number) => {
    setSelDay(day);
    setSelSlotId(timeSlots[0]?.id ?? null);
    setSelSubjectId(myClasses[0]?.id ?? null);
    setSelRoom('');
    setModalError(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!session || submitting) return;
    if (!selSlotId) { setModalError('Select a time slot.'); return; }

    setSubmitting(true);
    setModalError(null);
    try {
      await createTeacherTimetableEntry(session.token, {
        subject_id: selSubjectId,
        day_of_week: selDay,
        time_slot_id: selSlotId,
        room_number: selRoom.trim() || null,
      });
      setModalVisible(false);
      void load(true);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = (entry: TimetableOut) => {
    const slot = timeSlots.find((s) => s.id === entry.time_slot_id);
    const label = slot ? `${slot.start_time}–${slot.end_time}` : 'this slot';
    Alert.alert('Remove Entry', `Remove ${DAYS[entry.day_of_week]} ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!session) return;
          try {
            await deleteTeacherTimetableEntry(session.token, entry.id);
            void load(true);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not remove.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>My Timetable</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading timetable…</Text>
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
      ) : timeSlots.length === 0 ? (
        <View style={styles.center}>
          <Ionicons color={colors.textMuted} name="time-outline" size={48} />
          <Text style={styles.emptyTitle}>No time slots configured</Text>
          <Text style={styles.emptyBody}>
            Your school admin needs to set up time slots before you can create a timetable.
          </Text>
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
          {/* Time slot header row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Header: Day label + slot columns */}
              <View style={styles.gridHeader}>
                <View style={styles.dayLabelCell}>
                  <Text style={styles.gridHeaderText}>DAY</Text>
                </View>
                {timeSlots.map((slot) => (
                  <View key={slot.id} style={styles.slotHeaderCell}>
                    <Text style={styles.slotHeaderTime}>{slot.start_time}</Text>
                    <Text style={styles.slotHeaderDash}>↓</Text>
                    <Text style={styles.slotHeaderTime}>{slot.end_time}</Text>
                  </View>
                ))}
                <View style={styles.addColHeader}>
                  <Text style={styles.gridHeaderText}>ADD</Text>
                </View>
              </View>

              {/* Day rows */}
              {DAYS.map((day, dayIdx) => (
                <View key={day} style={styles.gridRow}>
                  <View style={styles.dayLabelCell}>
                    <Text style={styles.dayLabel}>{SHORT_DAYS[dayIdx]}</Text>
                  </View>
                  {timeSlots.map((slot, slotIdx) => {
                    const entry = grid[dayIdx]?.[slot.id];
                    const c = CELL_COLORS[slotIdx % CELL_COLORS.length];

                    if (entry) {
                      const subjectName = entry.subject?.name ?? '—';
                      return (
                        <Pressable
                          key={slot.id}
                          onLongPress={() => handleDeleteEntry(entry)}
                          style={[styles.filledCell, { backgroundColor: c.bg, borderColor: c.border }]}
                        >
                          <Text style={[styles.cellSubject, { color: c.text }]} numberOfLines={2}>
                            {subjectName}
                          </Text>
                          {entry.room_number ? (
                            <Text style={[styles.cellRoom, { color: c.text }]}>
                              Rm {entry.room_number}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    }

                    return (
                      <View key={slot.id} style={styles.emptyCell}>
                        <Text style={styles.freeCellText}>Free</Text>
                      </View>
                    );
                  })}
                  <Pressable onPress={() => openModal(dayIdx)} style={styles.addDayBtn}>
                    <Ionicons color={colors.accent} name="add" size={18} />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.legend}>
            <Ionicons color={colors.textMuted} name="information-circle-outline" size={14} />
            <Text style={styles.legendText}>Long-press a scheduled slot to remove it.</Text>
          </View>
        </ScrollView>
      )}

      {/* Add Entry Modal */}
      <Modal animationType="slide" onRequestClose={() => setModalVisible(false)} transparent visible={modalVisible}>
        <Pressable onPress={() => setModalVisible(false)} style={styles.overlay}>
          <Pressable style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Add to {DAYS[selDay]}</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>TIME SLOT *</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={selSlotId ?? undefined}
                  onValueChange={(v) => setSelSlotId(Number(v))}
                  style={styles.picker}
                >
                  {timeSlots.map((s) => (
                    <Picker.Item
                      key={s.id}
                      label={`${s.start_time} – ${s.end_time} (${s.name})`}
                      value={s.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>SUBJECT</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={selSubjectId ?? -1}
                  onValueChange={(v) => setSelSubjectId(v === -1 ? null : Number(v))}
                  style={styles.picker}
                >
                  <Picker.Item label="— Free Period —" value={-1} />
                  {myClasses.map((c) => (
                    <Picker.Item
                      key={c.id}
                      label={`${c.name}${c.class_?.name ? ` (${c.class_.name}${c.section ? `-${c.section}` : ''})` : ''}`}
                      value={c.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ROOM NUMBER</Text>
              <TextInput
                onChangeText={setSelRoom}
                placeholder="e.g. 204, Lab 1"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.input}
                value={selRoom}
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
                  <Text style={styles.saveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <TeacherTabBar
        active="timetable"
        onTabPress={(key) => {
          if (key === 'home') navigation.navigate('TeacherDashboard');
          if (key === 'account') navigation.navigate('TeacherProfile');
        }}
      />
    </SafeAreaView>
  );
}

const DAY_LABEL_W = 44;
const SLOT_CELL_W = 96;
const ADD_COL_W = 44;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.textPrimary, fontSize: 17, fontWeight: '700' },

  listContent: { paddingBottom: 40 },

  // Grid
  gridHeader: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayLabelCell: { width: DAY_LABEL_W, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  slotHeaderCell: { width: SLOT_CELL_W, alignItems: 'center', paddingVertical: 8, borderLeftWidth: 1, borderLeftColor: colors.border },
  slotHeaderTime: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  slotHeaderDash: { color: colors.textMuted, fontSize: 9 },
  addColHeader: { width: ADD_COL_W, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.border },
  gridHeaderText: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },

  gridRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  dayLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  filledCell: { width: SLOT_CELL_W, minHeight: 56, padding: 6, borderLeftWidth: 1, borderLeftColor: 'transparent', gap: 2, justifyContent: 'center' },
  emptyCell: { width: SLOT_CELL_W, minHeight: 56, borderLeftWidth: 1, borderLeftColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  freeCellText: { color: colors.textMuted, fontSize: 10, fontStyle: 'italic' },
  cellSubject: { fontSize: 11, fontWeight: '700', lineHeight: 14 },
  cellRoom: { fontSize: 10, opacity: 0.7 },
  addDayBtn: { width: ADD_COL_W, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.border },

  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 16 },
  legendText: { color: colors.textMuted, fontSize: 12, flex: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  retryBtn: { backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: colors.accentDark, fontWeight: '700', fontSize: 14 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  field: { gap: 6 },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  input: { height: 50, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary },
  pickerWrap: { borderRadius: 12, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden' },
  picker: { height: 50, color: colors.textPrimary },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF1F1', borderRadius: 10, padding: 12 },
  errorText: { color: '#B42318', fontSize: 13, flex: 1, fontWeight: '600' },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, height: 50, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.45 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
