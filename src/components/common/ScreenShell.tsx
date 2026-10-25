import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * The outer frame of a tab screen. A screen shown inside another one (the
 * Classes tab hosts Timetable and Subjects) is `embedded`: the host already
 * owns the safe area, so this is then a plain View.
 */
export function ScreenShell({ embedded = false, style, children }: {
  embedded?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  if (embedded) return <View style={style}>{children}</View>;
  return <SafeAreaView edges={['top']} style={style}>{children}</SafeAreaView>;
}
