import {
  ScrollView,
  TextInput,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { AppTheme } from "../../theme/AppTheme";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;

  selectedClass: string | null;
  selectedSection: string | null;
  selectedSubject: string | null;
  selectedTeacher: string | null;
  selectedYear: string | null;

  onClassPress: () => void;
  onSectionPress: () => void;
  onSubjectPress: () => void;
  onTeacherPress: () => void;
  onYearPress: () => void;

  onSelectedClassClear?: () => void;
  onSelectedSectionClear?: () => void;
  onSelectedSubjectClear?: () => void;
  onSelectedTeacherClear?: () => void;
  onSelectedYearClear?: () => void;

  onClearAll?: () => void;
};

export function PlannerFilters({
  search,
  onSearchChange,
  selectedClass,
  selectedSection,
  selectedSubject,
  selectedTeacher,
  selectedYear,
  onClassPress,
  onSectionPress,
  onSubjectPress,
  onTeacherPress,
  onYearPress,
  onSelectedClassClear,
  onSelectedSectionClear,
  onSelectedSubjectClear,
  onSelectedTeacherClear,
  onSelectedYearClear,
  onClearAll,
}: Props) {
  const hasActiveFilters =
    selectedClass != null ||
    selectedSection != null ||
    selectedSubject != null ||
    selectedTeacher != null ||
    selectedYear != null;

  return (
    <>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={AppTheme.colors.textSecondary} />

        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search class, subject or teacher"
          placeholderTextColor={AppTheme.colors.textPlaceholder}
          style={styles.input}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Ionicons
          name="filter-outline"
          size={16}
          color={AppTheme.colors.textSecondary}
          style={{ marginRight: 2 }}
        />

        <FilterChip
          title={selectedClass ?? "Class"}
          selected={selectedClass != null}
          onPress={onClassPress}
          onClear={onSelectedClassClear}
        />

        <FilterChip
          title={selectedSection ? `Section ${selectedSection}` : "Section"}
          selected={selectedSection != null}
          onPress={onSectionPress}
          onClear={onSelectedSectionClear}
        />

        <FilterChip
          title={selectedSubject ?? "Subject"}
          selected={selectedSubject != null}
          onPress={onSubjectPress}
          onClear={onSelectedSubjectClear}
        />

        <FilterChip
          title={selectedTeacher ?? "Teacher"}
          selected={selectedTeacher != null}
          onPress={onTeacherPress}
          onClear={onSelectedTeacherClear}
        />

        <FilterChip
          title={selectedYear ?? "Academic year"}
          selected={selectedYear != null}
          onPress={onYearPress}
          onClear={onSelectedYearClear}
        />

        {hasActiveFilters ? (
          <Pressable style={styles.clearAll} onPress={onClearAll}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </>
  );
}

type FilterChipProps = {
  title: string;
  selected: boolean;
  onPress: () => void;
  onClear?: () => void;
};

function FilterChip({ title, selected, onPress, onClear }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filter, selected && styles.filterSelected]}
    >
      <Text
        numberOfLines={1}
        style={[styles.filterText, selected && styles.selectedText]}
      >
        {title}
      </Text>

      {selected ? (
        <Pressable
          hitSlop={10}
          onPress={(e) => {
            e.stopPropagation();
            onClear?.();
          }}
        >
          <Ionicons name="close-circle" size={16} color={AppTheme.colors.primaryDark} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-down" size={16} color={AppTheme.colors.textSecondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    height: 48,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.surface,

    borderWidth: 1,
    borderColor: AppTheme.colors.border,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 14,

    marginBottom: 12,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    color: AppTheme.colors.textPrimary,
    fontSize: 15,
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
    marginBottom: 8,
  },

  filter: {
    height: 38,

    borderRadius: 999,

    borderWidth: 1,
    borderColor: AppTheme.colors.border,

    backgroundColor: AppTheme.colors.surface,

    paddingHorizontal: 12,

    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  filterSelected: {
    borderColor: AppTheme.colors.primary,
    backgroundColor: AppTheme.colors.primarySoft,
  },

  filterText: {
    fontSize: 13,
    color: AppTheme.colors.textPrimary,
    fontWeight: "600",
  },
  selectedText: {
    color: AppTheme.colors.primaryDark,
  },

  clearAll: {
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  clearAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },
});
