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

import { useAuth } from '../context/AuthContext';
import {
  getAdminMappings,
  createAdminMapping,
  deleteAdminMapping,
  getSchoolAdminClasses,
  getSchoolAdminTeachers,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { MappingOut, ClassOut, TeacherOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminMapping'>;

const STATUS_OPTIONS = ['all', 'ongoing', 'completed'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`,
  `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
  `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}`,
];

function statusBadge(status: string) {
  if (status === 'ongoing') return { bg: '#E8F7EE', text: '#127A40' };
  if (status === 'completed') return { bg: '#F4F3F3', text: '#707884' };
  return { bg: colors.accentSoft, text: colors.accentDark };
}

export function SchoolAdminMappingScreen({ navigation }: Props) {
  const { session } = useAuth();

  const [mappings, setMappings] = useState<MappingOut[]>([]);
  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [teachers, setTeachers] = useState<TeacherOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Add modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newClassId, setNewClassId] = useState<number | null>(null);
  const [newSection, setNewSection] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTeacherId, setNewTeacherId] = useState<number | null>(null);
  const [newYear, setNewYear] = useState(YEAR_OPTIONS[1]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [mData, cData, tData] = await Promise.all([
          getAdminMappings(session.token),
          getSchoolAdminClasses(session.token),
          getSchoolAdminTeachers(session.token),
        ]);
        setMappings(mData);
        setClasses(cData);
        setTeachers(tData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load mappings.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    return mappings.filter((m) => {
      if (filterClass && m.class_?.name !== filterClass) return false;
      if (filterSection && m.section !== filterSection) return false;
      if (filterSubject && !m.name.toLowerCase().includes(filterSubject.toLowerCase())) return false;
      if (filterTeacher && m.teacher?.name !== filterTeacher) return false;
      if (filterYear && m.academic_year !== filterYear) return false;
      return true;
    });
  }, [mappings, filterClass, filterSection, filterSubject, filterTeacher, filterYear]);

  const uniqueClasses = useMemo(() => [...new Set(mappings.map((m) => m.class_?.name ?? '').filter(Boolean))], [mappings]);
  const uniqueSections = useMemo(() => [...new Set(mappings.map((m) => m.section ?? '').filter(Boolean))], [mappings]);
  const uniqueTeachers = useMemo(() => [...new Set(mappings.map((m) => m.teacher?.name ?? '').filter(Boolean))], [mappings]);
  const uniqueYears = useMemo(() => [...new Set(mappings.map((m) => m.academic_year ?? '').filter(Boolean))], [mappings]);

  const openAddModal = () => {
    setNewClassId(classes[0]?.id ?? null);
    setNewSection('');
    setNewSubjectName('');
    setNewTeacherId(null);
    setNewYear(YEAR_OPTIONS[1]);
    setModalError(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!session || submitting) return;
    if (!newClassId) { setModalError('Please select a class.'); return; }
    if (!newSubjectName.trim()) { setModalError('Subject name is required.'); return; }

    setSubmitting(true);
    setModalError(null);
    try {
      await createAdminMapping(session.token, {
        class_id: newClassId,
        section: newSection.trim() || null,
        subject_name: newSubjectName.trim(),
        teacher_id: newTeacherId,
        academic_year: newYear || null,
        status: 'ongoing',
      });
      setModalVisible(false);
      void load(true);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Failed to create mapping.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (mapping: MappingOut) => {
    Alert.alert(
      'Delete Mapping',
      `Delete "${mapping.name}" for class ${mapping.class_?.name ?? ''}${mapping.section ? ` - ${mapping.section}` : ''}? This will delete all chapters and recordings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            try {
              await deleteAdminMapping(session.token, mapping.id);
              void load(true);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete.');
            }
          },
        },
      ],
    );
  };

  const activeFilterCount = [filterClass, filterSection, filterSubject, filterTeacher, filterYear].filter(Boolean).length;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Class Mappings</Text>
        <Pressable onPress={openAddModal} style={styles.addBtn}>
          <Ionicons color={colors.accent} name="add-circle" size={28} />
        </Pressable>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        <FilterChip
          label="Class"
          value={filterClass}
          options={['', ...uniqueClasses]}
          onSelect={setFilterClass}
        />
        <FilterChip
          label="Section"
          value={filterSection}
          options={['', ...uniqueSections]}
          onSelect={setFilterSection}
        />
        <FilterChip
          label="Subject"
          value={filterSubject}
          options={[]}
          textValue={filterSubject}
          onTextChange={setFilterSubject}
          isText
        />
        <FilterChip
          label="Teacher"
          value={filterTeacher}
          options={['', ...uniqueTeachers]}
          onSelect={setFilterTeacher}
        />
        <FilterChip
          label="Year"
          value={filterYear}
          options={['', ...uniqueYears]}
          onSelect={setFilterYear}
        />
        {activeFilterCount > 0 && (
          <Pressable
            onPress={() => { setFilterClass(''); setFilterSection(''); setFilterSubject(''); setFilterTeacher(''); setFilterYear(''); }}
            style={styles.clearBtn}
          >
            <Ionicons color={colors.accent} name="close-circle" size={14} />
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading mappings…</Text>
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
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, styles.colClass]}>CLASS</Text>
            <Text style={[styles.thCell, styles.colSection]}>SEC</Text>
            <Text style={[styles.thCell, styles.colSubject]}>SUBJECT</Text>
            <Text style={[styles.thCell, styles.colTeacher]}>TEACHER</Text>
            <Text style={[styles.thCell, styles.colYear]}>YEAR</Text>
            <Text style={[styles.thCell, styles.colAction]}>ACTION</Text>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyTable}>
              <Ionicons color={colors.textMuted} name="grid-outline" size={40} />
              <Text style={styles.emptyTitle}>No mappings found</Text>
              <Text style={styles.emptyBody}>
                {activeFilterCount > 0
                  ? 'Try adjusting your filters.'
                  : 'Tap + to add a class–subject mapping.'}
              </Text>
            </View>
          ) : (
            filtered.map((m) => {
              const badge = statusBadge(m.status);
              return (
                <View key={m.id} style={styles.tableRow}>
                  <Text style={[styles.tdCell, styles.colClass]} numberOfLines={1}>
                    {m.class_?.name ?? '—'}
                  </Text>
                  <Text style={[styles.tdCell, styles.colSection]} numberOfLines={1}>
                    {m.section ?? '—'}
                  </Text>
                  <View style={styles.colSubject}>
                    <Text style={styles.tdSubject} numberOfLines={1}>{m.name}</Text>
                    <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusPillText, { color: badge.text }]}>
                        {m.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tdCell, styles.colTeacher]} numberOfLines={1}>
                    {m.teacher?.name ?? '—'}
                  </Text>
                  <Text style={[styles.tdCell, styles.colYear]} numberOfLines={1}>
                    {m.academic_year ?? '—'}
                  </Text>
                  <View style={[styles.colAction, { flexDirection: 'row', gap: 6 }]}>
                    <Pressable
                      onPress={() =>
                        navigation.navigate('SchoolAdminChapterView', {
                          subjectId: m.id,
                          subjectName: m.name,
                          section: m.section ?? undefined,
                          className: m.class_?.name ?? undefined,
                          teacherName: m.teacher?.name ?? undefined,
                          year: m.academic_year ?? undefined,
                        })
                      }
                      style={styles.showBtn}
                    >
                      <Text style={styles.showBtnText}>Show</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(m)} hitSlop={8}>
                      <Ionicons color="#B42318" name="trash-outline" size={16} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add Mapping Modal */}
      <Modal animationType="slide" onRequestClose={() => setModalVisible(false)} transparent visible={modalVisible}>
        <Pressable onPress={() => setModalVisible(false)} style={styles.overlay}>
          <Pressable style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Add Class Mapping</Text>
            <Text style={styles.sheetSubtitle}>Assign a subject to a class section and teacher.</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
              {/* Class */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>CLASS *</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={newClassId ?? undefined}
                    onValueChange={(v) => setNewClassId(Number(v))}
                    style={styles.picker}
                  >
                    {classes.map((c) => (
                      <Picker.Item key={c.id} label={`Class ${c.name}`} value={c.id} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Section */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>SECTION</Text>
                <TextInput
                  autoCapitalize="characters"
                  maxLength={5}
                  onChangeText={setNewSection}
                  placeholder="e.g. A, B, C"
                  placeholderTextColor={colors.textPlaceholder}
                  style={styles.input}
                  value={newSection}
                />
              </View>

              {/* Subject Name */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>SUBJECT NAME *</Text>
                <TextInput
                  autoCapitalize="words"
                  onChangeText={setNewSubjectName}
                  placeholder="e.g. Mathematics, Physics"
                  placeholderTextColor={colors.textPlaceholder}
                  style={styles.input}
                  value={newSubjectName}
                />
              </View>

              {/* Teacher */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>TEACHER</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={newTeacherId ?? -1}
                    onValueChange={(v) => setNewTeacherId(v === -1 ? null : Number(v))}
                    style={styles.picker}
                  >
                    <Picker.Item label="— No Teacher —" value={-1} />
                    {teachers.map((t) => (
                      <Picker.Item key={t.id} label={t.name} value={t.id} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Academic Year */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>ACADEMIC YEAR</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={newYear}
                    onValueChange={(v) => setNewYear(String(v))}
                    style={styles.picker}
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <Picker.Item key={y} label={y} value={y} />
                    ))}
                  </Picker>
                </View>
              </View>

              {modalError ? (
                <View style={styles.errorBox}>
                  <Ionicons color="#B42318" name="alert-circle-outline" size={16} />
                  <Text style={styles.errorText}>{modalError}</Text>
                </View>
              ) : null}
            </ScrollView>

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
    </SafeAreaView>
  );
}

// ── FilterChip ────────────────────────────────────────────────────────────────

function FilterChip({
  label,
  value,
  options,
  onSelect,
  isText,
  textValue,
  onTextChange,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect?: (v: string) => void;
  isText?: boolean;
  textValue?: string;
  onTextChange?: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = Boolean(value);

  if (isText) {
    return (
      <View style={[styles.chip, isActive && styles.chipActive]}>
        <TextInput
          placeholder={label}
          placeholderTextColor={isActive ? colors.accentDark : colors.textMuted}
          onChangeText={onTextChange}
          value={textValue}
          style={[styles.chipText, isActive && styles.chipTextActive, { minWidth: 60 }]}
        />
      </View>
    );
  }

  return (
    <View>
      <Pressable
        onPress={() => setOpen((p) => !p)}
        style={[styles.chip, isActive && styles.chipActive]}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]} numberOfLines={1}>
          {value || label}
        </Text>
        <Ionicons
          color={isActive ? colors.accentDark : colors.textMuted}
          name={open ? 'chevron-up' : 'chevron-down'}
          size={12}
        />
      </Pressable>
      {open && (
        <View style={styles.chipDropdown}>
          {options.map((opt) => (
            <Pressable
              key={opt || '__all__'}
              onPress={() => { onSelect?.(opt); setOpen(false); }}
              style={styles.chipOption}
            >
              <Text style={[styles.chipOptionText, opt === value && styles.chipOptionActive]}>
                {opt || `All ${label}s`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const COL_CLASS = 56;
const COL_SECTION = 44;
const COL_SUBJECT = 120;
const COL_TEACHER = 100;
const COL_YEAR = 80;
const COL_ACTION = 100;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { width: 36 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  addBtn: { width: 36, alignItems: 'flex-end' },

  // Filters
  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 52,
  },
  filterBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.accentDark },
  chipDropdown: {
    position: 'absolute',
    top: 36,
    left: 0,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    paddingVertical: 4,
  },
  chipOption: { paddingHorizontal: 14, paddingVertical: 10 },
  chipOptionText: { color: colors.textSecondary, fontSize: 13 },
  chipOptionActive: { color: colors.accent, fontWeight: '700' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  clearBtnText: { color: colors.accent, fontSize: 12, fontWeight: '600' },

  // Table
  listContent: { paddingBottom: 40 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thCell: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  tdCell: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  tdSubject: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },

  colClass: { width: COL_CLASS },
  colSection: { width: COL_SECTION },
  colSubject: { width: COL_SUBJECT, gap: 4 },
  colTeacher: { width: COL_TEACHER },
  colYear: { width: COL_YEAR },
  colAction: { width: COL_ACTION, alignItems: 'center' },

  statusPill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  showBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  showBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTable: { alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: colors.accentDark, fontWeight: '700', fontSize: 14 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    maxHeight: '90%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  sheetSubtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  field: { gap: 6 },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  input: {
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  pickerWrap: {
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: { height: 50, color: colors.textPrimary },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F1',
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: '#B42318', fontSize: 13, flex: 1, fontWeight: '600' },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1, height: 50, borderRadius: 12, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
