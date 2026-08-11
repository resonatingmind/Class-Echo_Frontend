import React from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AppLogo } from "../ui/AppLogo";
import { AppTheme } from "../../theme/AppTheme";

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

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Ionicons color={AppTheme.colors.textPrimary} name="chevron-back" size={24} />
          </Pressable>
        ) : (
          <AppLogo showText={false} />
        )}
      </View>
      <Text style={styles.headerTitle} numberOfLines={1}>{isMobile ? "" : title}</Text>
      <View style={styles.headerRight}>
        {rightActions}
        <Pressable onPress={() => onProfilePress ? onProfilePress() : navigation.navigate("SchoolAdminProfile" as never)} style={styles.iconBtn}>
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
    flex: 2,
    textAlign: "center",
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
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


