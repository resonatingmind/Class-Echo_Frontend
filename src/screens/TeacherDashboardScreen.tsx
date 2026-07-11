import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TeacherTabBar } from '../components/TeacherTabBar';
import { useAuth } from '../context/AuthContext';
import { getTeacherClasses, getTeacherMe } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { MappingOut, TeacherOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherDashboard'>;

function statusBadge(status: string) {
  if (status === 'ongoing') return { bg: '#E8F7EE', text: '#127A40', label: 'Ongoing' };
  if (status === 'completed') return { bg: '#F4F3F3', text: '#707884', label: 'Completed' };
  return { bg: colors.accentSoft, text: colors.accentDark, label: status };
}

export function TeacherDashboardScreen({ navigation }: Props) {
  const { session } = useAuth();

  const [classes, setClasses] = useState<MappingOut[]>([]);
  const [teacher, setTeacher] = useState<TeacherOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [cData, tData] = await Promise.all([
          getTeacherClasses(session.token),
          getTeacherMe(session.token),
        ]);
        setClasses(cData);
        setTeacher(tData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load classes.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    return classes.filter((c) => {
      if (filterClass && c.class_?.name !== filterClass) return false;
      if (filterSection && c.section !== filterSection) return false;
      if (filterSubject && !c.name.toLowerCase().includes(filterSubject.toLowerCase())) return false;
      if (filterYear && c.academic_year !== filterYear) return false;
      if (filterStatus && c.status !== filterStatus) return false;
      return true;
    });
  }, [classes, filterClass, filterSection, filterSubject, filterYear, filterStatus]);

  const uniqueClasses = useMemo(() => [...new Set(classes.map((c) => c.class_?.name ?? '').filter(Boolean))], [classes]);
  const uniqueSections = useMemo(() => [...new Set(classes.map((c) => c.section ?? '').filter(Boolean))], [classes]);
  const uniqueYears = useMemo(() => [...new Set(classes.map((c) => c.academic_year ?? '').filter(Boolean))], [classes]);

  const activeFilters = [filterClass, filterSection, filterSubject, filterYear, filterStatus].filter(Boolean).length;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Classes</Text>
          {teacher?.school_name ? (
            <Text style={styles.headerSchool}>{teacher.school_name}</Text>
          ) : null}
        </View>
        <Pressable onPress={() => navigation.navigate('TeacherProfile')} style={styles.avatarBtn}>
          <Ionicons color={colors.accent} name="person" size={18} />
        </Pressable>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {[
          { label: 'Class', value: filterClass, opts: uniqueClasses, set: setFilterClass },
          { label: 'Section', value: filterSection, opts: uniqueSections, set: setFilterSection },
          { label: 'Year', value: filterYear, opts: uniqueYears, set: setFilterYear },
          { label: 'Status', value: filterStatus, opts: ['ongoing', 'completed'], set: setFilterStatus },
        ].map((f) => (
          <FilterPill
            key={f.label}
            label={f.label}
            value={f.value}
            options={['', ...f.opts]}
            onSelect={f.set}
          />
        ))}
        {activeFilters > 0 && (
          <Pressable
            onPress={() => { setFilterClass(''); setFilterSection(''); setFilterSubject(''); setFilterYear(''); setFilterStatus(''); }}
            style={styles.clearBtn}
          >
            <Ionicons color={colors.accent} name="close-circle" size={14} />
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading your classes…</Text>
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
        <>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, styles.colClass]}>CLASS</Text>
            <Text style={[styles.thCell, styles.colSection]}>SEC</Text>
            <Text style={[styles.thCell, styles.colSubject]}>SUBJECT</Text>
            <Text style={[styles.thCell, styles.colYear]}>YEAR</Text>
            <Text style={[styles.thCell, styles.colStatus]}>STATUS</Text>
            <Text style={[styles.thCell, styles.colAction]}>ACTION</Text>
          </View>

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
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons color={colors.textMuted} name="school-outline" size={48} />
                <Text style={styles.emptyTitle}>
                  {activeFilters > 0 ? 'No matches found' : 'No classes assigned'}
                </Text>
                <Text style={styles.emptyBody}>
                  {activeFilters > 0
                    ? 'Try clearing filters.'
                    : 'Your school admin will assign classes to you.'}
                </Text>
              </View>
            ) : (
              filtered.map((c) => {
                const badge = statusBadge(c.status);
                return (
                  <View key={c.id} style={styles.tableRow}>
                    <Text style={[styles.tdCell, styles.colClass]} numberOfLines={1}>
                      {c.class_?.name ?? '—'}
                    </Text>
                    <Text style={[styles.tdCell, styles.colSection]} numberOfLines={1}>
                      {c.section ?? '—'}
                    </Text>
                    <Text style={[styles.tdSubject, styles.colSubject]} numberOfLines={2}>
                      {c.name}
                    </Text>
                    <Text style={[styles.tdCell, styles.colYear]} numberOfLines={1}>
                      {c.academic_year ?? '—'}
                    </Text>
                    <View style={styles.colStatus}>
                      <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusPillText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.colAction}>
                      <Pressable
                        onPress={() =>
                          navigation.navigate('TeacherChapterView', {
                            subjectId: c.id,
                            subjectName: c.name,
                            section: c.section ?? undefined,
                            className: c.class_?.name ?? undefined,
                          })
                        }
                        style={styles.showBtn}
                      >
                        <Text style={styles.showBtnText}>Show</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      )}

      <TeacherTabBar
        active="home"
        onTabPress={(key) => {
          if (key === 'account') navigation.navigate('TeacherProfile');
          if (key === 'timetable') navigation.navigate('TeacherTimetable');
        }}
      />
    </SafeAreaView>
  );
}

function FilterPill({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = Boolean(value);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((p) => !p)}
        style={[styles.pill, isActive && styles.pillActive]}
      >
        <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
          {value || label}
        </Text>
        <Ionicons
          color={isActive ? colors.accentDark : colors.textMuted}
          name={open ? 'chevron-up' : 'chevron-down'}
          size={12}
        />
      </Pressable>
      {open && (
        <View style={styles.pillDropdown}>
          {options.map((opt) => (
            <Pressable
              key={opt || '__all__'}
              onPress={() => { onSelect(opt); setOpen(false); }}
              style={styles.pillOption}
            >
              <Text style={[styles.pillOptionText, opt === value && styles.pillOptionActive]}>
                {opt || `All ${label}s`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

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
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  headerSchool: { color: colors.textMuted, fontSize: 11 },
  avatarBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center',
  },

  filterBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: 52 },
  filterBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceMuted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pillText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: colors.accentDark },
  pillDropdown: { position: 'absolute', top: 36, left: 0, minWidth: 140, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, zIndex: 100, elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, paddingVertical: 4 },
  pillOption: { paddingHorizontal: 14, paddingVertical: 10 },
  pillOptionText: { color: colors.textSecondary, fontSize: 13 },
  pillOptionActive: { color: colors.accent, fontWeight: '700' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  clearText: { color: colors.accent, fontSize: 12, fontWeight: '600' },

  tableHeader: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  thCell: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },

  listContent: { paddingBottom: 40 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  tdCell: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  tdSubject: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },

  colClass: { width: 52 },
  colSection: { width: 40 },
  colSubject: { flex: 1, paddingRight: 4 },
  colYear: { width: 70 },
  colStatus: { width: 72 },
  colAction: { width: 60 },

  statusPill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  showBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  showBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyState: { alignItems: 'center', padding: 40, gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: colors.accentDark, fontWeight: '700', fontSize: 14 },
});
