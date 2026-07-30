import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { AppTheme } from "../../theme/AppTheme";

type Props = {
  visible: boolean;

  title: string;

  message: string;

  confirmText?: string;

  cancelText?: string;

  destructive?: boolean;

  loading?: boolean;

  onConfirm: () => void;

  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <Text style={styles.title}>{title}</Text>

              <Text style={styles.message}>{message}</Text>

              <View style={styles.actions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={onCancel}
                  disabled={loading}
                >
                  <Text style={styles.cancelText}>{cancelText}</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.confirmButton,
                    destructive && styles.destructiveButton,
                  ]}
                  onPress={onConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmText}>{confirmText}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
    marginBottom: 12,
  },

  message: {
    fontSize: 15,
    lineHeight: 22,
    color: AppTheme.colors.textSecondary,
    marginBottom: 28,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  cancelButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: "#F3F4F6",
  },

  cancelText: {
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },

  confirmButton: {
    marginLeft: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
    minWidth: 110,
  },

  destructiveButton: {
    backgroundColor: "#DC2626",
  },

  confirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
