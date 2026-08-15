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

import { importSchoolSubjectLearningPlans, importTeacherSubjectLearningPlans, getSubjectLearningPlanTemplateUrl } from "../../lib/api";

type Props = {
  role: "teacher" | "school_admin";
  subjectId: number;
  visible: boolean;
  onClose: () => void;
  token: string;
  onImported: () => void;
};

const XLSX_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export function ImportLearningPlansModal({
  role,
  subjectId,
  visible,
  onClose,
  token,
  onImported,
}: Props) {
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

  const handlePick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: XLSX_TYPES,
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setPickedUri(asset.uri);
      setPickedName(asset.name);
      setPickedMime(asset.mimeType || pickedMime);
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

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.helpText}>
                  Upload an Excel sheet (.xlsx or .xls) to populate this subject's lecture planner.
                  {"\n\n"}
                  The spreadsheet must contain the following columns:
                  {"\n"}• <Text style={{ fontWeight: '700' }}>Chapter Name</Text> (Required - Auto-creates chapters if missing)
                  {"\n"}• <Text style={{ fontWeight: '700' }}>Lecture Title</Text> (Required)
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

                <Pressable style={styles.pickButton} onPress={handlePick}>
                  <Ionicons
                    name={pickedName ? "document-text" : "cloud-upload-outline"}
                    size={22}
                    color={AppTheme.colors.primaryDark}
                  />
                  <Text style={styles.pickButtonText} numberOfLines={1}>
                    {pickedName ?? "Choose an Excel file"}
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
                  style={[styles.submitButton, !pickedUri && styles.submitDisabled]}
                  onPress={handleImport}
                  disabled={!pickedUri || uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>Import Entries</Text>
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
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: AppTheme.colors.textPrimary,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 19,
    color: AppTheme.colors.textSecondary,
    marginBottom: 12,
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
