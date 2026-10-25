import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { FloatingPillTabBar, FloatingTabItem } from "../components/common/FloatingPillTabBar";
import { useProcessingCount } from "../lib/useProcessingCount";

import { TeacherDashboardScreen }  from "../screens/TeacherDashboardScreen";
import { TeacherClassesScreen }    from "../screens/TeacherClassesScreen";
import { TeacherRecordingsScreen } from "../screens/TeacherRecordingsScreen";

/* Three tabs: Home (what to do next), Classes (timetable, subjects and
   chapters) and My Growth (every lesson and its report). */
export type TeacherTabParamList = {
  TeacherDashboard: undefined;
  TeacherClasses:   { view?: "timetable" | "subjects" } | undefined;
  TeacherGrowth:    undefined;
};

const Tab = createBottomTabNavigator<TeacherTabParamList>();

const TABS: FloatingTabItem[] = [
  { key: "TeacherDashboard", label: "Home",      icon: "home-outline",        activeIcon: "home"        },
  { key: "TeacherClasses",   label: "Classes",   icon: "calendar-outline",    activeIcon: "calendar"    },
  { key: "TeacherGrowth",    label: "My Growth", icon: "trending-up-outline", activeIcon: "trending-up" },
];

function TeacherTabBar({ state, navigation, processingCount }: BottomTabBarProps & { processingCount: number }) {
  const tabs = TABS.map((t) =>
    t.key === "TeacherGrowth" ? { ...t, badge: processingCount } : t,
  );

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
      tabs={tabs}
      activeIndex={state.index}
      onTabPress={handlePress}
    />
  );
}

export function TeacherTabNavigator() {
  const processingCount = useProcessingCount();
  return (
    <Tab.Navigator
      id="TeacherTabs"
      initialRouteName="TeacherDashboard"
      tabBar={(props) => <TeacherTabBar {...props} processingCount={processingCount} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="TeacherDashboard" component={TeacherDashboardScreen}  options={{ title: "Home"      }} />
      <Tab.Screen name="TeacherClasses"   component={TeacherClassesScreen}    options={{ title: "Classes"   }} />
      <Tab.Screen name="TeacherGrowth"    component={TeacherRecordingsScreen} options={{ title: "My Growth" }} />
    </Tab.Navigator>
  );
}
