import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppTheme } from "../../theme/AppTheme";
import { ClassFiltersOut, SchoolAdminClassFilters } from "../../types/api";

type Option = { label: string; value: string };

function FilterChip({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;
  const disabled = options.length === 0;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        style={[
          styles.chip,
          selected && styles.chipActive,
          disabled && styles.chipDisabled,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.chipText, selected && styles.chipTextActive]}
        >
          {selected ? selected.label : label}
        </Text>
        <Ionicons
          color={
            selected ? AppTheme.colors.primary : AppTheme.colors.textSecondary
          }
          name="chevron-down"
          size={14}
        />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <Pressable onPress={() => setIsOpen(false)} style={styles.modalOverlay}>
          <Pressable style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>{label}</Text>
            <FlatList
              data={[{ label: `All ${label.toLowerCase()}`, value: "" }, ...options]}
              keyExtractor={(item) => item.value || "__all__"}
              renderItem={({ item }) => {
                const isSelected = (value ?? "") === item.value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      onChange(item.value === "" ? null : item.value);
                      setIsOpen(false);
                    }}
                    style={styles.item}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        isSelected && styles.itemTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected ? (
                      <Ionicons
                        color={AppTheme.colors.primary}
                        name="checkmark"
                        size={18}
                      />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function ClassFilterBar({
  filters,
  options,
  onChange,
}: {
  filters: SchoolAdminClassFilters;
  options: ClassFiltersOut | null;
  onChange: (filters: SchoolAdminClassFilters) => void;
}) {
  const hasActiveFilter =
    Boolean(filters.name) ||
    Boolean(filters.section) ||
    filters.teacher_id != null ||
    Boolean(filters.subject);

  return (
    <View style={styles.bar}>
      <FilterChip
        label="Class"
        onChange={(value) => onChange({ ...filters, name: value })}
        options={(options?.classes ?? []).map((name) => ({
          label: name,
          value: name,
        }))}
        value={filters.name ?? null}
      />

      <FilterChip
        label="Section"
        onChange={(value) => onChange({ ...filters, section: value })}
        options={(options?.sections ?? []).map((section) => ({
          label: `Section ${section}`,
          value: section,
        }))}
        value={filters.section ?? null}
      />

      <FilterChip
        label="Teacher"
        onChange={(value) =>
          onChange({ ...filters, teacher_id: value ? Number(value) : null })
        }
        options={(options?.teachers ?? []).map((teacher) => ({
          label: teacher.name,
          value: String(teacher.id),
        }))}
        value={filters.teacher_id != null ? String(filters.teacher_id) : null}
      />

      <FilterChip
        label="Subject"
        onChange={(value) => onChange({ ...filters, subject: value })}
        options={(options?.subjects ?? []).map((name) => ({
          label: name,
          value: name,
        }))}
        value={filters.subject ?? null}
      />

      {hasActiveFilter ? (
        <Pressable accessibilityRole="button" onPress={() => onChange({})} style={styles.clearBtn}>
          <Ionicons color={AppTheme.colors.primary} name="close" size={14} />
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: AppTheme.spacing.s,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 200,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.s,
  },
  chipActive: {
    borderColor: AppTheme.colors.primary,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  chipDisabled: { opacity: 0.45 },
  chipText: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
    flexShrink: 1,
  },
  chipTextActive: { color: AppTheme.colors.primaryText, fontWeight: "600" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: AppTheme.spacing.s,
    paddingVertical: AppTheme.spacing.s,
  },
  clearText: { color: AppTheme.colors.primaryText, ...AppTheme.typography.button },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dropdown: {
    width: "100%",
    maxWidth: 420,
    maxHeight: 420,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.medium,
    overflow: "hidden",
    ...AppTheme.shadows.card,
  },
  dropdownTitle: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    textTransform: "uppercase",
    paddingHorizontal: AppTheme.spacing.m,
    paddingTop: AppTheme.spacing.m,
    paddingBottom: AppTheme.spacing.s,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: AppTheme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
  },
  itemText: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.body },
  itemTextSelected: { color: AppTheme.colors.primaryText, fontWeight: "600" },
});
