import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { FloatingPillTabBar, FloatingTabItem } from "../components/common/FloatingPillTabBar";

import { TeacherSubjectsScreen } from "../screens/TeacherSubjectsScreen";
import { TeacherTimetableScreen } from "../screens/TeacherTimetableScreen";
import { TeacherProfileScreen } from "../screens/TeacherProfileScreen";

export type TeacherTabParamList = {
  TeacherHome: undefined;
  TeacherTimetable: undefined;
  TeacherProfile: undefined;
};

const Tab = createBottomTabNavigator<TeacherTabParamList>();

const TABS: FloatingTabItem[] = [
  { key: "TeacherHome",      label: "Home",      icon: "home-outline",     activeIcon: "home"     },
  { key: "TeacherTimetable", label: "Timetable", icon: "calendar-outline", activeIcon: "calendar" },
  { key: "TeacherProfile",   label: "Profile",   icon: "person-outline",   activeIcon: "person"   },
];

function TeacherTabBar({ state, navigation }: BottomTabBarProps) {
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

export function TeacherTabNavigator() {
  return (
    <Tab.Navigator id="TeacherTabNavigator.tsx" 
      initialRouteName="TeacherHome"
      tabBar={(props) => <TeacherTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="TeacherHome"      component={TeacherSubjectsScreen} options={{ title: "Home"      }} />
      <Tab.Screen name="TeacherTimetable" component={TeacherTimetableScreen} options={{ title: "Timetable" }} />
      <Tab.Screen name="TeacherProfile"   component={TeacherProfileScreen}   options={{ title: "Profile"   }} />
    </Tab.Navigator>
  );
}

