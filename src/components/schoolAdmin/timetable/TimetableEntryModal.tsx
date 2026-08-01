import { AppTheme } from '../../../theme/AppTheme';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

import { SelectionBottomSheet, SelectionItem } from "../../common/SelectionBottomSheet";
import {
  SubjectOut,
  TeacherOut,
  TimetableEntryOut,
  TimetableEntryPayload,
} from "../../../types/api";

// ─── Period slot type ─────────────────────────────────────────────────────────
export type PeriodSlot = {
  number: number;
  startTime: string;
  endTime: string;
  label?: string; // e.g. "Lunch", "Assembly"
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: TimetableEntryPayload) => Promise<void> | void;
  classId: number;
  dayOfWeek: string;
  subjects: SubjectOut[];
  teachers: TeacherOut[];
  initialEntry?: TimetableEntryOut | null;
  submitting?: boolean;
  errorMessage?: string | null;
  /** Pre-configured period slots for quick selection */
  periodSlots?: PeriodSlot[];
};

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function fmt12(time: string): string {
  if (!TIME_PATTERN.test(time)) return time;
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function TimetableEntryModal({
  visible,
  onClose,
  onSubmit,
  classId,
  dayOfWeek,
  subjects,
  teachers,
  initialEntry,
  submitting = false,
  errorMessage,
  periodSlots = [],
}: Props) {
  const isEditing = Boolean(initialEntry);

  const [selectedSlot, setSelectedSlot] = useState<PeriodSlot | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [room, setRoom] = useState("");
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initialEntry) {
      // Try to match the entry's period number to a configured slot
      const matchingSlot = periodSlots.find(
        (s) => s.number === initialEntry.period_number,
      );
      setSelectedSlot(matchingSlot ?? null);
      setSubjectId(initialEntry.subject_id);
      setTeacherId(initialEntry.teacher_id);
      setRoom(initialEntry.room ?? "");
    } else {
      setSelectedSlot(periodSlots[0] ?? null);
      setSubjectId(null);
      setTeacherId(null);
      setRoom("");
    }
    setLocalError(null);
  }, [visible, initialEntry, periodSlots]);

  const subjectItems: SelectionItem[] = subjects.map((s) => ({
    id: String(s.id),
    label: s.name,
  }));
  const teacherItems: SelectionItem[] = teachers.map((t) => ({
    id: String(t.id),
    label: t.name,
  }));

  const selectedSubjectName = subjects.find((s) => s.id === subjectId)?.name;
  const selectedTeacherName = teachers.find((t) => t.id === teacherId)?.name;

  const handleSubmit = () => {
    if (!selectedSlot) {
      setLocalError(
        periodSlots.length === 0
          ? "No period slots configured. Please set up periods first."
          : "Select a period slot.",
      );
      return;
    }
    if (!subjectId) {
      setLocalError("Choose a subject for this period.");
      return;
    }
    if (!teacherId) {
      setLocalError("Assign a teacher for this period.");
      return;
    }

    setLocalError(null);

    const payload: TimetableEntryPayload = {
      class_id: classId,
      day_of_week: dayOfWeek,
      period_number: selectedSlot.number,
      start_time: selectedSlot.startTime,
      end_time: selectedSlot.endTime,
      subject_id: subjectId,
      teacher_id: teacherId,
      room: room.trim() || null,
    };

    onSubmit(payload);
  };

  const noPeriods = periodSlots.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* ── Header ─────────────────────────────────────────── */}
              <View style={styles.dragHandle} />
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.title}>
                    {isEditing ? "Edit Period" : "Add Period"}
                  </Text>
                  <Text style={styles.subtitle}>{dayOfWeek}</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={AppTheme.colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* ── Period Slot Picker ──────────────────────────── */}
                <Text style={styles.label}>Period Slot</Text>

                {noPeriods ? (
                  <View style={styles.noPeriodsBanner}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={AppTheme.colors.warning}
                    />
                    <Text style={styles.noPeriodsBannerText}>
                      No period slots configured yet. Set up your school's period
                      schedule from the timetable screen first.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.slotRow}
                  >
                    {periodSlots.map((slot) => {
                      const active = selectedSlot?.number === slot.number;
                      return (
                        <Pressable
                          key={slot.number}
                          onPress={() => setSelectedSlot(slot)}
                          style={[styles.slotChip, active && styles.slotChipActive]}
                        >
                          <Text style={[styles.slotChipNum, active && styles.slotChipNumActive]}>
                            P{slot.number}
                          </Text>
                          <Text style={[styles.slotChipTime, active && styles.slotChipTimeActive]}>
                            {fmt12(slot.startTime)}
                          </Text>
                          {slot.label ? (
                            <Text style={[styles.slotChipLabel, active && styles.slotChipLabelActive]}>
                              {slot.label}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Selected slot detail pill */}
                {selectedSlot && (
                  <View style={styles.selectedSlotPill}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={AppTheme.colors.primary}
                    />
                    <Text style={styles.selectedSlotText}>
                      Period {selectedSlot.number} · {fmt12(selectedSlot.startTime)} – {fmt12(selectedSlot.endTime)}
                    </Text>
                  </View>
                )}

                {/* ── Subject ─────────────────────────────────────── */}
                <Text style={styles.label}>Subject</Text>
                <Pressable
                  style={styles.selectInput}
                  onPress={() => setShowSubjectPicker(true)}
                >
                  <Text
                    style={[
                      styles.selectInputText,
                      !selectedSubjectName && styles.placeholderText,
                    ]}
                  >
                    {selectedSubjectName ?? "Choose from class subjects"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={AppTheme.colors.textSecondary} />
                </Pressable>
                {subjects.length === 0 ? (
                  <Text style={styles.helperNote}>
                    This class has no subjects yet — add one before scheduling.
                  </Text>
                ) : null}

                {/* ── Teacher ─────────────────────────────────────── */}
                <Text style={styles.label}>Teacher</Text>
                <Pressable
                  style={styles.selectInput}
                  onPress={() => setShowTeacherPicker(true)}
                >
                  <Text
                    style={[
                      styles.selectInputText,
                      !selectedTeacherName && styles.placeholderText,
                    ]}
                  >
                    {selectedTeacherName ?? "Assign a teacher"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={AppTheme.colors.textSecondary} />
                </Pressable>

                {/* ── Room ────────────────────────────────────────── */}
                <Text style={styles.label}>Room (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={room}
                  onChangeText={setRoom}
                  placeholder="e.g. 203"
                  placeholderTextColor={AppTheme.colors.textPlaceholder}
                />

                {(localError || errorMessage) && (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                    <Text style={styles.errorText}>{localError ?? errorMessage}</Text>
                  </View>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed && { opacity: 0.88 },
                    (submitting || noPeriods) && styles.submitDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting || noPeriods}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>
                      {isEditing ? "Save Changes" : "Add Period"}
                    </Text>
                  )}
                </Pressable>

                <View style={{ height: 24 }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      <SelectionBottomSheet
        visible={showSubjectPicker}
        title="Choose a Subject"
        items={subjectItems}
        selectedId={subjectId ? String(subjectId) : undefined}
        placeholder="Search subjects..."
        onClose={() => setShowSubjectPicker(false)}
        onSelect={(item) => setSubjectId(Number(item.id))}
      />

      <SelectionBottomSheet
        visible={showTeacherPicker}
        title="Assign a Teacher"
        items={teacherItems}
        selectedId={teacherId ? String(teacherId) : undefined}
        placeholder="Search teachers..."
        onClose={() => setShowTeacherPicker(false)}
        onSelect={(item) => setTeacherId(Number(item.id))}
      />
    </Modal>
  );
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
    paddingBottom: 0,
    maxHeight: "90%",
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
    marginBottom: 8,
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

  scroll: { marginTop: 4 },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // ── Period slot chips ─────────────────────────────────────────────
  noPeriodsBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: AppTheme.radius.medium,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F97316" + "33",
  },
  noPeriodsBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#C2410C",
    lineHeight: 18,
  },

  slotRow: {
    gap: 8,
    paddingVertical: 2,
  },

  slotChip: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    minWidth: 70,
    gap: 2,
  },

  slotChipActive: {
    backgroundColor: AppTheme.colors.primaryLight,
    borderColor: AppTheme.colors.primary,
  },

  slotChipNum: {
    fontSize: 13,
    fontWeight: "800",
    color: AppTheme.colors.textPrimary,
  },

  slotChipNumActive: {
    color: AppTheme.colors.primaryDark,
  },

  slotChipTime: {
    fontSize: 10,
    color: AppTheme.colors.textSecondary,
    fontWeight: "500",
  },

  slotChipTimeActive: {
    color: AppTheme.colors.primary,
  },

  slotChipLabel: {
    fontSize: 9,
    color: AppTheme.colors.hint,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  slotChipLabelActive: {
    color: AppTheme.colors.primary,
  },

  selectedSlotPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: AppTheme.colors.primaryLight,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },

  selectedSlotText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppTheme.colors.primaryDark,
  },

  // ── Common inputs ─────────────────────────────────────────────────
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 14,
    fontSize: 15,
    color: AppTheme.colors.textPrimary,
    backgroundColor: AppTheme.colors.surfaceSoft,
  },

  selectInput: {
    height: 48,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 14,
    backgroundColor: AppTheme.colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectInputText: {
    fontSize: 15,
    color: AppTheme.colors.textPrimary,
    flex: 1,
  },

  placeholderText: {
    color: AppTheme.colors.textPlaceholder,
  },

  helperNote: {
    marginTop: 6,
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },

  errorText: {
    flex: 1,
    color: "#DC2626",
    fontSize: 13,
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
    backgroundColor: AppTheme.colors.disabled,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
