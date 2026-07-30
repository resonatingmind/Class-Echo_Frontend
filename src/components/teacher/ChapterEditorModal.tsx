import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppTheme } from "../../theme/AppTheme";

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
            placeholder="Chapter Name (e.g. Coordinate Geometry)"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <TextInput
            placeholder="Display Title (Optional, e.g. Intro & Distance Formula)"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
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
    color: AppTheme.colors.textPrimary,
  },

  input: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
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
    backgroundColor: AppTheme.colors.primary,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginLeft: 12,
  },

  saveText: {
    color: "#fff",
    fontWeight: "700",
  },
});
