import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { FloatingPillTabBar, FloatingTabItem } from "../components/common/FloatingPillTabBar";

import { SchoolsScreen } from "../screens/SchoolsScreen";
import { AdminPeopleScreen } from "../screens/AdminPeopleScreen";
import { AdminOperationsScreen } from "../screens/AdminOperationsScreen";
import { AdminSystemScreen } from "../screens/AdminSystemScreen";

/**
 * Super admin shell.
 *
 * The schools list used to be the whole panel, which is why the email
 * diagnostic ended up wedged above its search bar. Splitting the running of the
 * product (Schools) from the running of the deployment (Operations, System)
 * gives each a home, and leaves somewhere obvious to add the rest.
 */
export type AdminTabParamList = {
  AdminSchoolsTab: undefined;
  AdminPeople: undefined;
  AdminOperations: undefined;
  AdminSystem: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

const TABS: FloatingTabItem[] = [
  { key: "AdminSchoolsTab", label: "Schools",    icon: "business-outline", activeIcon: "business" },
  { key: "AdminPeople",     label: "People",     icon: "people-outline",   activeIcon: "people"   },
  { key: "AdminOperations", label: "Operations", icon: "pulse-outline",    activeIcon: "pulse"    },
  { key: "AdminSystem",     label: "System",     icon: "settings-outline", activeIcon: "settings" },
];

function AdminTabBar({ state, navigation }: BottomTabBarProps) {
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

export function AdminTabNavigator() {
  return (
    <Tab.Navigator
      id="AdminTabs"
      initialRouteName="AdminSchoolsTab"
      tabBar={(props) => <AdminTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="AdminSchoolsTab" component={SchoolsScreen as any}          options={{ title: "Schools"    }} />
      <Tab.Screen name="AdminPeople"     component={AdminPeopleScreen as any}      options={{ title: "People"     }} />
      <Tab.Screen name="AdminOperations" component={AdminOperationsScreen as any}  options={{ title: "Operations" }} />
      <Tab.Screen name="AdminSystem"     component={AdminSystemScreen as any}      options={{ title: "System"     }} />
    </Tab.Navigator>
  );
}
