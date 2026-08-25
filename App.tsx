import { NavigationContainer, DefaultTheme, NavigationContainerRef } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold, 
  Inter_700Bold 
} from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from "react";

import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';
import * as Linking from "expo-linking";

// Prevent auto hiding the splash screen, catching any possible native startup rejection
SplashScreen.preventAutoHideAsync().catch(() => {});

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

const linking = {
  prefixes: [
    "classecho://",
    Linking.createURL("/"),
    ...(typeof window !== "undefined" && window.location?.origin ? [window.location.origin] : []),
  ],

  config: {
    screens: {
      Login: "login",
      Signup: "signup",
      AwaitingApproval: "awaiting-approval",

      SchoolAdminTabs: {
        screens: {
          SchoolAdminDashboard: "dashboard",
          SchoolAdminClasses: "classes",
          SchoolAdminTeachers: "teachers",
          SchoolAdminPlanner: "planner",
          SchoolAdminTimetable: "timetable",
        },
      },

      SchoolAdminClassDetail: "admin/class/:classId",
      SchoolAdminTeacherDetail: "admin/teacher/:teacherId",
      SchoolAdminTeacherAnalytics: "admin/teacher/:teacherId/analytics",
      SchoolAdminTeacherRecordings: "admin/teacher/:teacherId/recordings",
      SchoolAdminSubjectChapters: "admin/subject/:subjectId/chapters",
      SchoolAdminChapterDetail: "admin/chapter/:chapterId",
      SchoolAdminProfile: "admin/profile",

      TeacherTabs: {
        screens: {
          TeacherDashboard: "teacher/dashboard",
          TeacherHome: "teacher/subjects",
          TeacherTimetable: "teacher/timetable",
          TeacherRecordings: "teacher/recordings",
        },
      },

      TeacherSubjectWorkspace: "teacher/subject/:subjectId/workspace",
      TeacherChapterDetail: "teacher/chapter/:chapterId",
      TeacherRecording: "teacher/recording",
      TeacherProfile: "teacher/profile",

      StudentHome: "student",
      StudentSubjectDetail: "student/subject/:subjectId",
      StudentProfile: "student/profile",

      RecordingDetail: "recording/detail",
    },
  },
};

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Ionicons.font,
    ...Feather.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer
          ref={navigationRef}
          theme={navigationTheme}
          linking={linking}
        >
          <StatusBar style="dark" />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
