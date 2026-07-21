import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { PlannerChapter } from "../../types/api";
import { colors } from "../../theme/colors";
import { CHAPTER_COLUMNS } from "./PlannerChapterTable";

type Props = {
  chapter: PlannerChapter;
  isLast?: boolean;

  onOpenDocuments: () => void;
  onAddDocument: () => void;
  onOpenRecordings: () => void;
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  Completed: { bg: "#E7F6EC", text: colors.success, icon: "checkmark-circle" },
  Processing: { bg: "#FDF3E3", text: colors.warning, icon: "time-outline" },
};

const DEFAULT_STATUS_STYLE = {
  bg: "#FBE7E7",
  text: "#DC2626",
  icon: "ellipse-outline" as keyof typeof Ionicons.glyphMap,
};

export function PlannerChapterRow({
  chapter,
  isLast,
  onOpenDocuments,
  onAddDocument,
  onOpenRecordings,
}: Props) {
  const statusStyle = STATUS_STYLES[chapter.status] ?? DEFAULT_STATUS_STYLE;

  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <Text
        style={[styles.chapterName, { width: CHAPTER_COLUMNS.chapter }]}
        numberOfLines={2}
      >
        {chapter.name}
      </Text>

      <View style={[styles.cell, { width: CHAPTER_COLUMNS.material }]}>
        <Pressable onPress={onOpenDocuments} style={styles.countChip}>
          <Ionicons name="document-text-outline" size={14} color="#7C3AED" />
          <Text style={[styles.countChipText, { color: "#7C3AED" }]}>
            {chapter.document_count}
          </Text>
        </Pressable>

        <Pressable
          onPress={onAddDocument}
          style={styles.addButton}
          hitSlop={6}
          accessibilityLabel={`Add material to ${chapter.name}`}
        >
          <Ionicons name="add" size={14} color={colors.accentDark} />
        </Pressable>
      </View>

      <View style={[styles.cell, { width: CHAPTER_COLUMNS.recordings }]}>
        <Pressable onPress={onOpenRecordings} style={styles.countChip}>
          <Ionicons name="videocam-outline" size={14} color="#EA580C" />
          <Text style={[styles.countChipText, { color: "#EA580C" }]}>
            {chapter.recording_count}
          </Text>
        </Pressable>
      </View>

      <View style={{ width: CHAPTER_COLUMNS.score }}>
        <Text
          style={[
            styles.scoreText,
            chapter.average_score == null && styles.scoreTextMuted,
          ]}
        >
          {chapter.average_score == null ? "—" : `${chapter.average_score}%`}
        </Text>
      </View>

      <View style={{ width: CHAPTER_COLUMNS.status, alignItems: "flex-end" }}>
        <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
          <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {chapter.status}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  chapterName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    paddingRight: 12,
  },

  cell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  countChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },

  countChipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  addButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  scoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  scoreTextMuted: {
    fontWeight: "400",
    color: colors.textMuted,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
