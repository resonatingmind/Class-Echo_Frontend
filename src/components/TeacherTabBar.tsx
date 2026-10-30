import { AppTheme } from '../theme/AppTheme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';

type Tab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const TABS: Tab[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'account', label: 'Account', icon: 'person-outline', activeIcon: 'person' },
];

type Props = {
  active: string;
  onTabPress: (key: string) => void;
};

export function TeacherTabBar({ active, onTabPress }: Props) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onTabPress(tab.key)}
            style={styles.tab}
          >
            <Ionicons
              color={isActive ? AppTheme.colors.primary : colors.navInactive}
              name={isActive ? tab.activeIcon : tab.icon}
              size={22}
              style={{ marginBottom: 4 }}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: AppTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.border,
    paddingBottom: 8,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    color: colors.navInactive,
    fontSize: 10,
    fontWeight: '600',
  },
  labelActive: {
    color: AppTheme.colors.primaryText,
  },
});


