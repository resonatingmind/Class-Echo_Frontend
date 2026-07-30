import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "../../theme/AppTheme";
import { LearningPlanOut } from "../../types/api";

type Props = {
  items: LearningPlanOut[];
  onEditItem?: (item: LearningPlanOut) => void;
  onDeleteItem?: (item: LearningPlanOut) => void;
  onSelectItem?: (item: LearningPlanOut) => void;
  selectedItemId?: number | null;
  readOnly?: boolean;
};

export function LearningPlanTable({
  items,
  onEditItem,
  onDeleteItem,
  onSelectItem,
  selectedItemId,
  readOnly = false,
}: Props) {
  if (items.length === 0) {
    return (
      <View style={[styles.emptyState, { width: "100%" }]}>
        <Ionicons name="journal-outline" size={40} color="#94A3B8" />
        <Text style={styles.emptyTitle}>No Learning Plan Entries</Text>
        <Text style={styles.emptySubtitle}>
          Add entries to the Micro Planner for this chapter to align lecture recordings with planned learning outcomes.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ width: "100%" }}
      contentContainerStyle={{ minWidth: "100%" }}
    >
      <View style={[styles.container, { width: "100%" }]}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.dateCol]}>DATE</Text>
          <Text style={[styles.headerCell, styles.topicCol]}>TOPIC NAME</Text>
          <Text style={[styles.headerCell, styles.subTopicCol]}>SUB TOPIC</Text>
          <Text style={[styles.headerCell, styles.activitiesCol]}>
            CLASSWORK, KEY STRATEGIES & ACTIVITIES
          </Text>
          <Text style={[styles.headerCell, styles.assessmentCol]}>
            ASSESSMENT / EXTENSION TASK
          </Text>
          <Text style={[styles.headerCell, styles.aidsCol]}>TEACHING AIDS</Text>
          <Text style={[styles.headerCell, styles.outcomesCol]}>
            LEARNING OUTCOMES
          </Text>
          {!readOnly ? (
            <Text style={[styles.headerCell, styles.actionCol]}>ACTIONS</Text>
          ) : null}
        </View>

        {/* Table Rows */}
        {items.map((item, idx) => {
          const isSelected = selectedItemId === item.id;
          const isEven = idx % 2 === 0;

          return (
            <Pressable
              key={item.id}
              style={[
                styles.tableRow,
                isEven ? styles.evenRow : styles.oddRow,
                isSelected && styles.selectedRow,
              ]}
              onPress={() => onSelectItem?.(item)}
            >
              <Text style={[styles.cellText, styles.dateCol, styles.boldText]}>
                {item.date || "—"}
              </Text>
              <Text style={[styles.cellText, styles.topicCol, styles.boldText]}>
                {item.topic_name}
              </Text>
              <Text style={[styles.cellText, styles.subTopicCol]}>
                {item.sub_topic}
              </Text>
              <Text style={[styles.cellText, styles.activitiesCol]}>
                {item.classwork_activities || "None"}
              </Text>
              <Text style={[styles.cellText, styles.assessmentCol, styles.mutedText]}>
                {item.assessment_task || "None"}
              </Text>
              <Text style={[styles.cellText, styles.aidsCol, styles.mutedText]}>
                {item.teaching_aids || "None"}
              </Text>
              <Text style={[styles.cellText, styles.outcomesCol]}>
                {item.learning_outcomes || "None"}
              </Text>

              {!readOnly ? (
                <View style={[styles.actionCol, styles.actionButtons]}>
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => onEditItem?.(item)}
                  >
                    <Ionicons name="pencil" size={16} color="#0284C7" />
                  </Pressable>
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => onDeleteItem?.(item)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: AppTheme.radius.small,
    borderWidth: 1,
    borderColor: "#1E293B",
    overflow: "hidden",
    minWidth: 1050,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0B132B",
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  headerCell: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    alignItems: "center",
  },
  evenRow: {
    backgroundColor: "#FFFFFF",
  },
  oddRow: {
    backgroundColor: "#F8FAFC",
  },
  selectedRow: {
    backgroundColor: "#E0F2FE",
    borderColor: "#0284C7",
  },
  cellText: {
    fontSize: 13,
    color: "#1E293B",
    lineHeight: 18,
  },
  boldText: {
    fontWeight: "700",
    color: "#0F172A",
  },
  mutedText: {
    color: "#64748B",
    fontStyle: "italic",
  },
  dateCol: { width: 70 },
  topicCol: { width: 140 },
  subTopicCol: { width: 140 },
  activitiesCol: { width: 220 },
  assessmentCol: { width: 130 },
  aidsCol: { width: 110 },
  outcomesCol: { width: 200 },
  actionCol: { width: 70 },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  iconBtn: {
    padding: 4,
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 400,
  },
});
