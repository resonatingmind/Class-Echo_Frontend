import { useCallback, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Modal,
  useWindowDimensions,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../context/AuthContext";
import {
  getTeacherRecordings,
  getChapterRecordings,
  getSchoolRecordingDetail,
  getSchoolTeacherSubjects,
} from "../lib/api";
import { TeacherRecording, SubjectWithClassOut } from "../types/api";
import { AppTheme } from "../theme/AppTheme";
import { AdminNavbar } from "../components/common/AdminNavbar";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "SchoolAdminTeacherRecordings"
>;

export function SchoolAdminTeacherRecordingsScreen({
  route,
  navigation,
}: Props) {
  const { teacherId, chapterId, chapterName } = route.params;

  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);

  const [recordings, setRecordings] = useState<TeacherRecording[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [subjectFilter, setSubjectFilter] = useState("All");

  const [sortBy, setSortBy] = useState("Newest");
  const [filterVisible, setFilterVisible] = useState(false);

  const [tempStatus, setTempStatus] = useState(statusFilter);

  const [tempSubject, setTempSubject] = useState(subjectFilter);

  const [classFilter, setClassFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  
  const [tempClass, setTempClass] = useState("All");
  const [tempSection, setTempSection] = useState("All");

  const [tempSort, setTempSort] = useState(sortBy);
  const [subjects, setSubjects] = useState<SubjectWithClassOut[]>([]);

  const load = useCallback(async () => {
    if (!session) return;

    setLoading(true);

    try {

      if (chapterId) {
        const recordingsData = await getChapterRecordings(
          session.token,
          chapterId,
        );

        setRecordings(recordingsData);

        setSubjects([]);
      } else {
        const [recordingsData, subjectsData] = await Promise.all([
          getTeacherRecordings(session.token, teacherId!),
          getSchoolTeacherSubjects(session.token, teacherId!),
        ]);

        setRecordings(recordingsData);

        setSubjects(subjectsData);
      }

    } finally {
      setLoading(false);
    }
  }, [session, teacherId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filteredRecordings = recordings
    .filter((recording) => {
      const matchesSearch =
        (recording.lecture_title ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (recording.chapter_name ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        (recording.status ?? "").toLowerCase().trim() ===
          statusFilter.toLowerCase().trim();

      const matchesSubject =
        subjectFilter === "All" ||
        (recording.subject_name ?? "") === subjectFilter;

      const matchesClass =
        classFilter === "All" ||
        subjects.some(s => s.class_?.name === classFilter && s.name === recording.subject_name);

      const matchesSection =
        sectionFilter === "All" ||
        subjects.some(s => s.class_?.section === sectionFilter && s.name === recording.subject_name);

      return matchesSearch && matchesStatus && matchesSubject && matchesClass && matchesSection;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "Newest":
          return (
            new Date(b.uploaded_at).getTime() -
            new Date(a.uploaded_at).getTime()
          );

        case "Oldest":
          return (
            new Date(a.uploaded_at).getTime() -
            new Date(b.uploaded_at).getTime()
          );

        default:
          return 0;
      }
    });

  // No score sorting: reports and scores stay with the teacher.
  const sortOptions = ["Newest", "Oldest"];
  const statuses = [
    "All",
    ...new Set(recordings.map((r) => r.status).filter(Boolean)),
  ];

  const subjectOptions = ["All", ...new Set(subjects.map((s) => s.name))];
  const classOptions = ["All", ...new Set(subjects.map((s) => s.class_?.name).filter(Boolean) as string[])];
  const sectionOptions = ["All", ...new Set(subjects.map((s) => s.class_?.section).filter(Boolean) as string[])];
  
  const total = recordings.length;

  const completed = recordings.filter(
    (r) => r.status?.toLowerCase() === "completed",
  ).length;

  const processing = recordings.filter(
    (r) => r.status?.toLowerCase() === "processing",
  ).length;

  const failed = recordings.filter(
    (r) => r.status?.toLowerCase() === "failed",
  ).length;

  const activeFilterCount =
    Number(statusFilter !== "All") +
    Number(subjectFilter !== "All") +
    Number(classFilter !== "All") +
    Number(sectionFilter !== "All") +
    Number(sortBy !== "Newest") +
    Number(searchQuery.trim() !== "");

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={AppTheme.colors.primary} />
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      if (chapterId) {
        navigation.goBack();
      } else {
        navigation.navigate("SchoolAdminTeacherDetail", {
          teacherId: teacherId!,
        });
      }
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <AdminNavbar
        title={chapterId ? (chapterName ?? "Chapter Recordings") : "Teacher Recordings"}
        onBack={handleBack}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.centerContainer}>
          <View style={styles.body}>
            <View style={styles.pageHeading}>
              <Text style={styles.academicLabel}>RECORDINGS</Text>
              <Text style={styles.pageTitle}>{chapterId ? (chapterName ?? "Chapter Recordings") : "Teacher Recordings"}</Text>
            </View>

            <View style={[styles.statsContainer, isMobile && { flexWrap: "wrap" }]}>
              <View style={[styles.statCard, styles.statCardTotal, isMobile ? { width: "47%" } : { flex: 1 }]}>
                <View style={[styles.statIconWrap, styles.statIconTotal]}>
                  <Ionicons name="document-text-outline" size={24} color={AppTheme.colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: AppTheme.colors.primaryText }]}>{total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>

              <View style={[styles.statCard, styles.statCardCompleted, isMobile ? { width: "47%" } : { flex: 1 }]}>
                <View style={[styles.statIconWrap, styles.statIconCompleted]}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={AppTheme.colors.successStrong} />
                </View>
                <Text style={[styles.statNumber, { color: AppTheme.colors.successStrong }]}>{completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>

              <View style={[styles.statCard, styles.statCardFailed, isMobile ? { width: "47%" } : { flex: 1 }]}>
                <View style={[styles.statIconWrap, styles.statIconFailed]}>
                  <Ionicons name="alert-circle-outline" size={24} color={AppTheme.colors.dangerStrong} />
                </View>
                <Text style={[styles.statNumber, { color: AppTheme.colors.dangerStrong }]}>{failed}</Text>
                <Text style={styles.statLabel}>Failed</Text>
              </View>

            </View>
            <View style={[styles.searchRow, isMobile && { flexDirection: "column" }]}>
              <View style={[styles.searchContainer, isMobile ? { width: "100%", marginBottom: 12, flex: undefined } : {}]}>
                <Ionicons name="search" size={20} color={AppTheme.colors.textSecondary} />
                <TextInput
                  placeholder="Search by lecture or chapter..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                  placeholderTextColor={AppTheme.colors.textSecondary}
                />
                {searchQuery.length > 0 && (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
                    <Ionicons name="close-circle" size={18} color={AppTheme.colors.textSecondary} />
                  </Pressable>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.filterButton,
                  isMobile && { width: "100%" },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => {
                  setTempStatus(statusFilter);
                  setTempSubject(subjectFilter);
                  setTempClass(classFilter);
                  setTempSection(sectionFilter);
                  setTempSort(sortBy);
                  setFilterVisible(true);
                }}
              >
                <Ionicons name="options-outline" size={20} color={AppTheme.colors.primary} />
                <Text style={styles.filterButtonText}>
                  {activeFilterCount > 0
                    ? `Filters (${activeFilterCount - Number(searchQuery.trim() !== "")})`
                    : "Filters"}
                </Text>
              </Pressable>
            </View>

        <View style={styles.activeFilters}>
          {statusFilter !== "All" && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>{statusFilter}</Text>
            </View>
          )}

          {subjectFilter !== "All" && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>{subjectFilter}</Text>
            </View>
          )}

          {classFilter !== "All" && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>Class {classFilter}</Text>
            </View>
          )}

          {sectionFilter !== "All" && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>Section {sectionFilter}</Text>
            </View>
          )}

          {sortBy !== "Newest" && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>{sortBy}</Text>
            </View>
          )}
        </View>

        {/* Results Counter & Clear Action Container */}
        <View style={styles.resultsMetaRow}>
          <Text style={styles.resultCount}>
            Showing {filteredRecordings.length} of {recordings.length}{" "}
            recordings
          </Text>
          {activeFilterCount > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSearchQuery("");
                setStatusFilter("All");
                setSubjectFilter("All");
                setClassFilter("All");
                setSectionFilter("All");
                setSortBy("Newest");
              }}
            >
              <Text style={styles.clearFilter}>Clear Filters</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.recordingList}>
          {filteredRecordings.map((recording) => (
            <Pressable
              accessibilityRole="button"
              key={recording.id}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
              onPress={async () => {
                if (!session) return;

                try {
                  const fullRecording = await getSchoolRecordingDetail(
                    session.token,
                    recording.id,
                  );
                  navigation.navigate("RecordingDetail", {
                    recording: fullRecording,
                    subjectName: recording.subject_name,
                  });
                } catch (error) {
                  console.error(error);
                }
              }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name="mic-outline" size={20} color={AppTheme.colors.primary} />
                </View>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.title} numberOfLines={2}>
                    {recording.lecture_title || recording.chapter_name || `Recording #${recording.id}`}
                  </Text>
                  <Text style={styles.chapter}>
                    {recording.subject_name}{recording.chapter_name ? ` • ${recording.chapter_name}` : ''}
                  </Text>
                </View>
              </View>

              <View style={[styles.cardFooter, isMobile && { flexDirection: "column", alignItems: "flex-start", gap: 16 }]}>
                <View style={[styles.cardMetaRow, isMobile && { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                  <View
                    style={[
                      styles.statusBadge,
                      recording.status?.toLowerCase() === "completed" && styles.completedBadge,
                      recording.status?.toLowerCase() === "processing" && styles.processingBadge,
                      recording.status?.toLowerCase() === "failed" && styles.failedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        recording.status?.toLowerCase() === "completed" && { color: AppTheme.colors.successStrong },
                        recording.status?.toLowerCase() === "processing" && { color: AppTheme.colors.warningText },
                        recording.status?.toLowerCase() === "failed" && { color: AppTheme.colors.dangerStrong },
                      ]}
                    >
                      {recording.status?.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.dateWrap}>
                    <Ionicons name="calendar-outline" size={14} color={AppTheme.colors.textSecondary} />
                    <Text style={styles.date}>
                      {new Date(recording.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </View>

              </View>
            </Pressable>
          ))}
          
          {filteredRecordings.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="folder-open-outline" size={48} color={AppTheme.colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No recordings found</Text>
              <Text style={styles.emptyText}>Adjust your filters or try a different search term.</Text>
            </View>
          )}
        </View>
          </View>
        </View>
      </ScrollView>
      <Modal
        visible={filterVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>

                <Pressable accessibilityRole="button" accessibilityLabel="Close filters" hitSlop={8} onPress={() => setFilterVisible(false)}>
                  <Ionicons name="close" size={26} color={AppTheme.colors.textPrimary} />
                </Pressable>
              </View>

              {/* ---------- STATUS ---------- */}

              <Text style={styles.modalHeading}>Status</Text>

              {statuses.map((status) => (
                <Pressable
                  accessibilityRole="button"
                  key={status}
                  style={styles.option}
                  onPress={() => setTempStatus(status)}
                >
                  <Ionicons
                    name={
                      tempStatus === status
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={20}
                    color={AppTheme.colors.primary}
                  />

                  <Text style={styles.optionText}>{status}</Text>
                </Pressable>
              ))}

              {/* ---------- SUBJECT ---------- */}

              <Text style={styles.modalHeading}>Subject</Text>

              <ScrollView
                style={{ maxHeight: 180 }}
                showsVerticalScrollIndicator={false}
              >
                {subjectOptions.map((subject) => (
                  <Pressable
                    accessibilityRole="button"
                    key={subject}
                    style={styles.option}
                    onPress={() => setTempSubject(subject)}
                  >
                    <Ionicons
                      name={
                        tempSubject === subject
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={20}
                      color={AppTheme.colors.primary}
                    />

                    <Text style={styles.optionText}>{subject}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* ---------- CLASS ---------- */}
              
              {classOptions.length > 1 && (
                <>
                  <Text style={styles.modalHeading}>Class</Text>
                  <ScrollView
                    style={{ maxHeight: 180 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {classOptions.map((cls) => (
                      <Pressable
                        accessibilityRole="button"
                        key={cls}
                        style={styles.option}
                        onPress={() => setTempClass(cls)}
                      >
                        <Ionicons
                          name={
                            tempClass === cls
                              ? "radio-button-on"
                              : "radio-button-off"
                          }
                          size={20}
                          color={AppTheme.colors.primary}
                        />

                        <Text style={styles.optionText}>{cls}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* ---------- SECTION ---------- */}
              
              {sectionOptions.length > 1 && (
                <>
                  <Text style={styles.modalHeading}>Section</Text>
                  <ScrollView
                    style={{ maxHeight: 180 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {sectionOptions.map((sec) => (
                      <Pressable
                        accessibilityRole="button"
                        key={sec}
                        style={styles.option}
                        onPress={() => setTempSection(sec)}
                      >
                        <Ionicons
                          name={
                            tempSection === sec
                              ? "radio-button-on"
                              : "radio-button-off"
                          }
                          size={20}
                          color={AppTheme.colors.primary}
                        />

                        <Text style={styles.optionText}>{sec}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* ---------- SORT ---------- */}

              <Text style={styles.modalHeading}>Sort</Text>

              {sortOptions.map((sort) => (
                <Pressable
                  accessibilityRole="button"
                  key={sort}
                  style={styles.option}
                  onPress={() => setTempSort(sort)}
                >
                  <Ionicons
                    name={
                      tempSort === sort ? "radio-button-on" : "radio-button-off"
                    }
                    size={20}
                    color={AppTheme.colors.primary}
                  />

                  <Text style={styles.optionText}>{sort}</Text>
                </Pressable>
              ))}

              {/* ---------- BUTTONS ---------- */}

              <View style={styles.buttonRow}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.resetButton}
                  onPress={() => {
                    setTempStatus("All");
                    setTempSubject("All");
                    setTempClass("All");
                    setTempSection("All");
                    setTempSort("Newest");
                  }}
                >
                  <Text style={styles.resetText}>Reset</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  style={styles.applyButton}
                  onPress={() => {
                    setStatusFilter(tempStatus);
                    setSubjectFilter(tempSubject);
                    setClassFilter(tempClass);
                    setSectionFilter(tempSection);
                    setSortBy(tempSort);
                    setFilterVisible(false);
                  }}
                >
                  <Text style={styles.applyText}>Apply</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  content: {
    flexGrow: 1,
  },
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
  pageHeading: {
    marginBottom: 8,
  },
  academicLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: AppTheme.colors.primaryText,
    letterSpacing: 1,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: AppTheme.colors.textPrimary,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  statCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardTotal: {
    backgroundColor: AppTheme.colors.primary + "0A", // Very light primary
    borderColor: AppTheme.colors.primary + "30",
  },
  statCardCompleted: {
    backgroundColor: AppTheme.colors.successSoft,
    borderColor: "#A7F3D0",
  },
  statCardFailed: {
    backgroundColor: AppTheme.colors.dangerBg,
    borderColor: AppTheme.colors.dangerBorder,
  },
  statCardAverage: {
    backgroundColor: AppTheme.colors.infoSoft,
    borderColor: AppTheme.colors.infoBorder,
  },
  statIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statIconTotal: {
    backgroundColor: AppTheme.colors.primary + "1A",
  },
  statIconCompleted: {
    backgroundColor: "#D1FAE5",
  },
  statIconFailed: {
    backgroundColor: AppTheme.colors.dangerSoft,
  },
  statIconAverage: {
    backgroundColor: AppTheme.colors.infoBg,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "800",
  },
  statLabel: {
    marginTop: 4,
    color: AppTheme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  searchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 16,
    height: 56,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: AppTheme.colors.textPrimary,
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 20,
    height: 56,
  },
  filterButtonText: {
    marginLeft: 8,
    color: AppTheme.colors.primaryText,
    fontWeight: "700",
    fontSize: 16,
  },
  activeFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activeChip: {
    backgroundColor: AppTheme.colors.primary + "10",
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + "30",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  activeChipText: {
    color: AppTheme.colors.primaryText,
    fontWeight: "600",
    fontSize: 13,
  },
  resultsMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultCount: {
    fontSize: 14,
    color: AppTheme.colors.textSecondary,
    fontWeight: "600",
  },
  clearFilter: {
    fontSize: 14,
    color: AppTheme.colors.dangerText,
    fontWeight: "700",
  },
  recordingList: {
    gap: 16,
  },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 20,
    shadowColor: AppTheme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AppTheme.colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  cardTitleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
    lineHeight: 24,
  },
  chapter: {
    marginTop: 4,
    color: AppTheme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  cardFooter: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardMetaRow: {
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    backgroundColor: AppTheme.colors.background,
  },
  completedBadge: {
    backgroundColor: AppTheme.colors.successSoft,
  },
  processingBadge: {
    backgroundColor: AppTheme.colors.warningSoft,
  },
  failedBadge: {
    backgroundColor: AppTheme.colors.dangerSoft,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dateWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  date: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  scoreContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  scoreHigh: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  scoreMed: {
    backgroundColor: AppTheme.colors.warningTint,
    borderColor: "#FEF08A",
  },
  scoreLow: {
    backgroundColor: AppTheme.colors.dangerBg,
    borderColor: AppTheme.colors.dangerBorder,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "800",
  },
  scoreMax: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 2,
    opacity: 0.8,
  },
  scoreTextHigh: { color: "#166534" },
  scoreTextMed: { color: AppTheme.colors.warningDeep },
  scoreTextLow: { color: AppTheme.colors.dangerDeep },
  noScoreText: {
    fontSize: 20,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppTheme.colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    color: AppTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  emptyText: {
    marginTop: 8,
    color: AppTheme.colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    maxWidth: 250,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: AppTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
    color: AppTheme.colors.textPrimary,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    color: AppTheme.colors.textPrimary,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 32,
  },
  resetButton: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: AppTheme.colors.primary,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  applyButton: {
    flex: 1,
    height: 56,
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  resetText: {
    color: AppTheme.colors.primaryText,
    fontWeight: "700",
    fontSize: 16,
  },
  applyText: {
    color: AppTheme.colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
});
