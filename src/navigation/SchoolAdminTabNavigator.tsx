import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { FloatingPillTabBar, FloatingTabItem } from "../components/common/FloatingPillTabBar";

import { SchoolAdminDashboardScreen } from "../screens/SchoolAdminDashboardScreen";
import { SchoolAdminClassesScreen } from "../screens/SchoolAdminClassesScreen";
import { SchoolAdminTeachersScreen } from "../screens/SchoolAdminTeachersScreen";
import { SchoolAdminPlannerScreen } from "../screens/SchoolAdminPlannerScreen";
import { SchoolAdminTimetableScreen } from "../screens/SchoolAdminTimetableScreen";

export type SchoolAdminTabParamList = {
  SchoolAdminDashboard: undefined;
  SchoolAdminClasses: undefined;
  SchoolAdminTeachers: undefined;
  SchoolAdminPlanner: undefined;
  SchoolAdminTimetable: undefined;
};

const Tab = createBottomTabNavigator<SchoolAdminTabParamList>();

const TABS: FloatingTabItem[] = [
  { key: "SchoolAdminDashboard", label: "Dashboard", icon: "grid-outline",          activeIcon: "grid"          },
  { key: "SchoolAdminClasses",   label: "Classes",   icon: "school-outline",        activeIcon: "school"        },
  { key: "SchoolAdminTeachers",  label: "Teachers",  icon: "people-outline",        activeIcon: "people"        },
  { key: "SchoolAdminPlanner",   label: "Planner",   icon: "calendar-outline",      activeIcon: "calendar"      },
  { key: "SchoolAdminTimetable", label: "Timetable", icon: "time-outline",          activeIcon: "time"          },
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
      id="SchoolAdminTabs"
      initialRouteName="SchoolAdminDashboard"
      tabBar={(props) => <SchoolAdminTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="SchoolAdminDashboard" component={SchoolAdminDashboardScreen as any} options={{ title: "Dashboard" }} />
      <Tab.Screen name="SchoolAdminClasses"   component={SchoolAdminClassesScreen as any}   options={{ title: "Classes"   }} />
      <Tab.Screen name="SchoolAdminTeachers"  component={SchoolAdminTeachersScreen as any}  options={{ title: "Teachers"  }} />
      <Tab.Screen name="SchoolAdminPlanner"   component={SchoolAdminPlannerScreen as any}   options={{ title: "Planner"   }} />
      <Tab.Screen name="SchoolAdminTimetable" component={SchoolAdminTimetableScreen as any} options={{ title: "Timetable" }} />
    </Tab.Navigator>
  );
}

