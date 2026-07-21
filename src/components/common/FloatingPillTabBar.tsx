import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme';

export type FloatingTabItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  tabs: FloatingTabItem[];
  activeIndex: number;
  onTabPress: (index: number) => void;
};

const ROW_HEIGHT = 48;
const PILL_HEIGHT = 40;
const PILL_MARGIN = 6;

export function FloatingPillTabBar({ tabs, activeIndex, onTabPress }: Props) {
  const insets = useSafeAreaInsets();
  const [tabWidth, setTabWidth] = useState(0);
  const pillX = useRef(new Animated.Value(-999)).current;
  const initialized = useRef(false);

  const onRowLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width / tabs.length;
    setTabWidth(w);
  };

  useEffect(() => {
    if (tabWidth === 0) return;
    const target = activeIndex * tabWidth;
    if (!initialized.current) {
      pillX.setValue(target);
      initialized.current = true;
    } else {
      Animated.spring(pillX, {
        toValue: target,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }).start();
    }
  }, [activeIndex, tabWidth]);

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      {/*
       * iOS blur enhancement: wrap container contents in a BlurView
       * from expo-blur once installed:
       *   <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
       */}
      <View style={styles.row} onLayout={onRowLayout}>
        {tabWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              {
                left: PILL_MARGIN,
                width: tabWidth - PILL_MARGIN * 2,
                transform: [{ translateX: pillX }],
              },
            ]}
          />
        )}

        {tabs.map((tab, i) => {
          const isActive = i === activeIndex;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              onPress={() => onTabPress(i)}
              style={styles.tab}
            >
              <Ionicons
                color={isActive ? colors.accent : colors.navInactive}
                name={isActive ? tab.activeIcon : tab.icon}
                size={22}
              />
              <Text
                style={[
                  styles.label,
                  isActive ? styles.labelActive : styles.labelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: (ROW_HEIGHT - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
    backgroundColor: colors.accentLight,
    borderRadius: 999,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    zIndex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.accent,
    opacity: 1,
  },
  labelInactive: {
    color: colors.navInactive,
    opacity: 0,
  },
});
