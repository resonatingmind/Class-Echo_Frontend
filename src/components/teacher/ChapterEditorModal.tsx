import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "../../theme/colors";

type Props = {
  visible: boolean;

  title: string;

  submitText?: string;

  loading?: boolean;

  initialName?: string;

  initialDescription?: string;

  onClose: () => void;

  onSave: (data: { name: string; description: string }) => void;
};

export function ChapterEditorModal({
  visible,
  title,
  loading = false,
  submitText = "Create",
  initialName = "",
  initialDescription = "",
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setDescription(initialDescription);
    }
  }, [visible, initialName, initialDescription]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <TextInput
            placeholder="Chapter Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <TextInput
            placeholder="Description (Optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            style={[styles.input, styles.description]}
          />

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text>Cancel</Text>
            </Pressable>

            <Pressable
              disabled={loading || !name.trim()}
              style={styles.saveButton}
              onPress={() =>
                onSave({
                  name: name.trim(),
                  description: description.trim(),
                })
              }
            >
              <Text style={styles.saveText}>
                {loading ? "Saving..." : submitText}
              </Text>
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,.35)",
  },

  card: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    color: colors.textPrimary,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    backgroundColor: "#fff",
  },

  description: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },

  cancelButton: {
    paddingHorizontal: 18,
    justifyContent: "center",
  },

  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginLeft: 12,
  },

  saveText: {
    color: "#fff",
    fontWeight: "700",
  },
});
