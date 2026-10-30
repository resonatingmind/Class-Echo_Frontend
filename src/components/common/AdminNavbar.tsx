import React from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AppLogo } from "../ui/AppLogo";
import { AppTheme } from "../../theme/AppTheme";
import { useAuth } from "../../context/AuthContext";

type Props = {
  title: string;
  rightActions?: React.ReactNode;
  onBack?: () => void;
  onProfilePress?: () => void;
};

export function AdminNavbar({ title, rightActions, onBack, onProfilePress }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const navigation = useNavigation();
  const { session } = useAuth();

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else if (session?.role === "teacher") {
      navigation.navigate("TeacherProfile" as never);
    } else if (session?.role === "student") {
      navigation.navigate("StudentProfile" as never);
    } else {
      navigation.navigate("SchoolAdminProfile" as never);
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={onBack} style={styles.backBtn}>
            <Ionicons color={AppTheme.colors.textPrimary} name="chevron-back" size={24} />
          </Pressable>
        ) : (
          <AppLogo showText={false} />
        )}
      </View>
      <Text style={[styles.headerTitle, isMobile && styles.headerTitleMobile]} numberOfLines={1}>{title}</Text>
      <View style={styles.headerRight}>
        {rightActions}
        <Pressable accessibilityRole="button" accessibilityLabel="Profile" hitSlop={8} onPress={handleProfilePress} style={styles.iconBtn}>
          <Ionicons color={AppTheme.colors.textPrimary} name="person-circle-outline" size={28} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
    backgroundColor: AppTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },
  headerLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 3,
    textAlign: "center",
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
  },
  headerTitleMobile: {
    fontSize: 16,
    lineHeight: 22,
  },
  headerRight: {
    flex: 1,
    flexDirection: "row",
    gap: AppTheme.spacing.s,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    padding: AppTheme.spacing.xs,
  },
});


