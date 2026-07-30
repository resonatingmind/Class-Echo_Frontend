import React from "react";
import { View, StyleSheet, Animated, Text } from "react-native";
import { AppTheme } from "../../theme/AppTheme";

export function ProgressIndicator({
  step,
  totalSteps,
  subtitle,
}: {
  step: number;
  totalSteps: number;
  subtitle: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.stepText}>
        Step {step} of {totalSteps}
      </Text>
      <Text style={styles.subtitleText}>{subtitle}</Text>
      
      <View style={styles.barContainer}>
        {[...Array(totalSteps)].map((_, i) => {
          const isActive = i + 1 <= step;
          return (
            <View
              key={i}
              style={[
                styles.segment,
                isActive ? styles.segmentActive : styles.segmentInactive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: AppTheme.spacing.xs,
  },
  stepText: {
    color: AppTheme.colors.primary,
    ...AppTheme.typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subtitleText: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
    marginBottom: AppTheme.spacing.s,
  },
  barContainer: {
    flexDirection: "row",
    gap: AppTheme.spacing.s,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  segmentActive: {
    backgroundColor: AppTheme.colors.primary,
  },
  segmentInactive: {
    backgroundColor: AppTheme.colors.divider,
  },
});
