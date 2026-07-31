import { View, StyleSheet, Text } from "react-native";

import { PlannerChapter } from "../../types/api";
import { AppTheme } from "../../theme/AppTheme";
import { PlannerChapterCard } from "./PlannerChapterCard";

type Props = {
  chapters: PlannerChapter[];
  subjectId?: number;
  subjectName?: string;

  onOpenDocuments: (chapter: PlannerChapter) => void;
  onAddDocument: (chapter: PlannerChapter) => void;
  onOpenRecordings: (chapter: PlannerChapter) => void;
};

export function PlannerChapterList({
  chapters,
  subjectId,
  subjectName,
  onOpenDocuments,
  onAddDocument,
  onOpenRecordings,
}: Props) {
  if (chapters.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No chapters available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {chapters.map((chapter) => (
        <PlannerChapterCard
          key={chapter.id}
          chapter={chapter}
          subjectId={subjectId}
          subjectName={subjectName}
          onOpenDocuments={() => onOpenDocuments(chapter)}
          onAddDocument={() => onAddDocument(chapter)}
          onOpenRecordings={() => onOpenRecordings(chapter)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.large,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: AppTheme.typography.family.medium,
    color: AppTheme.colors.textSecondary,
  },
});
