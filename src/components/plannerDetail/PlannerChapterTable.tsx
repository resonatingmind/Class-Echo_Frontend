import { ScrollView, View, Text, StyleSheet } from "react-native";

import { PlannerChapter } from "../../types/api";
import { colors } from "../../theme/colors";
import { PlannerChapterRow } from "./PlannerChapterRow";

export const CHAPTER_COLUMNS = {
  chapter: 260,
  material: 140,
  recordings: 140,
  score: 100,
  status: 130,
};

type Props = {
  chapters: PlannerChapter[];
  subjectId?: number;
  subjectName?: string;

  onOpenDocuments: (chapter: PlannerChapter) => void;

  onAddDocument: (chapter: PlannerChapter) => void;

  onOpenRecordings: (chapter: PlannerChapter) => void;
};

export function PlannerChapterTable({
  chapters,
  subjectId,
  subjectName,
  onOpenDocuments,
  onAddDocument,
  onOpenRecordings,
}: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={styles.header}>
          <Text style={[styles.heading, { width: CHAPTER_COLUMNS.chapter }]}>
            Chapter
          </Text>

          <Text style={[styles.heading, { width: CHAPTER_COLUMNS.material }]}>
            Material
          </Text>

          <Text
            style={[styles.heading, { width: CHAPTER_COLUMNS.recordings }]}
          >
            Recordings
          </Text>

          <Text style={[styles.heading, { width: CHAPTER_COLUMNS.score }]}>
            AI score
          </Text>

          <Text
            style={[
              styles.heading,
              { width: CHAPTER_COLUMNS.status, textAlign: "right" },
            ]}
          >
            Status
          </Text>
        </View>

        {chapters.map((chapter, index) => (
          <PlannerChapterRow
            key={chapter.id}
            chapter={chapter}
            subjectId={subjectId}
            subjectName={subjectName}
            isLast={index === chapters.length - 1}
            onOpenDocuments={() => onOpenDocuments(chapter)}
            onAddDocument={() => onAddDocument(chapter)}
            onOpenRecordings={() => onOpenRecordings(chapter)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
  },

  heading: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
