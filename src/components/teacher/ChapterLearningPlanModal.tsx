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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "../../theme/AppTheme";
import { LearningPlanOut, LearningPlanCreatePayload } from "../../types/api";

type Props = {
  visible: boolean;
  initialItem?: LearningPlanOut | null;
  loading?: boolean;
  onClose: () => void;
  onSave: (payload: LearningPlanCreatePayload) => void;
};

export function ChapterLearningPlanModal({
  visible,
  initialItem,
  loading = false,
  onClose,
  onSave,
}: Props) {
  const [date, setDate] = useState("");
  const [topicName, setTopicName] = useState("");
  const [subTopic, setSubTopic] = useState("");
  const [classworkActivities, setClassworkActivities] = useState("");
  const [assessmentTask, setAssessmentTask] = useState("");
  const [teachingAids, setTeachingAids] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialItem) {
      setDate(initialItem.date ?? "");
      setTopicName(initialItem.topic_name ?? "");
      setSubTopic(initialItem.sub_topic ?? "");
      setClassworkActivities(initialItem.classwork_activities ?? "");
      setAssessmentTask(initialItem.assessment_task ?? "");
      setTeachingAids(initialItem.teaching_aids ?? "");
      setLearningOutcomes(initialItem.learning_outcomes ?? "");
    } else {
      setDate("");
      setTopicName("");
      setSubTopic("");
      setClassworkActivities("");
      setAssessmentTask("");
      setTeachingAids("");
      setLearningOutcomes("");
    }
    setError(null);
  }, [initialItem, visible]);

  const handleSubmit = () => {
    if (!topicName.trim()) {
      setError("Topic Name is required.");
      return;
    }
    if (!subTopic.trim()) {
      setError("Sub Topic is required.");
      return;
    }

    onSave({
      date: date.trim() || null,
      topic_name: topicName.trim(),
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
              {initialItem ? "Edit Micro Planner Entry" : "Add Micro Planner Entry"}
            </Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Date (e.g. 14/07)</Text>
              <TextInput
                style={styles.input}
                placeholder="14/07"
                placeholderTextColor="#94A3B8"
                value={date}
                onChangeText={setDate}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Topic Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Co-ordinate Geom"
                placeholderTextColor="#94A3B8"
                value={topicName}
                onChangeText={setTopicName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Sub Topic *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Section Formula"
                placeholderTextColor="#94A3B8"
                value={subTopic}
                onChangeText={setSubTopic}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Classwork, Key Strategies & Activities</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Practice questions are done and concepts will be discussed."
                placeholderTextColor="#94A3B8"
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
                placeholderTextColor="#94A3B8"
                value={assessmentTask}
                onChangeText={setAssessmentTask}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Teaching Aids</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. None, Board, Projector"
                placeholderTextColor="#94A3B8"
                value={teachingAids}
                onChangeText={setTeachingAids}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Learning Outcomes</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Able to understand applications of section formula."
                placeholderTextColor="#94A3B8"
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
                <ActivityIndicator color="#fff" size="small" />
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
    backgroundColor: "#fff",
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
    color: "#0F172A",
  },
  closeBtn: {
    padding: 4,
  },
  errorText: {
    color: "#EF4444",
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
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: AppTheme.radius.small,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
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
    borderTopColor: "#F1F5F9",
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.small,
    backgroundColor: "#F1F5F9",
  },
  cancelText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 14,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.small,
    backgroundColor: "#0284C7",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
