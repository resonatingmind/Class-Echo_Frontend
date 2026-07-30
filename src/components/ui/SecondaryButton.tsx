import React, { useRef } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { AppTheme } from "../../theme/AppTheme";

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function SecondaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: SecondaryButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: AppTheme.animation.press,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: AppTheme.animation.press,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          (disabled || loading) && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={AppTheme.AppTheme.colors.textPrimary} />
        ) : (
          <>
            <Text style={[styles.text, textStyle]}>{title}</Text>
            {icon}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    backgroundColor: "transparent",
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.AppTheme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: AppTheme.spacing.s,
    paddingHorizontal: AppTheme.spacing.xl,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.button,
  },
});
