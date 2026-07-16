import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import React, { useState } from "react";
import EditPeriodModal from "./EditPeriodModal";



export default function TeacherTimetableTable() {

    const [periods, setPeriods] = useState([
      {
        id: 1,
        time: "08:30 - 09:30",
        subject: "Physics",
        section: "A",
        room: "203",
      },
      {
        id: 2,
        time: "09:30 - 10:30",
        subject: "Mathematics",
        section: "B",
        room: "204",
      },
      {
        id: 3,
        time: "",
        subject: "",
        section: "",
        room: "",
      },
    ]);

    const [selectedPeriod, setSelectedPeriod] = useState<any>(null);

    const [showEditor, setShowEditor] = useState(false);

    const handleEdit = (period: any) => {
      setSelectedPeriod(period);
      setShowEditor(true);
    };

    const handleSave = (updatedPeriod: any) => {
      setPeriods((prev) =>
        prev.map((item) =>
          item.id === updatedPeriod.id ? updatedPeriod : item,
        ),
      );
    };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.container}>
        {/* Header Row */}
        <View style={styles.row}>
          <View style={styles.leftCell}>
            <Text style={styles.header}>Field</Text>
          </View>

          {periods.map((_, index) => (
            <View key={index} style={styles.periodHeader}>
              <Text style={styles.header}>Period {index + 1}</Text>
            </View>
          ))}

          <Pressable
            style={styles.addColumn}
            onPress={() =>
              setPeriods((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  time: "",
                  subject: "",
                  section: "",
                  room: "",
                },
              ])
            }
          >
            <Ionicons name="add" size={24} color="#007AFF" />
          </Pressable>
        </View>

        {/* Time */}
        <View style={styles.row}>
          <View style={styles.leftCell}>
            <Text style={styles.title}>Time</Text>
          </View>

          {periods.map((item, index) => (
            <View key={index} style={styles.cell}>
              <Text>{item.time || "-"}</Text>
            </View>
          ))}
        </View>

        {/* Subject */}
        <View style={styles.row}>
          <View style={styles.leftCell}>
            <Text style={styles.title}>Subject</Text>
          </View>

          {periods.map((item, index) => (
            <View key={index} style={styles.cell}>
              <Text>{item.subject || "-"}</Text>
            </View>
          ))}
        </View>

        {/* Section */}
        <View style={styles.row}>
          <View style={styles.leftCell}>
            <Text style={styles.title}>Section</Text>
          </View>

          {periods.map((item, index) => (
            <View key={index} style={styles.cell}>
              <Text>{item.section || "-"}</Text>
            </View>
          ))}
        </View>

        {/* Room */}
        <View style={styles.row}>
          <View style={styles.leftCell}>
            <Text style={styles.title}>Room</Text>
          </View>

          {periods.map((item, index) => (
            <View key={index} style={styles.cell}>
              <Text>{item.room || "-"}</Text>
            </View>
          ))}
        </View>

        {/* Edit */}
        <View style={styles.row}>
          <View style={styles.leftCell}>
            <Text style={styles.title}>Action</Text>
          </View>

          {periods.map((_, index) => (
            <View key={index} style={styles.cell}>
              <Pressable
                style={styles.editButton}
                onPress={() => handleEdit(periods[index])}
              >
                <Ionicons name="create-outline" size={18} color="#007AFF" />
              </Pressable>
            </View>
          ))}
        </View>

        <Pressable
          style={styles.saveButton}
          onPress={() => {
            console.log(periods);
            alert("Timetable Saved");
          }}
        >
          <Text style={styles.saveText}>Save Timetable</Text>
        </Pressable>
      </View>

      <EditPeriodModal
        visible={showEditor}
        period={selectedPeriod}
        onClose={() => setShowEditor(false)}
        onSave={handleSave}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },

  row: {
    flexDirection: "row",
  },

  leftCell: {
    width: 120,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  periodHeader: {
    width: 170,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    alignItems: "center",
    backgroundColor: "#EFF6FF",
  },

  addColumn: {
    width: 70,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },

  cell: {
    width: 170,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    justifyContent: "center",
  },

  header: {
    fontWeight: "700",
    fontSize: 15,
  },

  title: {
    fontWeight: "600",
  },

  editButton: {
    alignSelf: "center",
  },

  saveButton: {
    marginTop: 24,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
