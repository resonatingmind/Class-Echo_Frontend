import { AppTheme } from '../../theme/AppTheme';
import { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography } from '../../theme';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightActions?: ReactNode;
  variant?: 'default' | 'large' | 'transparent';
  borderBottom?: boolean;
};

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={onPress}
      style={styles.backBtn}
    >
      <Ionicons color={AppTheme.colors.textPrimary} name="chevron-back" size={20} />
    </TouchableOpacity>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightActions,
  variant = 'default',
  borderBottom,
}: Props) {
  const insets = useSafeAreaInsets();

  const showBorder = borderBottom ?? (variant === 'default');

  const outerStyle = [
    styles.outer,
    { paddingTop: insets.top },
    variant === 'transparent' && styles.transparent,
    showBorder && styles.border,
  ];

  if (variant === 'large') {
    return (
      <View style={outerStyle}>
        <View style={styles.largeTopRow}>
          <View style={styles.left}>
            {onBack && <BackButton onPress={onBack} />}
          </View>
          <View style={styles.right}>{rightActions}</View>
        </View>
        <Text numberOfLines={2} style={[typography.h1, styles.largeTitle]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[typography.bodySmall, styles.subtitle]}>{subtitle}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={outerStyle}>
      <View style={styles.defaultRow}>
        <View style={styles.left}>
          {onBack && <BackButton onPress={onBack} />}
        </View>
        <Text numberOfLines={1} style={[typography.h2, styles.centeredTitle]}>
          {title}
        </Text>
        <View style={styles.right}>{rightActions}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  border: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider,
  },
  defaultRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  largeTopRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  right: {
    minWidth: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  centeredTitle: {
    flex: 1,
    textAlign: 'center',
    color: AppTheme.colors.textPrimary,
  },
  largeTitle: {
    color: AppTheme.colors.textPrimary,
    paddingBottom: 4,
  },
  subtitle: {
    color: AppTheme.colors.textSecondary,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


