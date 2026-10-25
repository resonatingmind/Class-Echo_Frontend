import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { FloatingPillTabBar, FloatingTabItem } from "../components/common/FloatingPillTabBar";
import { useProcessingCount } from "../lib/useProcessingCount";

import { TeacherDashboardScreen }  from "../screens/TeacherDashboardScreen";
import { TeacherSubjectsScreen }   from "../screens/TeacherSubjectsScreen";
import { TeacherTimetableScreen }  from "../screens/TeacherTimetableScreen";
import { TeacherRecordingsScreen } from "../screens/TeacherRecordingsScreen";

export type TeacherTabParamList = {
  TeacherDashboard:  undefined;
  TeacherHome:       undefined;
  TeacherTimetable:  undefined;
  TeacherRecordings: undefined;
};

const Tab = createBottomTabNavigator<TeacherTabParamList>();

const TABS: FloatingTabItem[] = [
  { key: "TeacherDashboard",  label: "Home",       icon: "home-outline",      activeIcon: "home"      },
  { key: "TeacherHome",       label: "Subjects",   icon: "book-outline",      activeIcon: "book"      },
  { key: "TeacherTimetable",  label: "Timetable",  icon: "calendar-outline",  activeIcon: "calendar"  },
  { key: "TeacherRecordings", label: "Recordings", icon: "mic-outline",       activeIcon: "mic"       },
];

function TeacherTabBar({ state, navigation, processingCount }: BottomTabBarProps & { processingCount: number }) {
  const tabs = TABS.map((t) =>
    t.key === "TeacherRecordings" ? { ...t, badge: processingCount } : t,
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
      <Tab.Screen name="TeacherDashboard"  component={TeacherDashboardScreen}  options={{ title: "Home"       }} />
      <Tab.Screen name="TeacherHome"       component={TeacherSubjectsScreen}   options={{ title: "Subjects"   }} />
      <Tab.Screen name="TeacherTimetable"  component={TeacherTimetableScreen}  options={{ title: "Timetable"  }} />
      <Tab.Screen name="TeacherRecordings" component={TeacherRecordingsScreen} options={{ title: "Recordings" }} />
    </Tab.Navigator>
  );
}
