import React, { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AppTheme } from "../../theme/AppTheme";

export type FilterState = {
  class: string | null;
  section: string | null;
  subject: string | null;
  teacher: string | null;
  year: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  options: {
    classOptions: string[];
    sectionOptions: string[];
    subjectOptions: string[];
    teacherOptions: string[];
    yearOptions: string[];
  };
  activeFilters: FilterState;
  onApply: (filters: FilterState) => void;
};

export function PlannerUnifiedFilterSheet({
  visible,
  onClose,
  options,
  activeFilters,
  onApply,
}: Props) {
  const [draft, setDraft] = useState<FilterState>(activeFilters);

  useEffect(() => {
    if (visible) {
      setDraft(activeFilters);
    }
  }, [visible, activeFilters]);

  function handleClearAll() {
    setDraft({
      class: null,
      section: null,
      subject: null,
      teacher: null,
      year: null,
    });
  }

  function handleApply() {
    onApply(draft);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={AppTheme.colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <FilterSection
              title="Class"
              options={options.classOptions}
              selected={draft.class}
              onSelect={(val) => setDraft((p) => ({ ...p, class: val === p.class ? null : val }))}
            />
            <FilterSection
              title="Section"
              options={options.sectionOptions}
              selected={draft.section}
              onSelect={(val) => setDraft((p) => ({ ...p, section: val === p.section ? null : val }))}
            />
            <FilterSection
              title="Subject"
              options={options.subjectOptions}
              selected={draft.subject}
              onSelect={(val) => setDraft((p) => ({ ...p, subject: val === p.subject ? null : val }))}
            />
            <FilterSection
              title="Teacher"
              options={options.teacherOptions}
              selected={draft.teacher}
              onSelect={(val) => setDraft((p) => ({ ...p, teacher: val === p.teacher ? null : val }))}
            />
            <FilterSection
              title="Academic Year"
              options={options.yearOptions}
              selected={draft.year}
              onSelect={(val) => setDraft((p) => ({ ...p, year: val === p.year ? null : val }))}
            />
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable accessibilityRole="button" style={styles.clearBtn} onPress={handleClearAll}>
              <Text style={styles.clearBtnText}>Clear all</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FilterSection({ title, options, selected, onSelect }: { title: string, options: string[], selected: string | null, onSelect: (val: string) => void }) {
  if (!options || options.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chipsContainer}>
        {options.map((opt) => (
          <Pressable
            accessibilityRole="button"
            key={opt}
            onPress={() => onSelect(opt)}
            style={[styles.chip, selected === opt && styles.chipActive]}
          >
            <Text style={[styles.chipText, selected === opt && styles.chipTextActive]}>
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: AppTheme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
  },
  title: {
    fontSize: 20,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPrimary,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: AppTheme.typography.family.semibold,
    color: AppTheme.colors.textPrimary,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: AppTheme.colors.primaryLight,
    borderColor: AppTheme.colors.primaryLight,
  },
  chipText: {
    fontSize: 14,
    fontFamily: AppTheme.typography.family.medium,
    color: AppTheme.colors.textPrimary,
  },
  chipTextActive: {
    color: AppTheme.colors.primaryText,
    fontFamily: AppTheme.typography.family.bold,
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.divider,
    backgroundColor: AppTheme.colors.white,
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    height: 48,
    borderRadius: AppTheme.radius.large,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.surfaceMuted,
  },
  clearBtnText: {
    fontSize: 15,
    fontFamily: AppTheme.typography.family.semibold,
    color: AppTheme.colors.textPrimary,
  },
  applyBtn: {
    flex: 2,
    height: 48,
    borderRadius: AppTheme.radius.large,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.primary,
  },
  applyBtnText: {
    fontSize: 15,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.white,
  },
});
