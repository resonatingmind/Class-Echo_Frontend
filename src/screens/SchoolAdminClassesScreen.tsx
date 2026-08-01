import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdminNavbar } from "../components/common/AdminNavbar";
import { useAuth } from "../context/AuthContext";
import {
  createSchoolAdminClass,
  getSchoolAdminClasses,
  getSchoolAdminTeachers,
} from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";
import { ClassOut } from "../types/api";
import { SelectDropdown } from "../components/ui/SelectDropdown";
import { CLASS_NAME_OPTIONS, SECTION_OPTIONS } from "../constants";


type Props = NativeStackScreenProps<RootStackParamList, "SchoolAdminClasses">;

// Cycling accent colors for class cards
const CLASS_COLORS = [
  { bg: "#D1E4FF", text: AppTheme.colors.primary },
  { bg: "#E8F7EE", text: "#127A40" },
  { bg: "#FFF4E0", text: "#92400E" },
  { bg: "#F5F0FF", text: "#6B21A8" },
  { bg: "#FFE8EC", text: "#9B1239" },
];

function ClassCard({
  classItem,
  colorIdx,
  onPress,
}: {
  classItem: ClassOut;
  colorIdx: number;
  onPress: () => void;
}) {
  const c = CLASS_COLORS[colorIdx % CLASS_COLORS.length];
  const initials = classItem.name.slice(0, 2).toUpperCase();

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.cardIcon, { backgroundColor: c.bg }]}>
          <Text style={[styles.cardIconText, { color: c.text }]}>
            {initials}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{classItem.name}</Text>

          <Text style={styles.cardSection}>Section {classItem.section}</Text>

          <Text style={styles.cardDate}>
            Added{" "}
            {new Date(classItem.created_at).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
      </View>
      <Ionicons color={AppTheme.colors.textSecondary} name="chevron-forward" size={18} />
    </Pressable>
  );
}

function CreateClassModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (c: ClassOut) => void;
}) {
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

 const canSubmit = name.trim().length > 1 && section.trim().length > 0;

  const handleCreate = async () => {
    if (!session || !canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
        const cls = await createSchoolAdminClass(session.token, {
          name: name.trim(),
          section: section.trim(),
        });
      setName("");
      setSection("");
      onCreated(cls);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create class");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setSection("");
    setError(null);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={handleClose} style={styles.modalOverlay}>
        <Pressable style={styles.modalCard}>
          <Text style={styles.modalTitle}>Create New Class</Text>
          <Text style={styles.modalSubtitle}>
            Add a class to your school. You can assign subjects and teachers
            after.
          </Text>

          <SelectDropdown
            label="CLASS NAME"
            placeholder="Select a class"
            options={CLASS_NAME_OPTIONS}
            value={name}
            onChange={setName}
          />

          <SelectDropdown
            label="SECTION"
            placeholder="Select a section"
            options={SECTION_OPTIONS}
            value={section}
            onChange={setSection}
          />

          {error ? (
            <View style={styles.modalError}>
              <Ionicons color="#B42318" name="alert-circle-outline" size={14} />
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
              style={[
                styles.modalSubmitBtn,
                (!canSubmit || submitting) && styles.btnDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Create Class</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SchoolAdminClassesScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        setClasses(await getSchoolAdminClasses(session.token));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load classes");
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load(true);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <AdminNavbar title="Classes" />

      <View style={styles.flex}>
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
                <View style={styles.titleRow}>
                  <Text style={styles.pageTitle}>Academic Classes</Text>
                  <Pressable
                    onPress={() => setShowCreate(true)}
                    style={styles.addClassBtn}
                  >
                    <Ionicons color="#fff" name="add" size={14} />
                    <Text style={styles.addClassText}>Add Class</Text>
                  </Pressable>
                </View>
                <Text style={styles.pageSubtitle}>
                  Managing {classes.length} active classroom
                  {classes.length !== 1 ? "s" : ""} for the current session.
                </Text>
              </View>

              {isLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={AppTheme.colors.primary} size="large" />
                  <Text style={styles.loadingText}>Loading classes…</Text>
                </View>
              ) : error ? (
                <View style={styles.center}>
                  <Ionicons
                    color={AppTheme.colors.textSecondary}
                    name="cloud-offline-outline"
                    size={40}
                  />
                  <Text style={styles.emptyTitle}>Could not load classes</Text>
                  <Text style={styles.emptyBody}>{error}</Text>
                  <Pressable onPress={() => void load()} style={styles.retryBtn}>
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              ) : classes.length === 0 ? (
                <View style={styles.center}>
                  <Ionicons
                    color={AppTheme.colors.textSecondary}
                    name="school-outline"
                    size={44}
                  />
                  <Text style={styles.emptyTitle}>No classes yet</Text>
                  <Text style={styles.emptyBody}>
                    Create your first class to start organizing subjects.
                  </Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {classes.map((cls, idx) => (
                    <ClassCard
                      key={cls.id}
                      classItem={cls}
                      colorIdx={idx}
                      onPress={() =>
                        navigation.navigate("SchoolAdminClassDetail", {
                          classId: cls.id,
                          className: cls.name,
                          section: cls.section,
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      <CreateClassModal
        onClose={() => setShowCreate(false)}
        onCreated={(cls) => setClasses((prev) => [...prev, cls])}
        visible={showCreate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  flex: { flex: 1 },
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
  pageHeading: { gap: AppTheme.spacing.s, marginBottom: AppTheme.spacing.m },
  pageTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  pageSubtitle: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },
  addClassBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.s,
  },
  addClassText: { color: "#fff", ...AppTheme.typography.button },
  center: {
    alignItems: "center",
    paddingVertical: AppTheme.spacing.huge,
    gap: AppTheme.spacing.m,
  },
  loadingText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },
  emptyTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },
  emptyBody: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body, textAlign: "center" },
  retryBtn: {
    marginTop: AppTheme.spacing.s,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
  },
  retryText: { color: AppTheme.colors.primary, ...AppTheme.typography.button },
  list: { gap: AppTheme.spacing.m },
  // Class Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.l,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: AppTheme.spacing.m, flex: 1 },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: AppTheme.radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: { ...AppTheme.typography.heading3 },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },
  cardSection: {
    color: AppTheme.colors.primary,
    ...AppTheme.typography.body,
    fontWeight: "600",
  },
  cardDate: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    gap: 16,
    maxHeight: "90%",
    ...AppTheme.shadows.card,
  },
  modalTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading2 },
  modalSubtitle: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },
  modalField: { gap: 8 },
  modalFieldLabel: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    textTransform: "uppercase",
  },
  modalInput: {
    height: 52,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.background,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 16,
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
  },
  modalError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF1F1",
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalErrorText: { color: "#B42318", flex: 1, ...AppTheme.typography.body },
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
  modalSubmitText: { color: "#fff", ...AppTheme.typography.button },
});


