import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "../../theme/AppTheme";

export interface PasswordFieldProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string;
  error?: string | null;
}

export function PasswordField({ label, error, style, onFocus, onBlur, ...rest }: PasswordFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
      >
        <TextInput
          style={styles.input}
          placeholderTextColor={AppTheme.colors.hint}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={!showPassword}
          {...rest}
        />
        <Pressable
          hitSlop={AppTheme.spacing.m}
          onPress={() => setShowPassword((v) => !v)}
          style={styles.eyeButton}
        >
          <Ionicons
            color={AppTheme.colors.hint}
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
          />
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: AppTheme.spacing.s,
  },
  label: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.label,
  },
  inputContainer: {
    height: 48,
    backgroundColor: AppTheme.AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
  },
  inputFocused: {
    borderColor: AppTheme.colors.primary,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: AppTheme.colors.error,
  },
  input: {
    flex: 1,
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.bodyLarge,
    // @ts-ignore
    outlineStyle: 'none',
    paddingRight: AppTheme.spacing.xl,
    // @ts-ignore
    outlineStyle: 'none',
  },
  eyeButton: {
    padding: AppTheme.spacing.xs,
  },
  errorText: {
    color: AppTheme.colors.error,
    ...AppTheme.typography.caption,
  },
});
