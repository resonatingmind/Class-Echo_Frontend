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

import { colors } from "../../../theme/colors";
import {
  SelectionBottomSheet,
  SelectionItem,
} from "../../common/SelectionBottomSheet";
import {
  SubjectOut,
  TeacherOut,
  TimetableEntryOut,
  TimetableEntryPayload,
} from "../../../types/api";

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
};

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

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
}: Props) {
  const isEditing = Boolean(initialEntry);

  const [periodNumber, setPeriodNumber] = useState("1");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [room, setRoom] = useState("");
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initialEntry) {
      setPeriodNumber(String(initialEntry.period_number));
      setStartTime(initialEntry.start_time);
      setEndTime(initialEntry.end_time);
      setSubjectId(initialEntry.subject_id);
      setTeacherId(initialEntry.teacher_id);
      setRoom(initialEntry.room ?? "");
    } else {
      setPeriodNumber("1");
      setStartTime("08:00");
      setEndTime("08:45");
      setSubjectId(null);
      setTeacherId(null);
      setRoom("");
    }
    setLocalError(null);
  }, [visible, initialEntry]);

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
    const period = parseInt(periodNumber, 10);
    if (!period || period < 1) {
      setLocalError("Enter a valid period number (1 or higher).");
      return;
    }
    if (!TIME_PATTERN.test(startTime.trim()) || !TIME_PATTERN.test(endTime.trim())) {
      setLocalError('Times must look like "08:00" (24-hour format).');
      return;
    }
    if (startTime.trim() >= endTime.trim()) {
      setLocalError("End time must be after start time.");
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
      period_number: period,
      start_time: startTime.trim(),
      end_time: endTime.trim(),
      subject_id: subjectId,
      teacher_id: teacherId,
      room: room.trim() || null,
    };

    onSubmit(payload);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.title}>
                    {isEditing ? "Edit Period" : "Add Period"}
                  </Text>
                  <Text style={styles.subtitle}>{dayOfWeek}</Text>
                </View>

                <Pressable onPress={onClose} hitSlop={12}>
                  <Ionicons name="close" size={24} color={AppTheme.colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.label}>Period Number</Text>
                <TextInput
                  style={styles.input}
                  value={periodNumber}
                  onChangeText={setPeriodNumber}
                  keyboardType="number-pad"
                  placeholder="1"
                />

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Text style={styles.label}>Start Time</Text>
                    <TextInput
                      style={styles.input}
                      value={startTime}
                      onChangeText={setStartTime}
                      placeholder="08:00"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.half}>
                    <Text style={styles.label}>End Time</Text>
                    <TextInput
                      style={styles.input}
                      value={endTime}
                      onChangeText={setEndTime}
                      placeholder="08:45"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

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
                    This class has no subjects yet — add one before scheduling periods.
                  </Text>
                ) : null}

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

                <Text style={styles.label}>Room (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={room}
                  onChangeText={setRoom}
                  placeholder="e.g. 203"
                />

                {(localError || errorMessage) && (
                  <Text style={styles.errorText}>{localError ?? errorMessage}</Text>
                )}

                <Pressable
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>
                      {isEditing ? "Save Changes" : "Add Period"}
                    </Text>
                  )}
                </Pressable>

                <View style={{ height: 20 }} />
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
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

  scroll: {
    marginTop: 4,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
    marginTop: 16,
    marginBottom: 6,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  half: {
    flex: 1,
  },

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
  },

  placeholderText: {
    color: AppTheme.colors.textPlaceholder,
  },

  helperNote: {
    marginTop: 6,
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
  },

  errorText: {
    marginTop: 16,
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

  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});


