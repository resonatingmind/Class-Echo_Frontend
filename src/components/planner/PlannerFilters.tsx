import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colors } from "../../theme/colors";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;

  selectedClass: string | null;
  selectedSubject: string | null;
  selectedTeacher: string | null;
  selectedYear: string | null;

  onClassPress: () => void;
  onSubjectPress: () => void;
  onTeacherPress: () => void;
  onYearPress: () => void;

  onSelectedClassClear?: () => void;
  onSelectedSubjectClear?: () => void;
  onSelectedTeacherClear?: () => void;
  onSelectedYearClear?: () => void;
};

export function PlannerFilters({
  search,
  onSearchChange,
  selectedClass,
  selectedSubject,
  selectedTeacher,
  selectedYear,
  onClassPress,
  onSubjectPress,
  onTeacherPress,
  onYearPress,
  onSelectedClassClear,
  onSelectedSubjectClear,
  onSelectedTeacherClear,
  onSelectedYearClear,
}: Props) {
  return (
    <>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#64748B" />

        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search assignment..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />
      </View>

      <View style={styles.row}>
        <FilterButton
          title={selectedClass ?? "Class"}
          selected={selectedClass != null}
          onPress={onClassPress}
          onClear={() => onSelectedClassClear?.()}
        />

        <FilterButton
          title={selectedSubject ?? "Subject"}
          selected={selectedSubject != null}
          onPress={onSubjectPress}
          onClear={() => onSelectedSubjectClear?.()}
        />
      </View>

      <View style={styles.row}>
        <FilterButton
          title={selectedTeacher ?? "Teacher"}
          selected={selectedTeacher != null}
          onPress={onTeacherPress}
          onClear={() => onSelectedTeacherClear?.()}
        />

        <FilterButton
          title={selectedYear ?? "Academic Year"}
          selected={selectedYear != null}
          onPress={onYearPress}
          onClear={() => onSelectedYearClear?.()}
        />
      </View>
    </>
  );
}

type FilterButtonProps = {
  title: string;
  selected: boolean;
  onPress: () => void;
  onClear?: () => void;
};

function FilterButton({
  title,
  selected,
  onPress,
  onClear,
}: FilterButtonProps) {
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
          <Ionicons name="close-circle" size={20} color={colors.primary} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-down" size={18} color="#64748B" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#fff",

    borderWidth: 1,
    borderColor: "#E2E8F0",

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 14,

    marginBottom: 18,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    color: colors.textPrimary,
    fontSize: 15,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  filter: {
    width: "48%",

    height: 46,

    borderRadius: 12,

    borderWidth: 1,
    borderColor: "#E2E8F0",

    backgroundColor: "#fff",

    paddingHorizontal: 14,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  filterSelected: {
    borderColor: colors.primary,
    backgroundColor: "#EFF6FF",
  },

  filterText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  selectedText: {
    color: colors.primary,
  },
});
