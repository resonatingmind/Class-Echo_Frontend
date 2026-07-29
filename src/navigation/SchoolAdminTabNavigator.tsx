import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { FloatingPillTabBar, FloatingTabItem } from "../components/common/FloatingPillTabBar";

import { SchoolAdminDashboardScreen } from "../screens/SchoolAdminDashboardScreen";
import { SchoolAdminTeachersScreen } from "../screens/SchoolAdminTeachersScreen";
import { SchoolAdminProfileScreen } from "../screens/SchoolAdminProfileScreen";

export type SchoolAdminTabParamList = {
  SchoolAdminDashboard: undefined;
  SchoolAdminTeachers: undefined;
  SchoolAdminProfile: undefined;
};

const Tab = createBottomTabNavigator<SchoolAdminTabParamList>();

const TABS: FloatingTabItem[] = [
  { key: "SchoolAdminDashboard", label: "Dashboard", icon: "grid-outline",          activeIcon: "grid"          },
  { key: "SchoolAdminTeachers",  label: "Teachers",  icon: "people-outline",        activeIcon: "people"        },
  { key: "SchoolAdminProfile",   label: "Profile",   icon: "person-outline",        activeIcon: "person"        },
];

function SchoolAdminTabBar({ state, navigation }: BottomTabBarProps) {
  const handlePress = (index: number) => {
    const route = state.routes[index];
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (state.index !== index && !event.defaultPrevented) {
      navigation.navigate(route.name as never);
    }
  };

  return (
    <FloatingPillTabBar
      tabs={TABS}
      activeIndex={state.index}
      onTabPress={handlePress}
    />
  );
}

export function SchoolAdminTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="SchoolAdminDashboard"
      tabBar={(props) => <SchoolAdminTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="SchoolAdminDashboard" component={SchoolAdminDashboardScreen as any} options={{ title: "Dashboard" }} />
      <Tab.Screen name="SchoolAdminTeachers"  component={SchoolAdminTeachersScreen as any}  options={{ title: "Teachers"  }} />
      <Tab.Screen name="SchoolAdminProfile"   component={SchoolAdminProfileScreen as any}   options={{ title: "Profile"   }} />
    </Tab.Navigator>
  );
}
