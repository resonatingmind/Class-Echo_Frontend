import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  TextInput,
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

  requirePassword?: boolean;
  passwordValue?: string;
  onPasswordChange?: (val: string) => void;
  error?: string | null;
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
  requirePassword,
  passwordValue,
  onPasswordChange,
  error,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <Text style={styles.title}>{title}</Text>

              <Text style={styles.message}>{message}</Text>

              {requirePassword && (
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password to confirm"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  value={passwordValue}
                  onChangeText={onPasswordChange}
                  autoCapitalize="none"
                />
              )}

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

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
    marginBottom: 20,
  },

  passwordInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: AppTheme.radius.small,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    marginBottom: 24,
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
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    marginBottom: 16,
    fontWeight: "500",
  },
});
