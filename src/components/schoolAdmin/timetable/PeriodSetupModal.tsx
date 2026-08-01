import { AppTheme } from '../../../theme/AppTheme';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { PeriodSlot } from "./TimetableEntryModal";

const STORAGE_KEY = "school_period_slots_v1";

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function fmt12(time: string): string {
  if (!TIME_PATTERN.test(time)) return time;
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Default templates to get started quickly */
const DEFAULT_TEMPLATES = [
  { label: "6 periods (45 min)", slots: buildSlots(6, "08:00", 45) },
  { label: "7 periods (45 min)", slots: buildSlots(7, "08:00", 45) },
  { label: "8 periods (40 min)", slots: buildSlots(8, "08:00", 40) },
];

function buildSlots(count: number, startTime: string, durationMin: number): PeriodSlot[] {
  const slots: PeriodSlot[] = [];
  let [h, m] = startTime.split(":").map(Number);
  for (let i = 1; i <= count; i++) {
    const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    let endH = h;
    let endM = m + durationMin;
    while (endM >= 60) { endM -= 60; endH++; }
    const end = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    slots.push({ number: i, startTime: start, endTime: end });
    // 5 min break between periods
    h = endH;
    m = endM + 5;
    if (m >= 60) { m -= 60; h++; }
  }
  return slots;
}

type EditRow = {
  number: number;
  startTime: string;
  endTime: string;
  label: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (slots: PeriodSlot[]) => void;
  initialSlots?: PeriodSlot[];
};

export function PeriodSetupModal({ visible, onClose, onSave, initialSlots = [] }: Props) {
  const [rows, setRows] = useState<EditRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [showTemplates, setShowTemplates] = useState(false);

  // Initialise rows when modal opens
  useEffect(() => {
    if (!visible) return;
    if (initialSlots.length > 0) {
      setRows(initialSlots.map((s) => ({ ...s, label: s.label ?? "" })));
    } else {
      setRows([]);
    }
    setErrors({});
  }, [visible]);

  const addRow = () => {
    const nextNum = rows.length > 0 ? rows[rows.length - 1].number + 1 : 1;
    setRows((prev) => [
      ...prev,
      { number: nextNum, startTime: "", endTime: "", label: "" },
    ]);
  };

  const removeRow = (number: number) => {
    setRows((prev) =>
      prev
        .filter((r) => r.number !== number)
        .map((r, i) => ({ ...r, number: i + 1 })),
    );
  };

  const updateRow = (number: number, key: keyof EditRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.number === number ? { ...r, [key]: value } : r)),
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next[number];
      return next;
    });
  };

  const applyTemplate = (slots: PeriodSlot[]) => {
    setRows(slots.map((s) => ({ ...s, label: s.label ?? "" })));
    setShowTemplates(false);
    setErrors({});
  };

  const validate = (): boolean => {
    const errs: Record<number, string> = {};
    for (const r of rows) {
      if (!TIME_PATTERN.test(r.startTime)) {
        errs[r.number] = 'Start time must be like "08:00"';
      } else if (!TIME_PATTERN.test(r.endTime)) {
        errs[r.number] = 'End time must be like "09:00"';
      } else if (r.startTime >= r.endTime) {
        errs[r.number] = "End time must be after start time";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (rows.length === 0) {
      Alert.alert("No periods", "Add at least one period slot before saving.");
      return;
    }
    if (!validate()) return;

    setSaving(true);
    try {
      const slots: PeriodSlot[] = rows.map((r) => ({
        number: r.number,
        startTime: r.startTime.trim(),
        endTime: r.endTime.trim(),
        label: r.label.trim() || undefined,
      }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
      onSave(slots);
      onClose();
    } catch {
      Alert.alert("Error", "Couldn't save period slots. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* ── Drag handle ────────────────────────────────────── */}
              <View style={styles.dragHandle} />

              {/* ── Header ─────────────────────────────────────────── */}
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Period Setup</Text>
                  <Text style={styles.subtitle}>
                    Configure your school's daily period schedule
                  </Text>
                </View>
                <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={AppTheme.colors.textSecondary} />
                </Pressable>
              </View>

              {/* ── Quick template strip ────────────────────────────── */}
              <View style={styles.templateStrip}>
                <Text style={styles.templateLabel}>Quick templates:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.templateRow}
                >
                  {DEFAULT_TEMPLATES.map((t) => (
                    <Pressable
                      key={t.label}
                      style={({ pressed }) => [
                        styles.templateChip,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => applyTemplate(t.slots)}
                    >
                      <Ionicons
                        name="flash-outline"
                        size={11}
                        color={AppTheme.colors.primary}
                      />
                      <Text style={styles.templateChipText}>{t.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* ── Info note ──────────────────────────────────────── */}
              <View style={styles.infoNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={AppTheme.colors.primary}
                />
                <Text style={styles.infoNoteText}>
                  These slots are saved on this device. Once set, just pick a
                  period number when adding entries — no need to type times.
                </Text>
              </View>

              {/* ── Rows ───────────────────────────────────────────── */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.scroll}
              >
                {rows.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="time-outline"
                      size={36}
                      color={AppTheme.colors.disabled}
                    />
                    <Text style={styles.emptyText}>
                      No periods yet. Apply a template or add manually.
                    </Text>
                  </View>
                ) : (
                  rows.map((row, idx) => (
                    <View key={row.number} style={styles.periodRow}>
                      {/* Period badge */}
                      <View style={styles.periodBadge}>
                        <Text style={styles.periodBadgeText}>P{row.number}</Text>
                      </View>

                      <View style={styles.periodFields}>
                        {/* Times row */}
                        <View style={styles.timesRow}>
                          <View style={styles.timeField}>
                            <Text style={styles.fieldLabel}>Start</Text>
                            <TextInput
                              style={[
                                styles.timeInput,
                                errors[row.number] ? styles.inputError : null,
                              ]}
                              value={row.startTime}
                              onChangeText={(v) => updateRow(row.number, "startTime", v)}
                              placeholder="08:00"
                              placeholderTextColor={AppTheme.colors.hint}
                              keyboardType="numbers-and-punctuation"
                              maxLength={5}
                            />
                          </View>

                          <Text style={styles.timeDash}>–</Text>

                          <View style={styles.timeField}>
                            <Text style={styles.fieldLabel}>End</Text>
                            <TextInput
                              style={[
                                styles.timeInput,
                                errors[row.number] ? styles.inputError : null,
                              ]}
                              value={row.endTime}
                              onChangeText={(v) => updateRow(row.number, "endTime", v)}
                              placeholder="08:45"
                              placeholderTextColor={AppTheme.colors.hint}
                              keyboardType="numbers-and-punctuation"
                              maxLength={5}
                            />
                          </View>

                          {/* Label */}
                          <View style={[styles.timeField, { flex: 1.4 }]}>
                            <Text style={styles.fieldLabel}>Label (opt.)</Text>
                            <TextInput
                              style={styles.timeInput}
                              value={row.label}
                              onChangeText={(v) => updateRow(row.number, "label", v)}
                              placeholder="Lunch"
                              placeholderTextColor={AppTheme.colors.hint}
                            />
                          </View>
                        </View>

                        {/* Time range preview */}
                        {TIME_PATTERN.test(row.startTime) && TIME_PATTERN.test(row.endTime) && (
                          <Text style={styles.timePreview}>
                            {fmt12(row.startTime)} – {fmt12(row.endTime)}
                          </Text>
                        )}

                        {/* Error */}
                        {errors[row.number] ? (
                          <Text style={styles.rowError}>{errors[row.number]}</Text>
                        ) : null}
                      </View>

                      {/* Delete */}
                      <Pressable
                        onPress={() => removeRow(row.number)}
                        hitSlop={8}
                        style={styles.removeBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))
                )}

                {/* Add row button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.addRowBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={addRow}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color={AppTheme.colors.primary}
                  />
                  <Text style={styles.addRowText}>Add Period</Text>
                </Pressable>

                <View style={{ height: 8 }} />
              </ScrollView>

              {/* ── Footer ─────────────────────────────────────────── */}
              <View style={styles.footer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.saveBtn,
                    pressed && { opacity: 0.88 },
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.saveText}>Save Periods</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/** Load saved period slots from AsyncStorage */
export async function loadPeriodSlots(): Promise<PeriodSlot[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PeriodSlot[];
  } catch {
    return [];
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },

  sheet: {
    backgroundColor: AppTheme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "92%",
  },

  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppTheme.colors.border,
    alignSelf: "center",
    marginBottom: 14,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: AppTheme.colors.textPrimary,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
  },

  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },

  templateStrip: {
    gap: 6,
    marginBottom: 10,
  },
  templateLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
    letterSpacing: 0.4,
  },
  templateRow: {
    gap: 8,
  },
  templateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: AppTheme.colors.primaryLight,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + "33",
  },
  templateChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.primaryDark,
  },

  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: AppTheme.colors.primaryLight,
    borderRadius: AppTheme.radius.medium,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + "22",
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    color: AppTheme.colors.primaryDark,
    lineHeight: 17,
  },

  scroll: { flex: 1 },

  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 18,
  },

  // ── Period row ────────────────────────────────────────────────────
  periodRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.medium,
    padding: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },

  periodBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: AppTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  periodFields: {
    flex: 1,
    gap: 4,
  },

  timesRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },

  timeField: {
    flex: 1,
    gap: 3,
  },

  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
    letterSpacing: 0.3,
  },

  timeInput: {
    height: 40,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.small,
    paddingHorizontal: 10,
    fontSize: 14,
    color: AppTheme.colors.textPrimary,
    backgroundColor: AppTheme.colors.surface,
  },

  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FFF1F2",
  },

  timeDash: {
    fontSize: 16,
    color: AppTheme.colors.textSecondary,
    paddingBottom: 10,
  },

  timePreview: {
    fontSize: 11,
    color: AppTheme.colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },

  rowError: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 2,
  },

  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.primary + "55",
    borderStyle: "dashed",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  addRowText: {
    fontSize: 14,
    fontWeight: "700",
    color: AppTheme.colors.primary,
  },

  // ── Footer ───────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.border,
  },

  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },

  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  saveText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
