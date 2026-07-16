import { useMemo, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DaySelector } from "../components/teacher/timetable/DaySelector";

import TeacherTimetableTable from "../components/teacher/TeacherTimetableTable";

import {
  MOCK_TIMETABLE,
  TimetablePeriod,
} from "../components/teacher/timetable/timetableData";

import { colors } from "../theme/colors";

export function TeacherTimetableScreen() {
  const [selectedDay, setSelectedDay] = useState("Monday");

  const periods = useMemo(() => {
    return MOCK_TIMETABLE.filter(
      (item) => item.day === selectedDay
    );
  }, [selectedDay]);

  const handleEdit = (period: TimetablePeriod) => {
    console.log("Edit period:", period);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Teacher Timetable</Text>

        <Text style={styles.subtitle}>
          Manage your weekly teaching schedule
        </Text>
      </View>

      <DaySelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />

      {periods.length > 0 ? (
        // <FlatList
        //   data={periods}
        //   keyExtractor={(item) => item.id}
        //   renderItem={({ item }) => (
        //     <PeriodCard
        //       period={item}
        //       onEdit={handleEdit}
        //     />
        //   )}
        //   showsVerticalScrollIndicator={false}
        // />
        <TeacherTimetableTable />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No classes scheduled for this day
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
  },

  header: {
    marginTop: 20,
    marginBottom: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: colors.textSecondary,
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});