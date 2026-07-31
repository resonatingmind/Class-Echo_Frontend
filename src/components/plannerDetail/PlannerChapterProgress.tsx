import { StyleSheet, Text, View } from "react-native";

import { AppTheme } from "../../theme/AppTheme";

type Props = {
  completed: number;
  total: number;
};

export function PlannerChapterProgress({ completed, total }: Props) {
  if (total === 0) return null;

  const percent = Math.round((completed / total) * 100);
  const isComplete = completed === total;

  return (
    <View style={styles.container}>
      <Text style={styles.label} numberOfLines={1}>
        {completed} of {total} chapters complete
      </Text>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${percent}%`,
              backgroundColor: isComplete ? AppTheme.colors.success : AppTheme.colors.warning,
            },
          ]}
        />
      </View>

      <Text
        style={[
          styles.percent,
          { color: isComplete ? AppTheme.colors.success : AppTheme.colors.warning },
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
    gap: 12,
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.large,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  label: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
    flexShrink: 0,
  },

  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppTheme.colors.border,
    overflow: "hidden",
  },

  fill: {
    height: "100%",
    borderRadius: 3,
  },

  percent: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 0,
    minWidth: 36,
    textAlign: "right",
  },
});

