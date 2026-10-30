import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import { AppTheme } from "../../theme/AppTheme";

export interface SegmentOption<T> {
  label: string;
  value: T;
}

interface SegmentedSelectorProps<T> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedSelector<T extends string>({
  options,
  value,
  onChange,
}: SegmentedSelectorProps<T>) {
  const [width, setWidth] = React.useState(0);
  const activeIndex = options.findIndex((opt) => opt.value === value);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    if (width > 0) {
      const segmentWidth = width / options.length;
      Animated.timing(slideAnim, {
        toValue: activeIndex * segmentWidth,
        duration: AppTheme.animation.segment,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, width, slideAnim, options.length]);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {width > 0 && (
        <Animated.View
          style={[
            styles.activePill,
            {
              width: width / options.length - 8,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}
      {options.map((opt, i) => {
        const isActive = activeIndex === i;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(opt.value)}
            style={styles.segment}
          >
            <Text
              style={[
                styles.segmentText,
                isActive && styles.activeSegmentText,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: AppTheme.colors.divider,
    borderRadius: AppTheme.radius.medium,
    padding: 4,
    height: 40,
    position: "relative",
  },
  activePill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.small,
    ...AppTheme.shadows.subtle,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  segmentText: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.label,
  },
  activeSegmentText: {
    color: AppTheme.colors.primaryText,
  },
});

