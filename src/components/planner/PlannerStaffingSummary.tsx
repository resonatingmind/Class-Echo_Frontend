import { StyleSheet, Text, View } from "react-native";

import { AppTheme } from "../../theme/AppTheme";

type Props = {
  staffed: number;
  total: number;
};

export function PlannerStaffingSummary({ staffed, total }: Props) {
  const percent = total === 0 ? 0 : Math.round((staffed / total) * 100);
  const isComplete = total > 0 && staffed === total;

  return (
    <View style={styles.container}>
      <View style={{ flexShrink: 0 }}>
        <Text style={styles.label}>Staffing this year</Text>
        <Text style={styles.value}>
          {total === 0
            ? "No subjects yet"
            : `${staffed} of ${total} subjects staffed`}
        </Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${percent}%`,
              backgroundColor: isComplete ? AppTheme.colors.success : AppTheme.colors.primary,
            },
          ]}
        />
      </View>

      <Text
        style={[
          styles.percent,
          { color: isComplete ? AppTheme.colors.success : AppTheme.colors.primary },
        ]}
      >
        {percent}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: AppTheme.colors.surface,
    ...AppTheme.shadows.subtle,
    borderRadius: AppTheme.radius.large,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  label: {
    fontFamily: AppTheme.typography.family.regular,
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
  },

  value: {
    marginTop: 2,
    fontFamily: AppTheme.typography.family.bold,
    fontSize: 15,
    color: AppTheme.colors.textPrimary,
  },

  track: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: AppTheme.colors.border,
    overflow: "hidden",
  },

  fill: {
    height: "100%",
    borderRadius: 6,
  },

  percent: {
    fontFamily: AppTheme.typography.family.bold,
    fontSize: 16,
    flexShrink: 0,
    minWidth: 40,
    textAlign: "right",
  },
});

