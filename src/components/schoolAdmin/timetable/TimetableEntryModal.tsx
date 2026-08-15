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

import {
  SelectionBottomSheet,
  SelectionItem,
} from "../../common/SelectionBottomSheet";
import {
  ClassOut,
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
  label?: string;
  isBreak?: boolean;
  periodNumber?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: TimetableEntryPayload) => Promise<void> | void;
  /** All classes available to pick from */
  classes: ClassOut[];
  dayOfWeek: string;
  teachers: TeacherOut[];
  initialEntry?: TimetableEntryOut | null;
  submitting?: boolean;
  errorMessage?: string | null;
  /** Pre-configured period slots */
  periodSlots?: PeriodSlot[];
  /** Subjects already loaded for each class (classId → list) */
  subjectsCache?: Record<number, SubjectOut[]>;
  /** Callback to fetch subjects for a given class on demand */
  onFetchSubjects?: (classId: number) => Promise<SubjectOut[]>;
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
  classes,
  dayOfWeek,
  teachers,
  initialEntry,
  submitting = false,
  errorMessage,
  periodSlots = [],
  subjectsCache = {},
  onFetchSubjects,
}: Props) {
  const isEditing = Boolean(initialEntry);

  const [classId, setClassId] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<PeriodSlot | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [room, setRoom] = useState("");
  const [subjects, setSubjects] = useState<SubjectOut[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // ─── Initialise when modal opens ────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;

    if (initialEntry) {
      // Editing an existing entry — pre-fill all fields
      setClassId(initialEntry.class_id);
      const matchingSlot = periodSlots.find(
        (s) => (s.periodNumber ?? s.number) === initialEntry.period_number && !s.isBreak
      ) || periodSlots.find((s) => s.number === initialEntry.period_number);
      setSelectedSlot(matchingSlot ?? null);
      setSubjectId(initialEntry.subject_id);
      setTeacherId(initialEntry.teacher_id);
      setRoom(initialEntry.room ?? "");
    } else {
      // New entry — default to first class, first non-break slot
      const defaultClassId = classes[0]?.id ?? 0;
      setClassId(defaultClassId);
      const firstTeachingSlot = periodSlots.find((s) => !s.isBreak) ?? periodSlots[0] ?? null;
      setSelectedSlot(firstTeachingSlot);
      setSubjectId(null);
      setTeacherId(null);
      setRoom("");
    }
    setLocalError(null);
  }, [visible, initialEntry]);

  // ─── Load subjects whenever classId changes ──────────────────────────────
  useEffect(() => {
    if (!classId || !visible) return;

    // Use cached subjects if available
    if (subjectsCache[classId]) {
      setSubjects(subjectsCache[classId]);
      return;
    }

    // Otherwise fetch
    if (onFetchSubjects) {
      setLoadingSubjects(true);
      onFetchSubjects(classId)
        .then((list) => setSubjects(list))
        .finally(() => setLoadingSubjects(false));
    }
  }, [classId, visible]);

  // When subjectsCache updates externally (e.g. prefetch), sync locally
  useEffect(() => {
    if (classId && subjectsCache[classId]) {
      setSubjects(subjectsCache[classId]);
    }
  }, [subjectsCache, classId]);

  // ─── Derived display values ──────────────────────────────────────────────
  const classItems: SelectionItem[] = classes.map((c) => ({
    id: String(c.id),
    label: `${c.name} – Section ${c.section}`,
  }));
  const subjectItems: SelectionItem[] = subjects.map((s) => ({
    id: String(s.id),
    label: s.name,
  }));
  const teacherItems: SelectionItem[] = teachers.map((t) => ({
    id: String(t.id),
    label: t.name,
  }));

  const selectedClassName = classes.find((c) => c.id === classId);
  const selectedClassLabel = selectedClassName
    ? `${selectedClassName.name} – Sec ${selectedClassName.section}`
    : undefined;
  const selectedSubjectName = subjects.find((s) => s.id === subjectId)?.name;
  const selectedTeacherName = teachers.find((t) => t.id === teacherId)?.name;

  // ─── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!classId) {
      setLocalError("Select a class.");
      return;
    }
    if (!selectedSlot) {
      setLocalError(
        periodSlots.length === 0
          ? "No period slots configured. Set up your school's period schedule first."
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
      period_number: selectedSlot.periodNumber ?? selectedSlot.number,
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
              {/* Drag handle */}
              <View style={styles.dragHandle} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.title}>{isEditing ? "Edit Period" : "Add Period"}</Text>
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
                {/* ── Class ────────────────────────────────────────── */}
                <Text style={styles.label}>Class</Text>
                <Pressable
                  style={styles.selectInput}
                  onPress={() => setShowClassPicker(true)}
                >
                  <Text style={[styles.selectInputText, !selectedClassLabel && styles.placeholderText]}>
                    {selectedClassLabel ?? "Select a class"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={AppTheme.colors.textSecondary} />
                </Pressable>

                {/* ── Period Slot Chips ────────────────────────────── */}
                <Text style={styles.label}>Period Slot</Text>

                {noPeriods ? (
                  <View style={styles.noPeriodsBanner}>
                    <Ionicons name="time-outline" size={18} color={AppTheme.colors.warning} />
                    <Text style={styles.noPeriodsBannerText}>
                      No period slots configured. Set up periods from the "Set Up Periods" button on the timetable screen.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.slotRow}
                  >
                    {periodSlots.map((slot) => {
                      if (slot.isBreak) {
                        return (
                          <View
                            key={`break-${slot.number}`}
                            style={[
                              styles.slotChip,
                              { backgroundColor: "#FFF7ED", borderColor: "#FDBA74", opacity: 0.85 },
                            ]}
                          >
                            <Text style={[styles.slotChipNum, { color: "#C2410C", fontSize: 11 }]}>
                              ☕ {slot.label || "Break"}
                            </Text>
                            <Text style={[styles.slotChipTime, { color: "#9A3412" }]}>
                              {fmt12(slot.startTime)}
                            </Text>
                          </View>
                        );
                      }
                      const pNum = slot.periodNumber ?? slot.number;
                      const active =
                        (selectedSlot?.periodNumber ?? selectedSlot?.number) === pNum &&
                        !selectedSlot?.isBreak;
                      return (
                        <Pressable
                          key={slot.number}
                          onPress={() => setSelectedSlot(slot)}
                          style={[styles.slotChip, active && styles.slotChipActive]}
                        >
                          <Text style={[styles.slotChipNum, active && styles.slotChipNumActive]}>
                            P{pNum}
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

                {selectedSlot && (
                  <View style={styles.selectedSlotPill}>
                    <Ionicons name="time-outline" size={13} color={AppTheme.colors.primary} />
                    <Text style={styles.selectedSlotText}>
                      Period {selectedSlot.periodNumber ?? selectedSlot.number} · {fmt12(selectedSlot.startTime)} – {fmt12(selectedSlot.endTime)}
                    </Text>
                  </View>
                )}

                {/* ── Subject ──────────────────────────────────────── */}
                <Text style={styles.label}>Subject</Text>
                {loadingSubjects ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={AppTheme.colors.primary} />
                    <Text style={styles.loadingRowText}>Loading subjects…</Text>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.selectInput, !classId && styles.selectInputDisabled]}
                    onPress={() => classId && setShowSubjectPicker(true)}
                  >
                    <Text style={[styles.selectInputText, !selectedSubjectName && styles.placeholderText]}>
                      {!classId
                        ? "Select a class first"
                        : subjects.length === 0
                        ? "No subjects in this class yet"
                        : selectedSubjectName ?? "Choose from class subjects"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={AppTheme.colors.textSecondary} />
                  </Pressable>
                )}

                {/* ── Teacher ──────────────────────────────────────── */}
                <Text style={styles.label}>Teacher</Text>
                <Pressable
                  style={styles.selectInput}
                  onPress={() => setShowTeacherPicker(true)}
                >
                  <Text style={[styles.selectInputText, !selectedTeacherName && styles.placeholderText]}>
                    {selectedTeacherName ?? "Assign a teacher"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={AppTheme.colors.textSecondary} />
                </Pressable>

                {/* ── Room ─────────────────────────────────────────── */}
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

      {/* Class picker */}
      <SelectionBottomSheet
        visible={showClassPicker}
        title="Select Class"
        items={classItems}
        selectedId={classId ? String(classId) : undefined}
        placeholder="Search classes..."
        onClose={() => setShowClassPicker(false)}
        onSelect={(item) => {
          const newId = Number(item.id);
          setClassId(newId);
          setSubjectId(null); // Reset subject when class changes
        }}
      />

      {/* Subject picker */}
      <SelectionBottomSheet
        visible={showSubjectPicker}
        title="Choose a Subject"
        items={subjectItems}
        selectedId={subjectId ? String(subjectId) : undefined}
        placeholder="Search subjects..."
        onClose={() => setShowSubjectPicker(false)}
        onSelect={(item) => setSubjectId(Number(item.id))}
      />

      {/* Teacher picker */}
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

  slotRow: { gap: 8, paddingVertical: 2 },

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
  slotChipNum: { fontSize: 13, fontWeight: "800", color: AppTheme.colors.textPrimary },
  slotChipNumActive: { color: AppTheme.colors.primaryDark },
  slotChipTime: { fontSize: 10, color: AppTheme.colors.textSecondary, fontWeight: "500" },
  slotChipTimeActive: { color: AppTheme.colors.primary },
  slotChipLabel: {
    fontSize: 9,
    color: AppTheme.colors.hint,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  slotChipLabelActive: { color: AppTheme.colors.primary },

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

  // ── Loading subjects ───────────────────────────────────────────────
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.surfaceSoft,
  },
  loadingRowText: {
    fontSize: 14,
    color: AppTheme.colors.textSecondary,
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
  selectInputDisabled: {
    opacity: 0.6,
  },
  selectInputText: { fontSize: 15, color: AppTheme.colors.textPrimary, flex: 1 },
  placeholderText: { color: AppTheme.colors.textPlaceholder },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  errorText: { flex: 1, color: "#DC2626", fontSize: 13 },

  submitButton: {
    marginTop: 24,
    height: 52,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: { backgroundColor: AppTheme.colors.disabled },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
