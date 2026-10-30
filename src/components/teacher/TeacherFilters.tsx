import { StyleSheet, TextInput, View } from "react-native";

import { AppTheme } from "../../theme/AppTheme";

import { TeacherFilterSelect } from "./TeacherFilterSelect";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;

  selectedClass?: string;
  selectedSection?: string;
  selectedSubject?: string;
  selectedStatus?: string;

  onSelectClass: () => void;
  onSelectSection: () => void;
  onSelectSubject: () => void;
  onSelectStatus: () => void;
};

export function TeacherFilters({
  search,
  onSearchChange,

  selectedClass,
  selectedSection,
  selectedSubject,
  selectedStatus,

  onSelectClass,
  onSelectSection,
  onSelectSubject,
  onSelectStatus,
}: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search class or subject..."
        value={search}
        onChangeText={onSearchChange}
        style={styles.search}
      />

      <View style={styles.filters}>
        <TeacherFilterSelect
          label="Class"
          value={selectedClass}
          onPress={onSelectClass}
        />

        <TeacherFilterSelect
          label="Section"
          value={selectedSection}
          onPress={onSelectSection}
        />
        <TeacherFilterSelect
          label="Subject"
          value={selectedSubject}
          onPress={onSelectSubject}
        />

        <TeacherFilterSelect
          label="AI Status"
          value={selectedStatus}
          onPress={onSelectStatus}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },

  search: {
    height: 48,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 16,
    backgroundColor: AppTheme.colors.white,
    marginBottom: 14,
  },

  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },

  filter: {
    width: "48%",
    height: 46,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.white,
  },
});
