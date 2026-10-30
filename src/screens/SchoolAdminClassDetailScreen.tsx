import { AppTheme } from '../theme/AppTheme';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
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

import { useAuth } from '../context/AuthContext';
import {
  createSubject,
  getClassSubjects,
  getSchoolAdminTeachers,
  updateSchoolAdminClass,
  deleteSubject,
  getSchoolAdminMe,
  login,
} from '../lib/api';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { RootStackParamList } from '../navigation/AppNavigator';
import { AdminNavbar } from '../components/common/AdminNavbar';
import { SelectDropdown } from '../components/ui/SelectDropdown';
import { CLASS_NAME_OPTIONS, SECTION_OPTIONS } from '../constants';
import { AssignTeacherModal } from '../components/AssignTeacherModal';
import { colors } from '../theme/colors';
import { SubjectOut, TeacherOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminClassDetail'>;

const SUBJECT_COLORS = [
  { bg: AppTheme.colors.primarySoft, text: AppTheme.colors.primaryDark },
  { bg: AppTheme.colors.successBg, text: AppTheme.colors.successText },
  { bg: AppTheme.colors.warningBg, text: AppTheme.colors.warningStrong },
  { bg: AppTheme.colors.purpleBg, text: AppTheme.colors.purple },
  { bg: AppTheme.colors.roseBg, text: AppTheme.colors.rose },
];

// ── Add Subject Modal ────────────────────────────────────────────────────────

function AddSubjectModal({
  visible,
  classId,
  onClose,
  onCreated,
}: {
  visible: boolean;
  classId: number;
  onClose: () => void;
  onCreated: (s: SubjectOut) => void;
}) {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 1;

  const handleCreate = async () => {
    if (!session || !canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const subject = await createSubject(session.token, classId, { name: name.trim() });
      setName('');
      onCreated(subject);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => { setName(''); setError(null); onClose(); };

  return (
    <Modal animationType="slide" onRequestClose={handleClose} transparent visible={visible}>
      <Pressable onPress={handleClose} style={styles.modalOverlay}>
        <Pressable style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Subject</Text>
          <Text style={styles.modalSubtitle}>
            Add a new subject to this class. You can assign a teacher afterwards.
          </Text>

          <View style={styles.modalField}>
            <Text style={styles.modalFieldLabel}>SUBJECT NAME</Text>
            <TextInput
              autoCapitalize="words"
              autoFocus
              onChangeText={setName}
              onSubmitEditing={handleCreate}
              placeholder="e.g. Mathematics, Physics…"
              placeholderTextColor={AppTheme.colors.textPlaceholder}
              returnKeyType="done"
              style={styles.modalInput}
              value={name}
            />
          </View>

          {error ? (
            <View style={styles.modalError}>
              <Ionicons color={AppTheme.colors.dangerText} name="alert-circle-outline" size={14} />
              <Text style={styles.modalErrorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable onPress={handleClose} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!canSubmit || submitting}
              onPress={handleCreate}
              style={[styles.modalSubmitBtn, (!canSubmit || submitting) && styles.btnDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color={AppTheme.colors.white} size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Add Subject</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Subject Card ─────────────────────────────────────────────────────────────

function SubjectCard({
  subject,
  colorIdx,
  onAssignPress,
  onCardPress,
  onDeletePress,
}: {
  subject: SubjectOut;
  colorIdx: number;
  onAssignPress: () => void;
  onCardPress: () => void;
  onDeletePress: () => void;
}) {
  const c = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
  const nameLetters = subject.name.slice(0, 1).toUpperCase();

  return (
    <Pressable onPress={onCardPress} style={styles.subjectCard}>
      <View style={styles.subjectCardTop}>
        <View style={[styles.subjectIcon, { backgroundColor: c.bg }]}>
          <Text style={[styles.subjectIconText, { color: c.text }]}>
            {nameLetters}
          </Text>
        </View>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectName}>{subject.name}</Text>
          <Text style={styles.subjectMeta}>
            Added{" "}
            {new Date(subject.created_at).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation?.();
            onDeletePress();
          }}
          style={{ padding: 4 }}
        >
          <Ionicons name="trash-outline" size={18} color={AppTheme.colors.dangerText} />
        </Pressable>
      </View>

      <View style={styles.subjectCardDivider} />

      <View style={styles.subjectTeacherRow}>
        {subject.teacher ? (
          <>
            <View style={styles.assignedTeacherChip}>
              <View style={styles.miniAvatar}>
                <Text style={styles.miniAvatarText}>
                  {subject.teacher.name
                    .split(" ")
                    .map((w) => w[0] ?? "")
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.assignedTeacherText} numberOfLines={1}>
                  {subject.teacher.name}
                </Text>

                {subject.teacher_assigned_at && (
                  <Text style={styles.assignmentDate}>
                    Assigned on{" "}
                    {new Date(subject.teacher_assigned_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.unassignedChip}>
            <Ionicons
              color={AppTheme.colors.textSecondary}
              name="person-outline"
              size={13}
            />
            <Text style={styles.unassignedText}>No teacher assigned</Text>
          </View>
        )}
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onAssignPress();
          }}
          style={styles.assignBtn}
        >
          <Ionicons color={AppTheme.colors.primary} name="swap-horizontal" size={14} />
          <Text style={styles.assignBtnText}>
            {subject.teacher ? "Change" : "Assign"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function SchoolAdminClassDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { classId, className, section } = route.params;

  const [subjects, setSubjects] = useState<SubjectOut[]>([]);
  const [teachers, setTeachers] = useState<TeacherOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [assignTarget, setAssignTarget] = useState<SubjectOut | null>(null);
  const [showEditClass, setShowEditClass] = useState(false);
  const [editClassName, setEditClassName] = useState(className);
  const [editClassSection, setEditClassSection] = useState(section || "");
  const [editingClass, setEditingClass] = useState(false);
  const [editClassError, setEditClassError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [assignmentFilter, setAssignmentFilter] = useState<
    "All" | "Assigned" | "Unassigned"
  >("All");

  // Subject deletion state
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectOut | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingSubject, setDeletingSubject] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [subjectsData, teachersData] = await Promise.all([
          getClassSubjects(session.token, classId),
          getSchoolAdminTeachers(session.token),
        ]);
        setSubjects(subjectsData);
        setTeachers(teachersData);

        // Fetch admin me if email not cached yet
        if (!adminEmail) {
          try {
            const me = await getSchoolAdminMe(session.token);
            setAdminEmail(me.email);
          } catch {
            // ignore
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load class data');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session, classId, adminEmail],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); void load(true); };

  const handleEditClassSave = async () => {
    if (!session || !editClassName.trim() || !editClassSection.trim() || editingClass) return;
    setEditingClass(true);
    setEditClassError(null);
    try {
      await updateSchoolAdminClass(session.token, classId, { 
        name: editClassName.trim(),
        section: editClassSection.trim()
      });
      await load(true);
      setShowEditClass(false);
      navigation.setParams({ 
        className: editClassName.trim(),
        section: editClassSection.trim() 
      } as never);
    } catch (e) {
      setEditClassError(e instanceof Error ? e.message : 'Failed to update class');
    } finally {
      setEditingClass(false);
    }
  };

  const handleDeleteSubject = (subject: SubjectOut) => {
    setSubjectToDelete(subject);
    setDeletePassword('');
    setDeleteError(null);
  };

  const confirmDeleteSubject = async () => {
    if (!session || !subjectToDelete) return;
    if (!adminEmail) {
      setDeleteError("Verifying admin details... Please try again.");
      return;
    }
    if (!deletePassword) {
      setDeleteError("Password is required.");
      return;
    }
    setDeletingSubject(true);
    setDeleteError(null);

    try {
      await login(adminEmail, deletePassword);
    } catch (err) {
      setDeleteError("Incorrect Password. Please enter your login password.");
      setDeletingSubject(false);
      return;
    }

    try {
      await deleteSubject(session.token, subjectToDelete.id);
      setSubjectToDelete(null);
      setDeletePassword('');
      void load(true);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete subject.');
    } finally {
      setDeletingSubject(false);
    }
  };

  const handleSubjectCreated = (s: SubjectOut) => setSubjects((prev) => [...prev, s]);

  const handleTeacherAssigned = (updated: SubjectOut) => {
    setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setAssignTarget(null);
  };

  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch = subject.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesAssignment =
      assignmentFilter === "All" ||
      (assignmentFilter === "Assigned" && subject.teacher_id) ||
      (assignmentFilter === "Unassigned" && !subject.teacher_id);

    return matchesSearch && matchesAssignment;
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <AdminNavbar
        title={`${className} ${section || ""}`}
        onBack={() => {
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.navigate("SchoolAdminTabs", { screen: "SchoolAdminClasses" } as never);
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={AppTheme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerContainer}>
          <View style={styles.body}>
            {/* Page heading */}
            <View style={styles.pageHeading}>
          <Text style={styles.academicLabel}>CURRENT SESSION</Text>
          <Text style={styles.pageTitle}>Curriculum Overview</Text>
          <View style={styles.headingActions}>
            <Pressable
              onPress={() => {
                setEditClassName(className);
                setEditClassSection(section || "");
                setEditClassError(null);
                setShowEditClass(true);
              }}
              style={styles.editClassBtn}
            >
              <Ionicons
                color={AppTheme.colors.textSecondary}
                name="create-outline"
                size={14}
              />
              <Text style={styles.editClassText}>Edit Class</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowAddSubject(true)}
              style={styles.addSubjectBtn}
            >
              <Ionicons color={AppTheme.colors.white} name="add" size={14} />
              <Text style={styles.addSubjectText}>Add Subject</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats strip */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{subjects.length}</Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {subjects.filter((s) => s.teacher_id !== null).length}
                </Text>
                <Text style={styles.statLabel}>Assigned</Text>
              </View>
              <View style={styles.statCard}>
                <Text
                  style={[
                    styles.statNumber,
                    subjects.filter((s) => !s.teacher_id).length > 0 &&
                      styles.statNumberWarn,
                  ]}
                >
                  {subjects.filter((s) => !s.teacher_id).length}
                </Text>
                <Text style={styles.statLabel}>Unassigned</Text>
              </View>
            </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={AppTheme.colors.textSecondary} />

          <TextInput
            placeholder="Search subject..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {["All", "Assigned", "Unassigned"].map((item) => (
            <Pressable
              key={item}
              onPress={() =>
                setAssignmentFilter(item as "All" | "Assigned" | "Unassigned")
              }
              style={[
                styles.filterChip,
                assignmentFilter === item && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  assignmentFilter === item && styles.filterTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Subjects section */}
        <View style={styles.subjectsSection}>
          <Text style={styles.sectionTitle}>Subjects</Text>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={AppTheme.colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading subjects…</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Ionicons
                color={AppTheme.colors.textSecondary}
                name="cloud-offline-outline"
                size={40}
              />
              <Text style={styles.emptyTitle}>Could not load subjects</Text>
              <Text style={styles.emptyBody}>{error}</Text>
            </View>
          ) : subjects.length === 0 ? (
            <View style={styles.center}>
              <Ionicons
                color={AppTheme.colors.textSecondary}
                name="book-outline"
                size={40}
              />
              <Text style={styles.emptyTitle}>No subjects yet</Text>
              <Text style={styles.emptyBody}>
                Add the first subject to this class.
              </Text>
            </View>
          ) : (
            <View style={styles.subjectList}>
              {filteredSubjects.map((subject, idx) => (
                <SubjectCard
                  key={subject.id}
                  colorIdx={idx}
                  onAssignPress={() => setAssignTarget(subject)}
                  onCardPress={() =>
                    navigation.navigate("SchoolAdminSubjectChapters", {
                      subjectId: subject.id,
                      subjectName: subject.name,
                    })
                  }
                  onDeletePress={() => handleDeleteSubject(subject)}
                  subject={subject}
                />
              ))}
            </View>
          )}
          </View>
          </View>
        </View>
      </ScrollView>

      <AddSubjectModal
        classId={classId}
        onClose={() => setShowAddSubject(false)}
        onCreated={handleSubjectCreated}
        visible={showAddSubject}
      />

      <AssignTeacherModal
        onAssigned={handleTeacherAssigned}
        onClose={() => setAssignTarget(null)}
        subjectId={assignTarget?.id ?? null}
        subjectName={assignTarget?.name ?? ''}
        currentTeacherId={assignTarget?.teacher?.id ?? null}
        teachers={teachers}
        visible={assignTarget !== null}
      />

      {/* Edit Class Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowEditClass(false)}
        transparent
        visible={showEditClass}
      >
        <Pressable
          onPress={() => setShowEditClass(false)}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Class</Text>
            <SelectDropdown
              label="CLASS NAME"
              placeholder="Select a class"
              options={CLASS_NAME_OPTIONS}
              value={editClassName}
              onChange={setEditClassName}
            />
            <SelectDropdown
              label="SECTION"
              placeholder="Select a section"
              options={SECTION_OPTIONS}
              value={editClassSection}
              onChange={setEditClassSection}
            />
            {editClassError ? (
              <View style={styles.modalError}>
                <Ionicons
                  color={AppTheme.colors.dangerText}
                  name="alert-circle-outline"
                  size={14}
                />
                <Text style={styles.modalErrorText}>{editClassError}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowEditClass(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!editClassName.trim() || !editClassSection.trim() || editingClass}
                onPress={handleEditClassSave}
                style={[
                  styles.modalSubmitBtn,
                  (!editClassName.trim() || !editClassSection.trim() || editingClass) && styles.btnDisabled,
                ]}
              >
                {editingClass ? (
                  <ActivityIndicator color={AppTheme.colors.white} size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={!!subjectToDelete}
        title="Delete Subject"
        message={`Are you sure you want to delete the subject "${subjectToDelete?.name}"? This action cannot be undone and will delete all chapters, documents, and recordings under it.`}
        confirmText="Delete"
        destructive={true}
        requirePassword={true}
        passwordValue={deletePassword}
        onPasswordChange={(val) => {
          setDeletePassword(val);
          setDeleteError(null);
        }}
        error={deleteError}
        loading={deletingSubject}
        onConfirm={confirmDeleteSubject}
        onCancel={() => {
          setSubjectToDelete(null);
          setDeletePassword('');
          setDeleteError(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flexGrow: 1 },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.xl,
  },
  body: {
    width: "100%",
    maxWidth: 800,
    gap: AppTheme.spacing.l,
  },

  // Page heading
  pageHeading: {
    gap: AppTheme.spacing.s,
    marginBottom: AppTheme.spacing.xs,
  },
  academicLabel: {
    color: AppTheme.colors.primary,
    ...AppTheme.typography.caption,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  pageTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading1,
  },
  headingActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  editClassBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editClassText: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
    fontWeight: "600",
  },
  addSubjectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addSubjectText: { color: AppTheme.colors.white, ...AppTheme.typography.body, fontWeight: "700" },

  // Stats
  statsGrid: {
    flexDirection: "row",
    gap: AppTheme.spacing.m,
  },
  statCard: {
    flex: 1,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    padding: AppTheme.spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  statNumber: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.display },
  statNumberWarn: { color: AppTheme.colors.warning },
  statLabel: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body, marginTop: AppTheme.spacing.xs },

  // Subjects section
  subjectsSection: { gap: 14 },
  sectionTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3, marginTop: AppTheme.spacing.s },
  subjectList: { gap: 14 },

  // Subject Card
  subjectCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    overflow: "hidden",
  },
  subjectCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: AppTheme.radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectIconText: { ...AppTheme.typography.heading3 },
  subjectInfo: { flex: 1, gap: 4 },
  subjectName: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.bodyLarge, fontWeight: "700" },
  subjectMeta: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption },
  subjectCardDivider: { height: 1, backgroundColor: AppTheme.colors.border },
  subjectTeacherRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    gap: 10,
  },
  assignedTeacherChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: { color: AppTheme.colors.primaryDark, ...AppTheme.typography.caption, fontSize: 10, fontWeight: "800" },
  assignedTeacherText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
    fontWeight: "600",
    flex: 1,
  },
  unassignedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  unassignedText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: AppTheme.radius.small,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.primaryLight,
    backgroundColor: AppTheme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  assignBtnText: { color: AppTheme.colors.primary, ...AppTheme.typography.caption, fontWeight: "700" },

  // Shared states
  center: { alignItems: "center", paddingVertical: 40, gap: 10 },
  loadingText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },
  emptyTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.bodyLarge, fontWeight: "700" },
  emptyBody: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body, textAlign: "center" },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: AppTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppTheme.colors.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },
  modalSubtitle: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },
  modalField: { gap: 8 },
  modalFieldLabel: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  modalInput: {
    height: 52,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.background,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 16,
    ...AppTheme.typography.bodyLarge,
    color: AppTheme.colors.textPrimary,
  },
  modalError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AppTheme.colors.dangerBg,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalErrorText: { color: AppTheme.colors.dangerText, ...AppTheme.typography.body, flex: 1 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.button,
  },
  modalSubmitBtn: {
    flex: 1,
    height: 50,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.45 },
  modalSubmitText: { color: AppTheme.colors.white, ...AppTheme.typography.button },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.surface,
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    ...AppTheme.typography.bodyLarge,
  },

  filterRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 18,
  },

  filterChip: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  filterChipActive: {
    backgroundColor: AppTheme.colors.primary,
  },

  filterText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
    fontWeight: "600",
  },

  filterTextActive: {
    color: AppTheme.colors.white,
  },

  assignmentDate: {
    marginTop: 2,
    fontSize: 11,
    color: AppTheme.colors.textSecondary,
  },
});


