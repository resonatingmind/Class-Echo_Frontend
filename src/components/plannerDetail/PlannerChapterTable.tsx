import { ScrollView, View, Text, StyleSheet } from "react-native";

import { PlannerChapter } from "../../types/api";
import { PlannerChapterRow } from "./PlannerChapterRow";

type Props = {
  chapters: PlannerChapter[];

  onOpenDocuments: (chapter: PlannerChapter) => void;

  onAddDocument: (chapter: PlannerChapter) => void;

  onOpenRecordings: (chapter: PlannerChapter) => void;
};

export function PlannerChapterTable({
  chapters,
  onOpenDocuments,
  onAddDocument,
  onOpenRecordings,
}: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={styles.header}>
          <Text style={[styles.heading, { width: 240 }]}>Chapter</Text>

          <Text style={[styles.heading, { width: 180 }]}>
            Reference Material
          </Text>

          <Text style={[styles.heading, { width: 180 }]}>
            Lecture Recordings
          </Text>

          <Text style={[styles.heading, { width: 110 }]}>AI Score</Text>

          <Text style={[styles.heading, { width: 120 }]}>Status</Text>
        </View>

        {chapters.map((chapter) => (
          <PlannerChapterRow
            key={chapter.id}
            chapter={chapter}
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
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },

  header: {
    height: 60,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#EEF2F7",

    borderBottomWidth: 1,

    borderBottomColor: "#E2E8F0",

    paddingHorizontal: 18,
  },

  heading: {
    fontSize: 14,

    fontWeight: "700",

    color: "#64748B",
  },
});
