import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  Animated,
} from "react-native";
import { AppTheme } from "../../theme/AppTheme";

export interface AppTextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export function AppTextField({ label, error, style, onFocus, onBlur, ...rest }: AppTextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

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
          {...rest}
        />
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
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.label,
  },
  inputContainer: {
    height: 48,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
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
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.bodyLarge,
},
  errorText: {
    color: AppTheme.colors.dangerText,
    ...AppTheme.typography.caption,
  },
});


