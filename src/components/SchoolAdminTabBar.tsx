import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";


import { colors } from "../theme/colors";

type Tab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const TABS: Tab[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "grid-outline",
    activeIcon: "grid",
  },
  {
    key: "teachers",
    label: "Teachers",
    icon: "people-outline",
    activeIcon: "people",
  },
  {
    key: "students",
    label: "Students",
    icon: "people-circle-outline",
    activeIcon: "people-circle",
  },
  {
    key: "profile",
    label: "Profile",
    icon: "person-outline",
    activeIcon: "person",
  },
];

type Props = {
  active: string;
};

export function SchoolAdminTabBar({ active }: Props) {

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              switch (tab.key) {
                case "dashboard":
                  navigation.navigate("SchoolAdminTabs", {
                    screen: "SchoolAdminDashboard",
                  });
                  break;

                case "teachers":
                  navigation.navigate("SchoolAdminTabs", {
                    screen: "SchoolAdminTeachers",
                  });
                  break;

                case "students":
                  navigation.navigate("SchoolAdminTabs", {
                    screen: "SchoolAdminStudents",
                  });
                  break;

                case "profile":
                  navigation.navigate("SchoolAdminTabs", {
                    screen: "SchoolAdminProfile",
                  });
                  break;
              }
            }}
            style={styles.tab}
          >
            <Ionicons
              color={isActive ? colors.accent : colors.navInactive}
              name={isActive ? tab.activeIcon : tab.icon}
              size={22}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 8,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  label: {
    color: colors.navInactive,
    fontSize: 10,
    fontWeight: "600",
  },
  labelActive: {
    color: colors.accent,
  },
});
