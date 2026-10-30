import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  onSave: (data: { name: string; description?: string }) => void;
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

  useEffect(() => {
    if (visible) {
      setName(initialName);
    }
  }, [visible, initialName]);

  const handleSave = () => {
    if (!name.trim() || loading) return;
    onSave({
      name: name.trim(),
      description: initialDescription,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} style={styles.overlay}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Enter the chapter name to organize your lectures and recordings.
          </Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>CHAPTER NAME</Text>
            <TextInput
              autoFocus
              autoCapitalize="words"
              placeholder="e.g. Coordinate Geometry, Chemical Reactions…"
              placeholderTextColor={AppTheme.colors.hint}
              value={name}
              onChangeText={setName}
              style={styles.input}
              // @ts-ignore
              outlineStyle="none"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={loading || !name.trim()}
              style={[
                styles.saveButton,
                (loading || !name.trim()) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
            >
              {loading ? (
                <ActivityIndicator color={AppTheme.colors.white} size="small" />
              ) : (
                <Text style={styles.saveText}>{submitText}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    padding: AppTheme.spacing.l,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.xlarge,
    padding: AppTheme.spacing.xl,
    shadowColor: AppTheme.colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: AppTheme.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    ...AppTheme.typography.body,
    color: AppTheme.colors.textSecondary,
    marginBottom: AppTheme.spacing.l,
  },
  field: {
    gap: 6,
    marginBottom: AppTheme.spacing.l,
  },
  fieldLabel: {
    ...AppTheme.typography.caption,
    fontWeight: "800",
    color: AppTheme.colors.textSecondary,
    letterSpacing: 1.1,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: AppTheme.spacing.m,
    backgroundColor: AppTheme.colors.background,
    fontSize: 15,
    color: AppTheme.colors.textPrimary,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: AppTheme.spacing.m,
  },
  cancelButton: {
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: 12,
    borderRadius: AppTheme.radius.medium,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },
  saveButton: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: AppTheme.spacing.xl,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    shadowColor: AppTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: AppTheme.colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
