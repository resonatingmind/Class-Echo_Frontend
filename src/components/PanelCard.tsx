import { PropsWithChildren, useRef } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '../theme';

type PanelCardProps = PropsWithChildren<{
  variant?: 'default' | 'elevated' | 'outline' | 'ghost';
  padding?: number | 'none';
  pressable?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}>;

export function PanelCard({
  children,
  variant = 'default',
  padding = spacing.md,
  pressable = false,
  onPress,
  style,
}: PanelCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.98,
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

  const paddingStyle = padding === 'none' ? { padding: 0 } : { padding };

  const card = (
    <Animated.View
      style={[
        styles.base,
        styles[variant],
        paddingStyle,
        pressable && { transform: [{ scale }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (pressable) {
    return (
      <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        {card}
      </Pressable>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    ...shadow.card,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
});
