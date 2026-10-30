import { AppTheme } from '../../../theme/AppTheme';
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../../../theme/colors";
import { importSchoolTimetable, getTimetableTemplateUrl } from "../../../lib/api";
import { TimetableImportResult } from "../../../types/api";

type Props = {
  visible: boolean;
  onClose: () => void;
  token: string;
  onImported: () => void;
};

const XLSX_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export function ImportTimetableModal({ visible, onClose, token, onImported }: Props) {
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [pickedMime, setPickedMime] = useState<string>(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<TimetableImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPickedName(null);
    setPickedUri(null);
    setReplaceExisting(false);
    setResult(null);
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
      setResult(null);
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
      const res = await importSchoolTimetable(
        token,
        pickedUri,
        pickedMime,
        pickedName,
        replaceExisting,
      );
      setResult(res);
      if (res.created > 0 || res.updated > 0) {
        onImported();
      }
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
                <Text style={styles.title}>Import Timetable</Text>
                <Pressable onPress={handleClose} hitSlop={12}>
                  <Ionicons name="close" size={24} color={AppTheme.colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.helpText}>
                  Upload an Excel sheet (.xlsx) with columns for Class, Section, Day,
                  Period, Start Time, End Time, Subject and Teacher Email (all
                  required), plus optional Room and Academic Year. Subjects must
                  already exist on the class and teachers must already be added to
                  the school. You can list one day, a full week, or the whole school
                  in one file.
                </Text>

                <Pressable
                  onPress={() => Linking.openURL(getTimetableTemplateUrl())}
                  style={styles.templateLink}
                >
                  <Ionicons name="download-outline" size={16} color={AppTheme.colors.primaryDark} />
                  <Text style={styles.templateLinkText}>Download a blank template</Text>
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

                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>Replace existing periods</Text>
                    <Text style={styles.switchHint}>
                      Overwrite periods that already exist for the same class, day, and
                      period number.
                    </Text>
                  </View>
                  <Switch
                    value={replaceExisting}
                    onValueChange={setReplaceExisting}
                    trackColor={{ false: AppTheme.colors.border, true: AppTheme.colors.primaryLight }}
                    thumbColor={replaceExisting ? AppTheme.colors.primary : "#f4f3f4"}
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {result ? (
                  <View style={styles.resultBox}>
                    <View style={styles.resultRow}>
                      <View style={styles.resultStat}>
                        <Text style={styles.resultNumber}>{result.created}</Text>
                        <Text style={styles.resultLabel}>Added</Text>
                      </View>
                      <View style={styles.resultStat}>
                        <Text style={styles.resultNumber}>{result.updated}</Text>
                        <Text style={styles.resultLabel}>Updated</Text>
                      </View>
                      <View style={styles.resultStat}>
                        <Text style={styles.resultNumber}>{result.skipped}</Text>
                        <Text style={styles.resultLabel}>Skipped</Text>
                      </View>
                    </View>

                    {result.errors.length > 0 && (
                      <View style={styles.issuesBox}>
                        <Text style={styles.issuesTitle}>
                          {result.errors.length} row
                          {result.errors.length === 1 ? "" : "s"} need attention
                        </Text>
                        {result.errors.slice(0, 8).map((e, i) => (
                          <Text key={i} style={styles.issueText}>
                            • {e}
                          </Text>
                        ))}
                        {result.errors.length > 8 ? (
                          <Text style={styles.issueText}>
                            + {result.errors.length - 8} more
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                ) : null}

                <Pressable
                  style={[styles.submitButton, !pickedUri && styles.submitDisabled]}
                  onPress={handleImport}
                  disabled={!pickedUri || uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={AppTheme.colors.white} />
                  ) : (
                    <Text style={styles.submitText}>Import Timetable</Text>
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

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },

  switchLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },

  switchHint: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
    marginTop: 2,
  },

  errorText: {
    marginTop: 16,
    color: AppTheme.colors.danger,
    fontSize: 13,
  },

  resultBox: {
    marginTop: 20,
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.large,
    padding: 16,
  },

  resultRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },

  resultStat: {
    alignItems: "center",
  },

  resultNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: AppTheme.colors.textPrimary,
  },

  resultLabel: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
    marginTop: 2,
  },

  issuesBox: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.border,
    paddingTop: 12,
    gap: 4,
  },

  issuesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
    marginBottom: 4,
  },

  issueText: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
    lineHeight: 17,
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
    color: AppTheme.colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});



