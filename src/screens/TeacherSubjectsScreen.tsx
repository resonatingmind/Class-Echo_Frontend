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

import { RootStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";

import { TeacherDashboardSubject } from "../types/api";
import { SubjectOut, TeacherOut } from "../types/api";

import { getTeacherMe, getTeacherSubjects } from "../lib/api";
import { getTeacherDashboard } from "../lib/api";

import {
  SelectionBottomSheet,
  SelectionItem,
} from "../components/common/SelectionBottomSheet";
import { useAuth } from '../context/AuthContext';
import { TeacherAssignmentTable } from "../components/teacher/TeacherAssignmentTable";
import { TeacherFilters } from "../components/teacher/TeacherFilters";
import { ActiveFilterChips } from "../components/teacher/ActiveFilterChips";




type Props = NativeStackScreenProps<RootStackParamList, 'TeacherSubjects'>;

const SUBJECT_COLORS = [
  { bg: '#D1E4FF', text: colors.accentDark, border: '#A8C8FF' },
  { bg: '#E8F7EE', text: '#127A40', border: '#A3D9B8' },
  { bg: '#FFF4E0', text: '#92400E', border: '#FBBF7A' },
  { bg: '#F5F0FF', text: '#6B21A8', border: '#D8C4F8' },
  { bg: '#FFE8EC', text: '#9B1239', border: '#F9A8BE' },
];

type SubjectGroup = { className: string; subjects: SubjectOut[] };

export function TeacherSubjectsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [subjects, setSubjects] = useState<SubjectOut[]>([]);

  const [dashboardRows, setDashboardRows] = useState<TeacherDashboardSubject[]>(
    [],
  );

  const [selectedClass, setSelectedClass] = useState<string>();

  const classOptions: SelectionItem[] = useMemo(() => {
    const values = [...new Set(dashboardRows.map((r) => r.class_name))];

    return [
      { id: "", label: "All Classes" },
      ...values.map((value) => ({
        id: value,
        label: value,
      })),
    ];
  }, [dashboardRows]);

  const sectionOptions: SelectionItem[] = useMemo(() => {
    const values = [
      ...new Set(
        dashboardRows
          .filter((r) => !selectedClass || r.class_name === selectedClass)
          .map((r) => r.section),
      ),
    ];

    return [
      { id: "", label: "All Sections" },
      ...values.map((value) => ({
        id: value,
        label: value,
      })),
    ];
  }, [dashboardRows, selectedClass]);

  const subjectOptions: SelectionItem[] = useMemo(() => {
    const values = [...new Set(dashboardRows.map((r) => r.subject_name))];

    return [
      { id: "", label: "All Subjects" },
      ...values.map((value) => ({
        id: value,
        label: value,
      })),
    ];
  }, [dashboardRows]);

  const statusOptions: SelectionItem[] = [
    { id: "", label: "All Status" },
    { id: "Completed", label: "Completed" },
    { id: "Processing", label: "Processing" },
    { id: "Failed", label: "Failed" },
    { id: "No Recording", label: "No Recording" },
  ];

  const [teacher, setTeacher] = useState<TeacherOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // const [selectedClass, setSelectedClass] = useState<string>();
  const [selectedSection, setSelectedSection] = useState<string>();
  const [selectedSubject, setSelectedSubject] = useState<string>();
  const [selectedStatus, setSelectedStatus] = useState<string>();

  const [classSheetVisible, setClassSheetVisible] = useState(false);
  const [sectionSheetVisible, setSectionSheetVisible] = useState(false);
  const [subjectSheetVisible, setSubjectSheetVisible] = useState(false);
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);

  const activeChips = [
    selectedClass && {
      label: "Class",
      value: selectedClass,
      onRemove: () => setSelectedClass(undefined),
    },

    selectedSection && {
      label: "Section",
      value: selectedSection,
      onRemove: () => setSelectedSection(undefined),
    },

    selectedSubject && {
      label: "Subject",
      value: selectedSubject,
      onRemove: () => setSelectedSubject(undefined),
    },

    selectedStatus && {
      label: "Status",
      value: selectedStatus,
      onRemove: () => setSelectedStatus(undefined),
    },
  ].filter(Boolean);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [subs, me] = await Promise.all([
          getTeacherSubjects(session.token),
          getTeacherMe(session.token),
        ]);

        setSubjects(subs);

        const dashboard = await getTeacherDashboard(session.token);

        setDashboardRows(dashboard.subjects);
        setTeacher(me);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load subjects');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(true); };

  // const filteredSubjects = subjects.filter((subject) => {
  //   if (!search.trim()) return true;

  //   const query = search.toLowerCase();

  //   return (
  //     subject.name.toLowerCase().includes(query) ||
  //     subject.class_?.name?.toLowerCase().includes(query) ||
  //     subject.class_?.section?.toLowerCase().includes(query)
  //   );
  // });

  const filteredRows = useMemo(() => {
    return dashboardRows.filter((row) => {
      if (
        search &&
        !(
          row.subject_name.toLowerCase().includes(search.toLowerCase()) ||
          row.class_name.toLowerCase().includes(search.toLowerCase()) ||
          row.section.toLowerCase().includes(search.toLowerCase())
        )
      ) {
        return false;
      }

      if (selectedClass && row.class_name !== selectedClass) {
        return false;
      }

      if (selectedSection && row.section !== selectedSection) {
        return false;
      }

      if (selectedSubject && row.subject_name !== selectedSubject) {
        return false;
      }

      if (selectedStatus && row.ai_status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [
    dashboardRows,
    search,
    selectedClass,
    selectedSection,
    selectedSubject,
    selectedStatus,
  ]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Teacher Hub</Text>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => navigation.navigate("TeacherProfile")}
            style={styles.avatarCircle}
          >
            <Ionicons color={colors.accent} name="person" size={18} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Page heading */}
        <View style={styles.pageHeading}>
          {teacher?.school_name ? (
            <Text style={styles.schoolKicker}>
              {teacher.school_name.toUpperCase()}
            </Text>
          ) : null}
          <Text style={styles.pageTitle}>My Subjects</Text>
          <Text style={styles.pageSubtitle}>
            Manage your assigned classes and track recordings.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>Loading your subjects…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons
              color={colors.textMuted}
              name="cloud-offline-outline"
              size={40}
            />
            <Text style={styles.emptyTitle}>Could not load subjects</Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : subjects.length === 0 ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="book-outline" size={44} />
            <Text style={styles.emptyTitle}>No subjects assigned</Text>
            <Text style={styles.emptyBody}>
              Your school admin will assign subjects to you.
            </Text>
          </View>
        ) : (
          <>
            <TeacherFilters
              search={search}
              onSearchChange={setSearch}
              selectedClass={selectedClass}
              selectedSection={selectedSection}
              selectedSubject={selectedSubject}
              selectedStatus={selectedStatus}
              onSelectClass={() => setClassSheetVisible(true)}
              onSelectSection={() => setSectionSheetVisible(true)}
              onSelectSubject={() => setSubjectSheetVisible(true)}
              onSelectStatus={() => setStatusSheetVisible(true)}
            />

            <ActiveFilterChips
              chips={activeChips as any}
              onClearAll={() => {
                setSelectedClass(undefined);
                setSelectedSection(undefined);
                setSelectedSubject(undefined);
                setSelectedStatus(undefined);
              }}
            />

            {filteredRows.length === 0 ? (
              <View style={styles.emptyFilters}>
                <Ionicons name="search" size={46} color={colors.textMuted} />

                <Text style={styles.emptyTitle}>No matching subjects</Text>

                <Text style={styles.emptyBody}>
                  Try changing your search or filters.
                </Text>

                <Pressable
                  style={styles.retryBtn}
                  onPress={() => {
                    setSearch("");
                    setSelectedClass(undefined);
                    setSelectedSection(undefined);
                    setSelectedSubject(undefined);
                    setSelectedStatus(undefined);
                  }}
                >
                  <Text style={styles.retryText}>Clear Filters</Text>
                </Pressable>
              </View>
            ) : (
              // <TeacherAssignmentTable
              //   rows={filteredRows}
              //   onOpenSubject={(row) => {
              //     navigation.navigate("TeacherSubjectDetail", {
              //       subjectId: row.subject_id,
              //       subjectName: row.subject_name,
              //     });
              //   }}
              // />

              <TeacherAssignmentTable
                rows={filteredRows}
                onOpenSubject={(row) => {
                  // 1. Tapping the main row takes them to the standard details screen
                  navigation.navigate("TeacherSubjectDetail", {
                    subjectId: row.subject_id,
                    subjectName: row.subject_name,
                  });
                }}
                onOpenWorkspace={(row) => {
                  // 2. Tapping the "View" button navigates cleanly into the Workspace screen!
                  navigation.navigate("TeacherSubjectWorkspace", {
                    subjectId: row.subject_id,
                    subjectName: row.subject_name,
                    className: row.class_name,
                    section: row.section,
                  });
                }}
              />

              // <TeacherAssignmentTable
              //   rows={filteredRows}
              //   onOpenSubject={(row) => {
              //     navigation.navigate("TeacherSubjectWorkspace", {
              //       subjectId: row.subject_id,
              //       subjectName: row.subject_name,
              //       className: row.class_name,
              //       section: row.section,
              //     });
              //   }}
              // />
            )}

            {/* <TeacherAssignmentTable
              rows={filteredRows}
              onOpenSubject={(row) => {
                navigation.navigate("TeacherSubjectDetail", {
                  subjectId: row.subject_id,
                  subjectName: row.subject_name,
                });
              }}
            /> */}
          </>
        )}
      </ScrollView>

      <SelectionBottomSheet
        visible={classSheetVisible}
        title="Select Class"
        items={classOptions}
        selectedId={selectedClass}
        onClose={() => setClassSheetVisible(false)}
        onSelect={(item) => setSelectedClass(item.id)}
      />

      <SelectionBottomSheet
        visible={sectionSheetVisible}
        title="Select Section"
        items={sectionOptions}
        selectedId={selectedSection}
        onClose={() => setSectionSheetVisible(false)}
        onSelect={(item) => setSelectedSection(item.id)}
      />

      <SelectionBottomSheet
        visible={subjectSheetVisible}
        title="Select Subject"
        items={subjectOptions}
        selectedId={selectedSubject}
        onClose={() => setSubjectSheetVisible(false)}
        onSelect={(item) => setSelectedSubject(item.id)}
      />

      <SelectionBottomSheet
        visible={statusSheetVisible}
        title="Select AI Status"
        items={statusOptions}
        selectedId={selectedStatus}
        onClose={() => setStatusSheetVisible(false)}
        onSelect={(item) => setSelectedStatus(item.id)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { width: 40 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  headerRight: { width: 40, alignItems: "flex-end" },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 20,
  },
  pageHeading: { gap: 6 },
  schoolKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.accent,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.75,
  },
  pageSubtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
  center: { alignItems: "center", paddingVertical: 56, gap: 10 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: colors.accentDark, fontWeight: "700", fontSize: 14 },
  list: { gap: 24 },
  classGroup: { gap: 14 },
  classGroupHeader: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: colors.textMuted,
    textTransform: "uppercase",
  },

  // Subject Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    padding: 20,
    gap: 14,
  },
  cardKickerRow: { flexDirection: "row", alignItems: "center" },
  cardKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  cardNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardName: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    flex: 1,
    lineHeight: 32,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardFooterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  waveIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooterLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  cardTeacher: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  cardAccentBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  emptyFilters: {
    alignItems: "center",
    paddingVertical: 60,
  },
});
