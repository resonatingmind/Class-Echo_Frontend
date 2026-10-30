import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "../../theme/AppTheme";

interface SelectDropdownProps {
  label: string;
  placeholder?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export function SelectDropdown({ label, placeholder = "Select...", options, value, onChange, error }: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable 
        accessibilityRole="button"
        style={[styles.inputButton, error && styles.inputError]} 
        onPress={() => setIsOpen(true)}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={AppTheme.colors.textSecondary} />
      </Pressable>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <View style={styles.dropdown}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  style={styles.item}
                  onPress={() => {
                    onChange(item);
                    setIsOpen(false);
                  }}
                >
                  <Text style={[styles.itemName, item === value && styles.itemSelected]}>
                    {item}
                  </Text>
                  {item === value && (
                    <Ionicons name="checkmark" size={20} color={AppTheme.colors.primary} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    textTransform: "uppercase",
  },
  inputButton: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.background,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: AppTheme.colors.dangerText,
  },
  inputText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
  },
  placeholderText: {
    color: AppTheme.colors.hint,
  },
  errorText: {
    color: AppTheme.colors.dangerText,
    ...AppTheme.typography.caption,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dropdown: {
    width: "100%",
    maxHeight: 400,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.medium,
    overflow: "hidden",
    ...AppTheme.shadows.card,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: AppTheme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
  },
  itemName: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
  },
  itemSelected: {
    color: AppTheme.colors.primaryText,
    fontWeight: "600",
  },
});
