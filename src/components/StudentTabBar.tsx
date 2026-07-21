import { FloatingPillTabBar, FloatingTabItem } from './common/FloatingPillTabBar';

type Tab = 'home' | 'profile';

type Props = {
  active: Tab;
  onTabPress: (tab: Tab) => void;
};

const TABS: FloatingTabItem[] = [
  { key: 'home',    label: 'Home',    icon: 'home-outline',   activeIcon: 'home'   },
  { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

export function StudentTabBar({ active, onTabPress }: Props) {
  const activeIndex = Math.max(TABS.findIndex((t) => t.key === active), 0);

  return (
    <FloatingPillTabBar
      tabs={TABS}
      activeIndex={activeIndex}
      onTabPress={(i) => onTabPress(TABS[i].key as Tab)}
    />
  );
}
