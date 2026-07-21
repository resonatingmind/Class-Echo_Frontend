import { FloatingPillTabBar, FloatingTabItem } from './common/FloatingPillTabBar';

type Props = {
  active: string;
  onTabPress?: (key: string) => void;
};

const TABS: FloatingTabItem[] = [
  { key: 'schools', label: 'Schools', icon: 'school-outline', activeIcon: 'school' },
];

export function SuperAdminTabBar({ active, onTabPress }: Props) {
  const activeIndex = Math.max(TABS.findIndex((t) => t.key === active), 0);

  return (
    <FloatingPillTabBar
      tabs={TABS}
      activeIndex={activeIndex}
      onTabPress={(i) => onTabPress?.(TABS[i].key)}
    />
  );
}
