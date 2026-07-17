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
import { colors } from "../theme/colors";

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

  const [loading, setLoading] = useState(true);

  const [recordings, setRecordings] = useState<TeacherRecording[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [subjectFilter, setSubjectFilter] = useState("All");

  const [sortBy, setSortBy] = useState("Newest");
  const [filterVisible, setFilterVisible] = useState(false);

  const [tempStatus, setTempStatus] = useState(statusFilter);

  const [tempSubject, setTempSubject] = useState(subjectFilter);

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

      return matchesSearch && matchesStatus && matchesSubject;
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

        case "Highest Score":
          return (b.overall_score ?? 0) - (a.overall_score ?? 0);

        case "Lowest Score":
          return (a.overall_score ?? 0) - (b.overall_score ?? 0);

        default:
          return 0;
      }
    });

  const sortOptions = ["Newest", "Oldest", "Highest Score", "Lowest Score"];
  const statuses = [
    "All",
    ...new Set(recordings.map((r) => r.status).filter(Boolean)),
  ];

  const subjectOptions = ["All", ...new Set(subjects.map((s) => s.name))];
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

  const scoredRecordings = recordings.filter((r) => r.overall_score != null);

  const averageScore =
    scoredRecordings.length > 0
      ? Math.round(
          scoredRecordings.reduce((sum, r) => sum + (r.overall_score ?? 0), 0) /
            scoredRecordings.length,
        )
      : 0;

  const activeFilterCount =
    Number(statusFilter !== "All") +
    Number(subjectFilter !== "All") +
    Number(sortBy !== "Newest") +
    Number(searchQuery.trim() !== "");

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => {
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
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>

        <Text style={styles.heading}>
          {chapterId
            ? (chapterName ?? "Chapter Recordings")
            : "Teacher Recordings"}
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{total}</Text>
            <Text>Total</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{completed}</Text>
            <Text>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{failed}</Text>
            <Text>Failed</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{averageScore}%</Text>
            <Text>Average</Text>
          </View>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />

          <TextInput
            placeholder="Search by lecture or chapter..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        <Pressable
          style={styles.filterButton}
          onPress={() => {
            setTempStatus(statusFilter);
            setTempSubject(subjectFilter);
            setTempSort(sortBy);
            setFilterVisible(true);
          }}
        >
          <Ionicons name="options-outline" size={20} color={colors.accent} />

          <Text style={styles.filterButtonText}>
            {activeFilterCount > 0
              ? `Filters (${activeFilterCount - Number(searchQuery.trim() !== "")})`
              : "Filters"}
          </Text>
        </Pressable>

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
              onPress={() => {
                setSearchQuery("");
                setStatusFilter("All");
                setSubjectFilter("All");
                setSortBy("Newest");
              }}
            >
              <Text style={styles.clearFilter}>Clear Filters</Text>
            </Pressable>
          )}
        </View>

        {filteredRecordings.map((recording) => (
          <Pressable
            key={recording.id}
            style={styles.card}
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
            <Text style={styles.title}>{recording.lecture_title}</Text>

            <Text style={styles.chapter}>{recording.chapter_name}</Text>

            <View style={styles.row}>
              <View
                style={[
                  styles.statusBadge,
                  recording.status?.toLowerCase() === "completed" &&
                    styles.completedBadge,

                  recording.status?.toLowerCase() === "processing" &&
                    styles.processingBadge,

                  recording.status?.toLowerCase() === "failed" &&
                    styles.failedBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    recording.status?.toLowerCase() === "completed" && {
                      color: "#047857",
                    },
                    recording.status?.toLowerCase() === "processing" && {
                      color: "#B45309",
                    },
                    recording.status?.toLowerCase() === "failed" && {
                      color: "#B91C1C",
                    },
                  ]}
                >
                  {recording.status}
                </Text>
              </View>

              <Text>
                {recording.overall_score != null
                  ? `${recording.overall_score}%`
                  : "--"}
              </Text>
            </View>

            <Text style={styles.date}>
              {new Date(recording.uploaded_at).toLocaleDateString()}
            </Text>
          </Pressable>
        ))}
        {filteredRecordings.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="search" size={40} color={colors.textSecondary} />

            <Text style={styles.emptyText}>No recordings found</Text>
          </View>
        )}
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

                <Pressable onPress={() => setFilterVisible(false)}>
                  <Ionicons name="close" size={26} color={colors.textPrimary} />
                </Pressable>
              </View>

              {/* ---------- STATUS ---------- */}

              <Text style={styles.modalHeading}>Status</Text>

              {statuses.map((status) => (
                <Pressable
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
                    color={colors.accent}
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
                      color={colors.accent}
                    />

                    <Text style={styles.optionText}>{subject}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* ---------- SORT ---------- */}

              <Text style={styles.modalHeading}>Sort</Text>

              {sortOptions.map((sort) => (
                <Pressable
                  key={sort}
                  style={styles.option}
                  onPress={() => setTempSort(sort)}
                >
                  <Ionicons
                    name={
                      tempSort === sort ? "radio-button-on" : "radio-button-off"
                    }
                    size={20}
                    color={colors.accent}
                  />

                  <Text style={styles.optionText}>{sort}</Text>
                </Pressable>
              ))}

              {/* ---------- BUTTONS ---------- */}

              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.resetButton}
                  onPress={() => {
                    setTempStatus("All");
                    setTempSubject("All");
                    setTempSort("Newest");
                  }}
                >
                  <Text style={styles.resetText}>Reset</Text>
                </Pressable>

                <Pressable
                  style={styles.applyButton}
                  onPress={() => {
                    setStatusFilter(tempStatus);
                    setSubjectFilter(tempSubject);
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
    backgroundColor: colors.background,
  },

  content: {
    padding: 20,
    gap: 16,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  chapter: {
    marginTop: 6,
    color: colors.textSecondary,
  },

  row: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  date: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 12,
  },

  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },

  filterText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },

  activeFilterText: {
    color: "#fff",
  },

  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    marginTop: 6,
  },

  sortText: {
    color: colors.accent,
    fontWeight: "700",
  },

  empty: {
    alignItems: "center",
    marginTop: 60,
  },

  emptyText: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginHorizontal: 4,
  },

  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.accent,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  completedBadge: {
    backgroundColor: "#D1FAE5",
  },

  processingBadge: {
    backgroundColor: "#FEF3C7",
  },

  failedBadge: {
    backgroundColor: "#FEE2E2",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
    paddingBottom: 40,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 18,
  },

  modalHeading: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 10,
    color: colors.textPrimary,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  optionText: {
    marginLeft: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },

  resetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 8,
  },

  applyButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginLeft: 8,
  },

  resetText: {
    color: colors.accent,
    fontWeight: "700",
  },

  applyText: {
    color: "#fff",
    fontWeight: "700",
  },

  filterButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
  },

  filterButtonText: {
    marginLeft: 8,
    color: colors.accent,
    fontWeight: "700",
    fontSize: 16,
  },
  activeFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },

  activeChip: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },

  activeChipText: {
    color: "#fff",
    fontWeight: "600",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  resultCount: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  clearFilter: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },
});
