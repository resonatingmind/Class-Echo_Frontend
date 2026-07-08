import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../theme/colors";

import { SchoolAdminDashboardScreen } from "../screens/SchoolAdminDashboardScreen";
import { SchoolAdminTeachersScreen } from "../screens/SchoolAdminTeachersScreen";
import { SchoolAdminStudentsScreen } from "../screens/SchoolAdminStudentsScreen";
import { SchoolAdminProfileScreen } from "../screens/SchoolAdminProfileScreen";

export type SchoolAdminTabParamList = {
  SchoolAdminDashboard: undefined;
  SchoolAdminTeachers: undefined;
  SchoolAdminStudents: undefined;
  SchoolAdminProfile: undefined;
};

const Tab = createBottomTabNavigator<SchoolAdminTabParamList>();

export function SchoolAdminTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="SchoolAdminDashboard"
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.navInactive,

        tabBarStyle: {
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
        },

        tabBarIcon: ({ color, size }) => {
          let icon: keyof typeof Ionicons.glyphMap = "ellipse";

          switch (route.name) {
            case "SchoolAdminDashboard":
              icon = "grid";
              break;

            case "SchoolAdminTeachers":
              icon = "people";
              break;

            case "SchoolAdminStudents":
              icon = "people-circle";
              break;

            case "SchoolAdminProfile":
              icon = "person";
              break;
          }

          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="SchoolAdminDashboard"
        component={SchoolAdminDashboardScreen}
        options={{ title: "Dashboard" }}
      />

      <Tab.Screen
        name="SchoolAdminTeachers"
        component={SchoolAdminTeachersScreen}
        options={{ title: "Teachers" }}
      />

      <Tab.Screen
        name="SchoolAdminStudents"
        component={SchoolAdminStudentsScreen}
        options={{ title: "Students" }}
      />

      <Tab.Screen
        name="SchoolAdminProfile"
        component={SchoolAdminProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}
