import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { AppTheme } from "../theme/AppTheme";

const STATUS_COPY: Record<string, { title: string; body: (reviewer: string) => string }> = {
  pending_approval: {
    title: "Awaiting approval",
    body: (reviewer) =>
      `Your registration is pending approval from ${reviewer}. You'll be able to sign in as soon as it's approved.`,
  },
  invited: {
    title: "Invite not yet accepted",
    body: () => "Check your email for an invite link to finish setting up your account.",
  },
  suspended: {
    title: "Account suspended",
    body: (reviewer) => `Your account has been suspended by ${reviewer}. Contact them for more information.`,
  },
  rejected: {
    title: "Request declined",
    body: (reviewer) => `${reviewer[0].toUpperCase()}${reviewer.slice(1)} declined this registration request.`,
  },
};

const DEFAULT_COPY = {
  title: "Checking your account…",
  body: () => "Hold on while we check your account status.",
};

export function AwaitingApprovalScreen() {
  const { session, signOut, refreshStatus } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isSchoolAdmin = session?.role === "school_admin";
  const reviewer = isSchoolAdmin ? "Class Echo's platform admin" : "your school's admin";
  
  const status = session?.status ?? "pending_approval";
  const copy = STATUS_COPY[status] ?? DEFAULT_COPY;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="time-outline" size={48} color={AppTheme.colors.primary} style={styles.icon} />
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.description}>{copy.body(reviewer)}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            disabled={isRefreshing}
            onPress={handleRefresh}
            style={[styles.button, styles.primaryButton, isRefreshing && styles.buttonDisabled]}
          >
            {isRefreshing ? (
              <ActivityIndicator color={AppTheme.colors.white} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Check again</Text>
            )}
          </Pressable>

          <Pressable
            disabled={isRefreshing}
            onPress={signOut}
            style={[styles.button, styles.secondaryButton]}
          >
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: AppTheme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: AppTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: AppTheme.radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: AppTheme.colors.textPrimary,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  secondaryButtonText: {
    color: AppTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
});
