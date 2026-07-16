import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../theme/colors";

import { TeacherSubjectsScreen } from "../screens/TeacherSubjectsScreen";
import { TeacherProfileScreen } from "../screens/TeacherProfileScreen";
import { TeacherTimetableScreen } from "../screens/TeacherTimetableScreen";

export type TeacherTabParamList = {
  TeacherHome: undefined;
  TeacherTimetable: undefined;
  TeacherProfile: undefined;
};

const Tab = createBottomTabNavigator<TeacherTabParamList>();

export function TeacherTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="TeacherHome"
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
            case "TeacherHome":
              icon = "home";
              break;

            case "TeacherTimetable":
              icon = "calendar";
              break;

            case "TeacherProfile":
              icon = "person";
              break;
          }

          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="TeacherHome"
        component={TeacherSubjectsScreen}
        options={{ title: "Home" }}
      />

      <Tab.Screen
        name="TeacherTimetable"
        component={TeacherTimetableScreen}
        options={{ title: "Timetable" }}
      />

      <Tab.Screen
        name="TeacherProfile"
        component={TeacherProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}
