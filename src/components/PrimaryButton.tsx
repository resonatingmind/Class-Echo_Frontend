import { AppTheme } from '../theme/AppTheme';
import { ComponentProps, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing } from '../theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: IoniconName;
  iconRight?: IoniconName;
};

const VARIANT = {
  primary:   { bg: AppTheme.colors.primary,       text: AppTheme.colors.white,     indicator: AppTheme.colors.white     },
  secondary: { bg: AppTheme.colors.primaryLight,  text: AppTheme.colors.primary, indicator: AppTheme.colors.primary },
  ghost:     { bg: 'transparent',       text: AppTheme.colors.primary, indicator: AppTheme.colors.primary },
  danger:    { bg: AppTheme.colors.dangerSoft,           text: AppTheme.colors.danger,     indicator: AppTheme.colors.danger     },
} as const;

const SIZE = {
  sm: { height: 36, px: spacing.sm, iconSize: 14, fontSize: 13, fontWeight: '600' as const },
  md: { height: 48, px: spacing.md, iconSize: 16, fontSize: 15, fontWeight: '600' as const },
  lg: { height: 56, px: spacing.xl, iconSize: 18, fontSize: 16, fontWeight: '700' as const },
} as const;

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
}: PrimaryButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const v = VARIANT[variant];
  const s = SIZE[size];

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View
        style={[
          styles.base,
          {
            backgroundColor: v.bg,
            height: s.height,
            paddingHorizontal: s.px,
            opacity: disabled ? 0.45 : 1,
            transform: [{ scale }],
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.indicator} size="small" />
        ) : (
          <View style={styles.row}>
            {iconLeft ? (
              <Ionicons color={v.text} name={iconLeft} size={s.iconSize} />
            ) : null}
            <Text
              style={[
                styles.label,
                { color: v.text, fontSize: s.fontSize, fontWeight: s.fontWeight },
              ]}
            >
              {label}
            </Text>
            {iconRight ? (
              <Ionicons color={v.text} name={iconRight} size={s.iconSize} />
            ) : null}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    letterSpacing: 0.2,
  },
});


