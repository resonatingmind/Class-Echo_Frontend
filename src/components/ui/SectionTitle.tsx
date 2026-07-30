import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppTheme } from "../../theme/AppTheme";

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: AppTheme.spacing.s,
  },
  title: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.display,
  },
  subtitle: {
    color: AppTheme.AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
});
