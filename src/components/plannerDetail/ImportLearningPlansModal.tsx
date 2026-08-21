import { AppTheme } from '../../theme/AppTheme';
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  importSchoolSubjectLearningPlans,
  importSchoolSubjectLearningPlansPhoto,
  importTeacherSubjectLearningPlans,
  importTeacherSubjectLearningPlansPhoto,
  getSubjectLearningPlanTemplateUrl,
} from "../../lib/api";

type Props = {
  role: "teacher" | "school_admin";
  subjectId: number;
  visible: boolean;
  onClose: () => void;
  token: string;
  onImported: () => void;
};

type ImportMode = "excel" | "photo";

const XLSX_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

const PHOTO_TYPES = [
  "image/*",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function ImportLearningPlansModal({
  role,
  subjectId,
  visible,
  onClose,
  token,
  onImported,
}: Props) {
  const [importMode, setImportMode] = useState<ImportMode>("excel");
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [pickedMime, setPickedMime] = useState<string>(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  const [uploading, setUploading] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPickedName(null);
    setPickedUri(null);
    setImportedCount(null);
    setError(null);
  };

  const handleSwitchMode = (mode: ImportMode) => {
    setImportMode(mode);
    reset();
  };

  const handlePick = async () => {
    try {
      const allowedTypes = importMode === "excel" ? XLSX_TYPES : PHOTO_TYPES;
      const res = await DocumentPicker.getDocumentAsync({
        type: allowedTypes,
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setPickedUri(asset.uri);
      setPickedName(asset.name);
      setPickedMime(asset.mimeType || (importMode === "excel" ? XLSX_TYPES[0] : "image/jpeg"));
      setImportedCount(null);
      setError(null);
    } catch {
      setError("Could not open the file picker.");
    }
  };

  const handleImport = async () => {
    if (!pickedUri || !pickedName) return;
    setUploading(true);
    setError(null);
    try {
      let res;
      if (importMode === "excel") {
        if (role === "school_admin") {
          res = await importSchoolSubjectLearningPlans(
            token,
            subjectId,
            pickedUri,
            pickedMime,
            pickedName,
          );
        } else {
          res = await importTeacherSubjectLearningPlans(
            token,
            subjectId,
            pickedUri,
            pickedMime,
            pickedName,
          );
        }
      } else {
        // Photo OCR Mode
        if (role === "school_admin") {
          res = await importSchoolSubjectLearningPlansPhoto(
            token,
            subjectId,
            pickedUri,
            pickedMime,
            pickedName,
          );
        } else {
          res = await importTeacherSubjectLearningPlansPhoto(
            token,
            subjectId,
            pickedUri,
            pickedMime,
            pickedName,
          );
        }
      }
      setImportedCount(res.length);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>Bulk Import Lecture Planner</Text>
                <Pressable onPress={handleClose} hitSlop={12}>
                  <Ionicons name="close" size={24} color={AppTheme.colors.textSecondary} />
                </Pressable>
              </View>

              {/* Mode Toggle Tabs */}
              <View style={styles.modeToggleRow}>
                <Pressable
                  onPress={() => handleSwitchMode("excel")}
                  style={[
                    styles.modeTab,
                    importMode === "excel" && styles.modeTabActive,
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={importMode === "excel" ? AppTheme.colors.primaryDark : AppTheme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modeTabText,
                      importMode === "excel" && styles.modeTabTextActive,
                    ]}
                  >
                    Excel File (.xlsx)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSwitchMode("photo")}
                  style={[
                    styles.modeTab,
                    importMode === "photo" && styles.modeTabActive,
                  ]}
                >
                  <Ionicons
                    name="camera-outline"
                    size={16}
                    color={importMode === "photo" ? AppTheme.colors.primaryDark : AppTheme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modeTabText,
                      importMode === "photo" && styles.modeTabTextActive,
                    ]}
                  >
                    Micro Planner Photo (AI OCR)
                  </Text>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {importMode === "excel" ? (
                  <>
                    <Text style={styles.helpText}>
                      Upload an Excel sheet (.xlsx or .xls) to populate this subject's lecture planner.
                      {"\n\n"}
                      The spreadsheet must contain the following columns:
                      {"\n"}• <Text style={{ fontWeight: '700' }}>Topic Name</Text> (Required - Acts as Chapter Name, auto-creating chapters if missing)
                      {"\n"}• <Text style={{ fontWeight: '700' }}>Sub Topic</Text> (Required)
                      {"\n"}• <Text style={{ fontWeight: '600' }}>Date</Text> (Optional)
                      {"\n"}• <Text style={{ fontWeight: '600' }}>Classwork Activities</Text> (Optional)
                      {"\n"}• <Text style={{ fontWeight: '600' }}>Assessment Task</Text> (Optional)
                      {"\n"}• <Text style={{ fontWeight: '600' }}>Teaching Aids</Text> (Optional)
                      {"\n"}• <Text style={{ fontWeight: '600' }}>Learning Outcomes</Text> (Optional)
                    </Text>

                    <Pressable
                      onPress={() => Linking.openURL(getSubjectLearningPlanTemplateUrl())}
                      style={styles.templateLink}
                    >
                      <Ionicons name="download-outline" size={16} color={AppTheme.colors.primaryDark} />
                      <Text style={styles.templateLinkText}>Download blank format template</Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.aiPhotoInfoBox}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <Ionicons name="sparkles" size={16} color="#0284C7" />
                      <Text style={styles.aiPhotoInfoTitle}>AI-Powered Micro Planner Scan</Text>
                    </View>
                    <Text style={styles.aiPhotoInfoBody}>
                      Upload or take a photo of a physical/printed Micro Planner table sheet.
                      {"\n\n"}
                      Gemini AI will automatically extract all rows, detect <Text style={{ fontWeight: "700" }}>Topic Names (Chapters)</Text>, <Text style={{ fontWeight: "700" }}>Sub Topics</Text>, <Text style={{ fontWeight: "600" }}>Classwork Activities</Text>, <Text style={{ fontWeight: "600" }}>Homework</Text>, and <Text style={{ fontWeight: "600" }}>Learning Outcomes</Text>, creating missing chapters automatically!
                    </Text>
                  </View>
                )}

                <Pressable style={styles.pickButton} onPress={handlePick}>
                  <Ionicons
                    name={
                      pickedName
                        ? "checkmark-circle"
                        : importMode === "excel"
                        ? "cloud-upload-outline"
                        : "camera-outline"
                    }
                    size={22}
                    color={AppTheme.colors.primaryDark}
                  />
                  <Text style={styles.pickButtonText} numberOfLines={1}>
                    {pickedName ?? (importMode === "excel" ? "Choose an Excel file" : "Select or Snap Micro Planner Photo")}
                  </Text>
                </Pressable>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {importedCount !== null ? (
                  <View style={styles.resultBox}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#127A40" style={{ marginTop: 2 }} />
                    <Text style={styles.resultText}>
                      Successfully imported <Text style={{ fontWeight: "800" }}>{importedCount}</Text> lecture planner entries!
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  style={[styles.submitButton, (!pickedUri || uploading) && styles.submitDisabled]}
                  onPress={handleImport}
                  disabled={!pickedUri || uploading}
                >
                  {uploading ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <ActivityIndicator color="#FFFFFF" />
                      <Text style={styles.submitText}>
                        {importMode === "photo" ? "Scanning Photo with AI..." : "Importing Entries..."}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.submitText}>
                      {importMode === "photo" ? "Scan Photo & Import Entries" : "Import Entries"}
                    </Text>
                  )}
                </Pressable>

                <View style={{ height: 24 }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  sheet: {
    backgroundColor: AppTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "88%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: AppTheme.colors.textPrimary,
  },
  modeToggleRow: {
    flexDirection: "row",
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.medium,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.small,
  },
  modeTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },
  modeTabTextActive: {
    fontWeight: "700",
    color: AppTheme.colors.primaryDark,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 19,
    color: AppTheme.colors.textSecondary,
    marginBottom: 12,
  },
  aiPhotoInfoBox: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: AppTheme.radius.medium,
    padding: 14,
    marginBottom: 16,
  },
  aiPhotoInfoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0284C7",
  },
  aiPhotoInfoBody: {
    fontSize: 13,
    lineHeight: 19,
    color: "#334155",
  },
  templateLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
  },
  templateLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: AppTheme.colors.primaryDark,
  },
  pickButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 54,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: AppTheme.colors.primaryLight,
    borderRadius: AppTheme.radius.large,
    paddingHorizontal: 16,
    backgroundColor: AppTheme.colors.surfaceSoft,
  },
  pickButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: AppTheme.colors.textPrimary,
  },
  errorText: {
    marginTop: 16,
    color: "#DC2626",
    fontSize: 13,
  },
  resultBox: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#E8F7EE",
    borderRadius: AppTheme.radius.large,
    padding: 16,
  },
  resultText: {
    fontSize: 14,
    color: "#127A40",
    flex: 1,
  },
  submitButton: {
    marginTop: 24,
    height: 52,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: {
    backgroundColor: "#9AA6B2",
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
