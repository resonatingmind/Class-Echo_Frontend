import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "../../theme/AppTheme";

export function AppLogo({ showText = true }: { showText?: boolean }) {
  return (
    <View style={styles.container}>
      <View style={styles.logoIcon}>
        <Ionicons color="#fff" name="pulse" size={24} />
      </View>
      {showText && <Text style={styles.logoText}>ClassEcho</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppTheme.spacing.m,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: AppTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
  },
});
