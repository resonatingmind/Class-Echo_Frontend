import { View, Text, Pressable, StyleSheet } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { PlannerChapter } from "../../types/api";

import { colors } from "../../theme/colors";

type Props = {
  chapter: PlannerChapter;

  onOpenDocuments: () => void;

  onAddDocument: () => void;

  onOpenRecordings: () => void;
};

export function PlannerChapterRow({
  chapter,
  onOpenDocuments,
  onAddDocument,
  onOpenRecordings,
}: Props) {
  return (
    <View style={styles.row}>
      <Text style={[styles.chapter, { width: 240 }]}>{chapter.name}</Text>

      {/* Reference Material */}

      <View style={[styles.cell, { width: 180 }]}>
        {/* <Pressable onPress={onOpenDocuments}>
          <Text style={styles.link}>📄 {chapter.document_count}</Text>
        </Pressable>

        <Pressable onPress={onAddDocument} style={styles.addButton}>
          <Ionicons name="add" size={16} color={colors.primary} />
        </Pressable> */}

        <Pressable onPress={onOpenDocuments} style={styles.actionChip}>
          <Ionicons name="document-text-outline" size={16} color="#2563EB" />

          <Text style={styles.actionText}>View ({chapter.document_count})</Text>
        </Pressable>

        <Pressable onPress={onAddDocument} style={styles.addChip}>
          <Ionicons name="add" size={16} color="#16A34A" />

          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>

      {/* Recordings */}

      <View style={[styles.cell, { width: 180 }]}>
        <Pressable onPress={onOpenRecordings}>
          {/* <Text style={styles.link}>🎥 {chapter.recording_count}</Text> */}
          <View style={styles.recordingChip}>
            <Ionicons name="videocam-outline" size={16} color="#EA580C" />

            <Text style={styles.recordingText}>{chapter.recording_count}</Text>
          </View>
        </Pressable>
      </View>

      {/* AI Score */}

      {/* <Text style={[styles.score, { width: 110 }]}>
        {chapter.average_score == null ? "--" : `${chapter.average_score}%`}
      </Text> */}

      <View style={styles.scoreChip}>
        <Ionicons name="sparkles" size={14} color="#16A34A" />

        <Text style={styles.scoreText}>
          {chapter.average_score == null ? "--" : `${chapter.average_score}%`}
        </Text>
      </View>

      {/* Status */}

      <View style={[styles.statusContainer, { width: 120 }]}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor:
                chapter.status === "Completed"
                  ? "#22C55E"
                  : chapter.status === "Processing"
                    ? "#F59E0B"
                    : "#EF4444",
            },
          ]}
        />

        <Text style={styles.status}>{chapter.status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 82,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 20,

    borderBottomWidth: 1,

    borderBottomColor: "#F1F5F9",
  },

  chapter: {
    fontSize: 16,

    fontWeight: "700",

    color: colors.textPrimary,
  },

  cell: {
    flexDirection: "row",

    alignItems: "center",

    gap: 10,
  },

  link: {
    fontSize: 15,

    color: colors.primary,

    fontWeight: "700",
  },

  addButton: {
    width: 28,

    height: 28,

    borderRadius: 14,

    backgroundColor: "#EFF6FF",

    justifyContent: "center",

    alignItems: "center",
  },

  score: {
    fontSize: 15,

    fontWeight: "700",

    color: colors.textPrimary,
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  dot: {
    width: 10,

    height: 10,

    borderRadius: 5,

    marginRight: 8,
  },

  status: {
    fontSize: 14,

    color: colors.textPrimary,

    fontWeight: "600",
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#EFF6FF",

    borderRadius: 20,

    paddingHorizontal: 12,

    paddingVertical: 7,

    gap: 6,
  },

  actionText: {
    color: "#2563EB",

    fontWeight: "700",

    fontSize: 13,
  },

  addChip: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#ECFDF3",

    borderRadius: 20,

    paddingHorizontal: 10,

    paddingVertical: 7,

    gap: 4,
  },

  addText: {
    color: "#16A34A",

    fontWeight: "700",

    fontSize: 13,
  },

  recordingChip: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#FFF7ED",

    borderRadius: 20,

    paddingHorizontal: 12,

    paddingVertical: 7,

    gap: 6,
  },

  recordingText: {
    color: "#EA580C",

    fontWeight: "700",
  },

  scoreChip: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#ECFDF3",

    borderRadius: 20,

    paddingHorizontal: 10,

    paddingVertical: 6,

    gap: 4,
  },

  scoreText: {
    fontWeight: "700",

    color: "#16A34A",
  },
});
