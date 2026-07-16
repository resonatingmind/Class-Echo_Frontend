import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";

type Period = {
  id: number;
  time: string;
  subject: string;
  section: string;
  room: string;
};

type Props = {
  visible: boolean;
  period: Period | null;
  onClose: () => void;
  onSave: (period: Period) => void;
};

export default function EditPeriodModal({
  visible,
  period,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<Period>({
    id: 0,
    time: "",
    subject: "",
    section: "",
    room: "",
  });

  useEffect(() => {
    if (period) {
      setForm(period);
    }
  }, [period]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Edit Period</Text>

          <TextInput
            style={styles.input}
            placeholder="Time"
            value={form.time}
            onChangeText={(text) => setForm({ ...form, time: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Subject"
            value={form.subject}
            onChangeText={(text) => setForm({ ...form, subject: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Section"
            value={form.section}
            onChangeText={(text) => setForm({ ...form, section: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Room"
            value={form.room}
            onChangeText={(text) => setForm({ ...form, room: text })}
          />

          <View style={styles.buttons}>
            <Pressable style={styles.cancel} onPress={onClose}>
              <Text>Cancel</Text>
            </Pressable>

            <Pressable
              style={styles.save}
              onPress={() => {
                onSave(form);
                onClose();
              }}
            >
              <Text style={{ color: "#fff" }}>Save</Text>
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
    backgroundColor: "rgba(0,0,0,.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: 380,
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },

  cancel: {
    marginRight: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  save: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
