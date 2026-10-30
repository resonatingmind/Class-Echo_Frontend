import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  // @ts-ignore
  createElement
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "../../theme/AppTheme";
import { LearningPlanOut, LearningPlanCreatePayload } from "../../types/api";

type Props = {
  visible: boolean;
  chapterName: string;
  initialItem?: LearningPlanOut | null;
  loading?: boolean;
  onClose: () => void;
  onSave: (payload: LearningPlanCreatePayload) => void;
};

export function ChapterLearningPlanModal({
  visible,
  chapterName,
  initialItem,
  loading = false,
  onClose,
  onSave,
}: Props) {
  const [date, setDate] = useState("");
  const [subTopic, setSubTopic] = useState("");
  const [classworkActivities, setClassworkActivities] = useState("");
  const [assessmentTask, setAssessmentTask] = useState("");
  const [teachingAids, setTeachingAids] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialItem) {
      setDate(initialItem.date ?? "");
      setSubTopic(initialItem.sub_topic ?? "");
      setClassworkActivities(initialItem.classwork_activities ?? "");
      setAssessmentTask(initialItem.assessment_task ?? "");
      setTeachingAids(initialItem.teaching_aids ?? "");
      setLearningOutcomes(initialItem.learning_outcomes ?? "");
    } else {
      setDate("");
      setSubTopic("");
      setClassworkActivities("");
      setAssessmentTask("");
      setTeachingAids("");
      setLearningOutcomes("");
    }
    setError(null);
    setShowDatePicker(false);
  }, [initialItem, visible]);

  const parseDate = (dString: string) => {
    if (!dString) return new Date();
    const parts = dString.split('/');
    if (parts.length === 2) {
      const today = new Date();
      return new Date(today.getFullYear(), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    const d = new Date(dString);
    if (!isNaN(d.getTime())) return d;
    return new Date();
  };

  const handleSubmit = () => {
    if (!subTopic.trim()) {
      setError("Lecture Title is required.");
      return;
    }

    onSave({
      date: date.trim() || null,
      topic_name: chapterName.trim(),
      sub_topic: subTopic.trim(),
      classwork_activities: classworkActivities.trim() || null,
      assessment_task: assessmentTask.trim() || null,
      teaching_aids: teachingAids.trim() || null,
      learning_outcomes: learningOutcomes.trim() || null,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {initialItem ? "Edit Lecture Planner Entry" : "Add Lecture Planner Entry"}
            </Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={AppTheme.colors.slate500} />
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Date *</Text>
              
              {Platform.OS === 'web' ? (
                createElement('input', {
                  type: 'date',
                  value: date ? parseDate(date).toISOString().split('T')[0] : '',
                  onChange: (e: any) => {
                    const val = e.target.value;
                    if (!val) {
                      setDate("");
                      return;
                    }
                    const selectedDate = new Date(val);
                    if (!isNaN(selectedDate.getTime())) {
                      const day = selectedDate.getDate().toString().padStart(2, "0");
                      const month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
                      setDate(`${day}/${month}`);
                    }
                  },
                  style: [styles.input, { width: '100%', boxSizing: 'border-box', outlineStyle: 'none', minHeight: 42 }] as any
                })
              ) : (
                <>
                  <Pressable
                    style={[styles.input, { justifyContent: 'center' }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={{ color: date ? AppTheme.colors.slate900 : AppTheme.colors.slate400, fontSize: 14 }}>
                      {date ? date : "Select a date"}
                    </Text>
                  </Pressable>

                  {showDatePicker && (
                    <DateTimePicker
                      value={parseDate(date)}
                      mode="date"
                      display="default"
                      onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                        if (Platform.OS === "android") {
                          setShowDatePicker(false);
                        }
                        if (event.type === "set" && selectedDate) {
                          const day = selectedDate.getDate().toString().padStart(2, "0");
                          const month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
                          setDate(`${day}/${month}`);
                          if (Platform.OS === "ios") {
                             setShowDatePicker(false);
                          }
                        } else if (event.type === "dismissed") {
                          setShowDatePicker(false);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Chapter Name</Text>
              <View style={[styles.input, styles.disabledInput]}>
                <Text style={styles.disabledText}>{chapterName}</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Lecture Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Introduction & Distance Formula"
                placeholderTextColor={AppTheme.colors.slate400}
                value={subTopic}
                onChangeText={setSubTopic}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Classwork, Key Strategies & Activities</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Practice questions are done and concepts will be discussed."
                placeholderTextColor={AppTheme.colors.slate400}
                value={classworkActivities}
                onChangeText={setClassworkActivities}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Assessment / Extension Task</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ex - 6.1"
                placeholderTextColor={AppTheme.colors.slate400}
                value={assessmentTask}
                onChangeText={setAssessmentTask}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Teaching Aids</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. None, Board, Projector"
                placeholderTextColor={AppTheme.colors.slate400}
                value={teachingAids}
                onChangeText={setTeachingAids}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Learning Outcomes</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Able to understand applications of section formula."
                placeholderTextColor={AppTheme.colors.slate400}
                value={learningOutcomes}
                onChangeText={setLearningOutcomes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.saveBtn, loading && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={AppTheme.colors.white} size="small" />
              ) : (
                <Text style={styles.saveText}>
                  {initialItem ? "Save Changes" : "Create Entry"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: AppTheme.colors.white,
    borderRadius: 16,
    width: "100%",
    maxWidth: 600,
    maxHeight: "85%",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: AppTheme.colors.slate900,
  },
  closeBtn: {
    padding: 4,
  },
  errorText: {
    color: AppTheme.colors.error,
    fontSize: 13,
    marginBottom: 10,
    fontWeight: "600",
  },
  formScroll: {
    marginVertical: 10,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: AppTheme.colors.slate700,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: AppTheme.colors.slate300,
    borderRadius: AppTheme.radius.small,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: AppTheme.colors.slate900,
    backgroundColor: AppTheme.colors.slate50,
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.slate100,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.small,
    backgroundColor: AppTheme.colors.slate100,
  },
  cancelText: {
    color: AppTheme.colors.slate600,
    fontWeight: "600",
    fontSize: 14,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.small,
    backgroundColor: AppTheme.colors.info,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveText: {
    color: AppTheme.colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  disabledInput: {
    backgroundColor: AppTheme.colors.slate200,
    borderColor: AppTheme.colors.slate300,
  },
  disabledText: {
    color: AppTheme.colors.slate600,
    fontSize: 14,
  },
});
