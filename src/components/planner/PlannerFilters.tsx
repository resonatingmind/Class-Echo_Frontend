import { TextInput, Pressable, Text, View, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AppTheme } from "../../theme/AppTheme";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  activeFilterCount: number;
  onFilterPress: () => void;
};

export function PlannerFilters({
  search,
  onSearchChange,
  activeFilterCount,
  onFilterPress,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={AppTheme.colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search class, subject or teacher"
          placeholderTextColor={AppTheme.colors.hint}
          style={styles.input}
        />
      </View>

      <Pressable accessibilityRole="button" style={styles.filterBtn} onPress={onFilterPress}>
        <Ionicons name="options-outline" size={20} color={AppTheme.colors.textPrimary} />
        {activeFilterCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    height: 48,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.surface,
    ...AppTheme.shadows.subtle,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.bodyLarge,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.surface,
    ...AppTheme.shadows.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: AppTheme.colors.background,
  },
  badgeText: {
    color: AppTheme.colors.white,
    fontSize: 10,
    fontFamily: AppTheme.typography.family.bold,
  },
});
