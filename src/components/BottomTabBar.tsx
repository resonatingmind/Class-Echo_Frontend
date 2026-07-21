import { FloatingPillTabBar, FloatingTabItem } from './common/FloatingPillTabBar';

type BottomTabKey = 'home' | 'schools' | 'staff' | 'students' | 'settings';

type Props = {
  active?: BottomTabKey;
  onTabPress?: (key: BottomTabKey) => void;
};

const TABS: FloatingTabItem[] = [
  { key: 'home',     label: 'Home',     icon: 'home-outline',         activeIcon: 'home'          },
  { key: 'schools',  label: 'Schools',  icon: 'school-outline',       activeIcon: 'school'        },
  { key: 'staff',    label: 'Staff',    icon: 'people-outline',       activeIcon: 'people'        },
  { key: 'students', label: 'Students', icon: 'people-circle-outline', activeIcon: 'people-circle' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline',     activeIcon: 'settings'      },
];

export function BottomTabBar({ active = 'schools', onTabPress }: Props) {
  const activeIndex = Math.max(TABS.findIndex((t) => t.key === active), 0);

  return (
    <FloatingPillTabBar
      tabs={TABS}
      activeIndex={activeIndex}
      onTabPress={(i) => onTabPress?.(TABS[i].key as BottomTabKey)}
    />
  );
}
