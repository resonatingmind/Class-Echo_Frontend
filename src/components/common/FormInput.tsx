import { ComponentProps, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardTypeOptions,
  Pressable,
  ReturnKeyTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type FormInputProps = {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: IoniconName;
  iconRight?: IoniconName;
  onIconRightPress?: () => void;
  size?: 'sm' | 'md';
  placeholder?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  editable?: boolean;
};

const SIZE = {
  sm: { minHeight: 40, px: spacing.sm,  fontSize: 14 },
  md: { minHeight: 52, px: spacing.md,  fontSize: 16 },
} as const;

export function FormInput({
  label,
  error,
  hint,
  iconLeft,
  iconRight,
  onIconRightPress,
  size = 'md',
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
  autoCapitalize = 'none',
  editable = true,
}: FormInputProps) {
  const [focused, setFocused] = useState(false);
  const s = SIZE[size];

  const shellBorderColor = error
    ? '#DC2626'
    : focused
    ? AppTheme.colors.primary
    : AppTheme.colors.border;

  const shellBorderWidth = focused ? 1.5 : 1;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.shell,
          {
            minHeight: s.minHeight,
            paddingHorizontal: s.px,
            borderColor: shellBorderColor,
            borderWidth: shellBorderWidth,
          },
        ]}
      >
        {iconLeft ? (
          <Ionicons
            color={focused ? AppTheme.colors.primary : AppTheme.colors.textSecondary}
            name={iconLeft}
            size={16}
            style={styles.iconLeft}
          />
        ) : null}

        <TextInput
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          editable={editable}
          keyboardType={keyboardType}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={AppTheme.colors.textPlaceholder}
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry}
          style={[styles.input, { fontSize: s.fontSize }]}
          textContentType={textContentType}
          value={value}
        />

        {iconRight ? (
          <Pressable hitSlop={10} onPress={onIconRightPress}>
            <Ionicons
              color={AppTheme.colors.textSecondary}
              name={iconRight}
              size={16}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.textLabel,
  },
  shell: {
    borderRadius: radius.md,
    backgroundColor: AppTheme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  iconLeft: {
    marginRight: 2,
  },
  input: {
    flex: 1,
    color: AppTheme.colors.textPrimary,
    padding: 0,
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
    paddingHorizontal: 2,
  },
  hint: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
    paddingHorizontal: 2,
  },
});
