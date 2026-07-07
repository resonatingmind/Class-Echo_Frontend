import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';
import * as Linking from "expo-linking";

import { useRef } from "react";
import {
  NavigationContainerRef,
} from "@react-navigation/native";

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
    notification: colors.accent,
  },
};



// const linking = {
//   prefixes: [Linking.createURL("/")],

//   config: {
//     screens: {
//       Login: "login",
//       Signup: "signup",

//       SchoolAdminDashboard: "dashboard",
//       SchoolAdminTeachers: "teachers",
//       SchoolAdminStudents: "students",
//       SchoolAdminProfile: "profile",

//       SchoolAdminTeacherDetail: "teacher/:teacherId",
//       SchoolAdminTeacherAnalytics: "teacher/:teacherId/analytics",
//       SchoolAdminClassDetail: "class/:classId",

//       TeacherSubjects: "teacher",
//       StudentHome: "student",
//     },
//   },
// };

// const linking = {
//   prefixes: [Linking.createURL("/")],

//   config: {
//     screens: {
//       Login: "login",
//       Signup: "signup",

//       SchoolAdminTabs: {
//         screens: {
//           SchoolAdminDashboard: "dashboard",
//           SchoolAdminTeachers: "teachers",
//           SchoolAdminStudents: "students",
//           SchoolAdminProfile: "profile",
//         },
//       },

//       SchoolAdminTeacherDetail: "teacher/:teacherId",
//       SchoolAdminTeacherAnalytics: "teacher/:teacherId/analytics",
//       SchoolAdminTeacherRecordings: "teacher/:teacherId/recordings",

//       SchoolAdminClassDetail: "class/:classId",

//       TeacherSubjects: "teacher",
//       TeacherProfile: "teacher/profile",

//       StudentHome: "student",
//       StudentProfile: "student/profile",
//     },
//   },
// };

const linking = {
  prefixes: [Linking.createURL("/"), window.location.origin],

  config: {
    screens: {
      Login: "login",
      Signup: "signup",

      SchoolAdminTabs: {
        path: "",
        screens: {
          SchoolAdminDashboard: "dashboard",
          SchoolAdminTeachers: "teachers",
          SchoolAdminStudents: "students",
          SchoolAdminProfile: "profile",
        },
      },

      SchoolAdminClasses: "classes",

      SchoolAdminClassDetail: "class/:classId",

      SchoolAdminTeacherDetail: "teacher/:teacherId",

      SchoolAdminTeacherAnalytics: "teacher/:teacherId/analytics",

      SchoolAdminTeacherRecordings: "teacher/:teacherId/recordings",

      SchoolAdminSubjectDetail: "subject/:subjectId",

      SchoolAdminSubjectChapters: "subject/:subjectId/chapters",

      SchoolAdminChapterDetail: "chapter/:chapterId",

      TeacherSubjects: "teacher",

      TeacherSubjectDetail: "teacher/subject/:subjectId",

      TeacherRecording: "teacher/recording",

      TeacherProfile: "teacher/profile",

      StudentHome: "student",

      StudentSubjectDetail: "student/subject/:subjectId",

      StudentProfile: "student/profile",
    },
  },
};


export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...Feather.font,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer
          ref={navigationRef}
          theme={navigationTheme}
          linking={linking}
          onStateChange={() => {
            console.log(
              JSON.stringify(navigationRef.current?.getRootState(), null, 2),
            );
          }}
        >
          <StatusBar style="dark" />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
