import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdminNavbar } from "../components/common/AdminNavbar";
import { AppTheme } from "../theme/AppTheme";
import { TeacherSubjectsScreen } from "./TeacherSubjectsScreen";
import { TeacherTimetableScreen } from "./TeacherTimetableScreen";

type View_ = "timetable" | "subjects";

const VIEWS: { key: View_; label: string }[] = [
  { key: "timetable", label: "Timetable" },
  { key: "subjects", label: "Subjects & chapters" },
];

/**
 * The Classes tab: when and what the teacher teaches. Timetable and Subjects
 * used to be two tabs; they are one place now, switched at the top.
 */
export function TeacherClassesScreen({ navigation, route }: {
  navigation: any;
  route: { params?: { view?: View_ } };
}) {
  const [view, setView] = useState<View_>(route.params?.view ?? "timetable");

  // Links into the tab (e.g. the dashboard's See all subjects) pick the view.
  useEffect(() => {
    if (route.params?.view) setView(route.params.view);
  }, [route.params?.view]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <AdminNavbar title="Classes" onProfilePress={() => navigation.navigate("TeacherProfile")} />
      <View accessibilityRole="tablist" style={styles.switcher}>
        {VIEWS.map((v) => {
          const active = v.key === view;
          return (
            <Pressable
              accessibilityRole="tab"
              aria-selected={active}
              key={v.key}
              onPress={() => setView(v.key)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{v.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.body}>
        {view === "timetable" ? (
          <TeacherTimetableScreen embedded />
        ) : (
          <TeacherSubjectsScreen embedded navigation={navigation} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  switcher: {
    flexDirection: "row",
    alignSelf: "center",
    width: "100%",
    maxWidth: 800,
    marginTop: AppTheme.spacing.m,
    paddingHorizontal: AppTheme.spacing.l,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  segmentActive: { borderColor: AppTheme.colors.primary, backgroundColor: AppTheme.colors.primaryLight },
  segmentText: { fontSize: 14, fontWeight: "700", color: AppTheme.colors.textSecondary },
  segmentTextActive: { color: AppTheme.colors.primaryDark },
  body: { flex: 1 },
});
