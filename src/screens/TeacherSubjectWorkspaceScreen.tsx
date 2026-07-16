import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

import { RootStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";

import { ChapterEditorModal } from "../components/teacher/ChapterEditorModal";
import { ChapterActionSheet } from "../components/teacher/ChapterActionSheet";
import { ConfirmDialog } from "../components/common/ConfirmDialog";

import {
  createTeacherChapter,
  getTeacherChapters,
  updateTeacherChapter,
  deleteTeacherChapter,
} from "../lib/api";
import { ChapterOut } from "../types/api";


type Props = NativeStackScreenProps<
  RootStackParamList,
  "TeacherSubjectWorkspace"
>;

export function TeacherSubjectWorkspaceScreen({ navigation, route }: Props) {
  const { subjectId, subjectName, className, section } = route.params;
  const { session } = useAuth();
  const token = session?.token ?? "";

    const [chapters, setChapters] = useState<ChapterOut[]>([]);

    const [loading, setLoading] = useState(true);

    const [editorVisible, setEditorVisible] = useState(false);

    const [creating, setCreating] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [selectedChapter, setSelectedChapter] = useState<ChapterOut | null>(
      null,
    );

    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    const [editing, setEditing] = useState(false);

    const loadChapters = useCallback(async () => {
      if (!token) {
        return;
      }

      try {
        setLoading(true);

        const data = await getTeacherChapters(token, subjectId);

        setChapters(data);
      } finally {
        setLoading(false);
      }
    }, [token, subjectId]);

    useEffect(() => {
      loadChapters();
    }, [loadChapters]);

    const handleCreateChapter = useCallback(
      async (data: { name: string; description: string }) => {
        if (!token) {
          return;
        }

        try {
          setCreating(true);

          await createTeacherChapter(token, subjectId, {
            name: data.name,
            description: data.description || null,
          });

          setEditing(false);
          setSelectedChapter(null);

          await loadChapters();
        } catch (error) {
          Alert.alert(
            "Unable to create chapter",
            "A chapter with this name already exists or something went wrong.",
          );
        } finally {
          setCreating(false);
        }
      },
      [token, subjectId, loadChapters],
    );

    const handleUpdateChapter = useCallback(
      async (data: { name: string; description: string }) => {
        if (!token || !selectedChapter) {
          return;
        }

        try {
          setCreating(true);

          await updateTeacherChapter(token, selectedChapter.id, {
            name: data.name,
            description: data.description || null,
          });

          setEditing(false);
          setEditorVisible(false);

          await loadChapters();
        } finally {
          setCreating(false);
        }
      },
      [token, selectedChapter, loadChapters],
    );

        const handleDeleteChapter = useCallback(async () => {
          if (!token || !selectedChapter) {
            return;
          }

          try {
            setDeleting(true);

            await deleteTeacherChapter(token, selectedChapter.id);

            setConfirmVisible(false);
            setSelectedChapter(null);

            await loadChapters();
          } catch (error) {
            console.error(error);

            setConfirmVisible(false);
            const message =
              error instanceof Error
                ? error.message
                : "Unable to delete the chapter.";

            window.alert(message);
          } finally {
            setDeleting(false);
          }
        }, [token, selectedChapter, loadChapters]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.subject}>{subjectName}</Text>

          <Text style={styles.subtitle}>
            Class {className} • Section {section}
          </Text>
        </View>
      </View>

      {/* <View style={styles.content}> */}
      <View style={styles.content}>
        <View style={styles.workspaceCard}>
          <TextInput placeholder="Search chapter..." style={styles.search} />

          <View style={styles.toolbar}>
            <Pressable style={styles.filterButton}>
              <Text style={styles.filterText}>All Chapters</Text>
            </Pressable>

            <Pressable
              style={styles.addButton}
              onPress={() => setEditorVisible(true)}
            >
              <Ionicons name="add" size={18} color="#fff" />

              <Text style={styles.addText}>Add Chapter</Text>
            </Pressable>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 2 }]}>Chapter</Text>

            <Text style={[styles.headerCell, { flex: 2 }]}>Display Title</Text>

            <Text style={[styles.headerCell, { flex: 1 }]}>PDF</Text>

            <Text style={[styles.headerCell, { flex: 1.3 }]}>Recordings</Text>

            <Text style={[styles.headerCell, { flex: 1 }]}>Score</Text>

            <Text style={[styles.headerCell, { flex: 0.8 }]}>Action</Text>
          </View>

          {loading ? (
            <Text
              style={{
                paddingVertical: 30,
                textAlign: "center",
              }}
            >
              Loading chapters...
            </Text>
          ) : (
            <FlatList
              data={chapters}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={[styles.cell, { flex: 2 }]}>{item.name}</Text>

                  <Text numberOfLines={1} style={[styles.cell, { flex: 2 }]}>
                    {item.description || "--"}
                  </Text>

                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                    }}
                  >
                    <Pressable
                      style={[
                        styles.pdfButton,
                        {
                          backgroundColor: item.document_count
                            ? "#DBEAFE"
                            : "#F3F4F6",
                        },
                      ]}
                      onPress={() => {
                        navigation.navigate("TeacherChapterDetail", {
                          chapterId: item.id,
                          chapterName: item.name,
                          subjectName,
                          openUpload: item.document_count === 0,
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.pdfText,
                          {
                            color: item.document_count
                              ? colors.accent
                              : "#6B7280",
                          },
                        ]}
                      >
                        {item.document_count ? "PDF" : "Add"}
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={[styles.cell, { flex: 1.3 }]}>▶ 0</Text>

                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={[
                        styles.aiBadge,
                        {
                          backgroundColor: "#F3F4F6",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.aiText,
                          {
                            color: "#6B7280",
                          },
                        ]}
                      >
                        No Score
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flex: 0.8,
                      alignItems: "center",
                    }}
                  >
                    <Pressable
                      style={styles.manageButton}
                      onPress={() => {
                        setSelectedChapter(item);
                        setActionSheetVisible(true);
                      }}
                    >
                      <Text style={styles.manageText}>Manage</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
      <ChapterEditorModal
        visible={editorVisible}
        title={editing ? "Edit Chapter" : "Add Chapter"}
        submitText={editing ? "Save" : "Create"}
        loading={creating}
        initialName={editing ? selectedChapter?.name : ""}
        initialDescription={editing ? (selectedChapter?.description ?? "") : ""}
        onClose={() => {
          setEditorVisible(false);
          setEditing(false);
        }}
        onSave={editing ? handleUpdateChapter : handleCreateChapter}
      />
      <ChapterActionSheet
        visible={actionSheetVisible}
        chapterName={selectedChapter?.name}
        onClose={() => setActionSheetVisible(false)}
        onEdit={() => {
          setActionSheetVisible(false);

          setEditing(true);

          setEditorVisible(true);
        }}
        onReferenceMaterial={() => {
          if (!selectedChapter) {
            return;
          }

          setActionSheetVisible(false);

          navigation.navigate("TeacherChapterDetail", {
            chapterId: selectedChapter.id,
            chapterName: selectedChapter.name,
            subjectName,
          });
        }}
        onDelete={() => {
          setActionSheetVisible(false);

          setConfirmVisible(true);
        }}
      />

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Chapter"
        message={
          selectedChapter
            ? `Are you sure you want to delete "${selectedChapter.name}"?\n\nThis action cannot be undone.`
            : ""
        }
        confirmText="Delete"
        destructive
        loading={deleting}
        onCancel={() => {
          setConfirmVisible(false);
        }}
        onConfirm={handleDeleteChapter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },

  headerContent: {
    marginLeft: 12,
    flex: 1,
  },

  subject: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },

  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  title: {
    marginTop: 24,
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  description: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 20,
  },

  search: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },

  toolbar: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  filterButton: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
  },

  filterText: {
    fontWeight: "600",
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
  },

  addText: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "700",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },

  headerCell: {
    fontWeight: "700",
    fontSize: 13,
    color: "#475569",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 18,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },

  cell: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  workspaceCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },

  pdfButton: {
    minWidth: 58,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  pdfText: {
    fontWeight: "700",
    fontSize: 12,
  },

  aiBadge: {
    minWidth: 70,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignItems: "center",
  },

  aiText: {
    fontWeight: "700",
    fontSize: 12,
  },
  manageButton: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },

  manageText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 12,
  },
});
