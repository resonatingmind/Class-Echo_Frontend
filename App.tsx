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
import { ActivityIndicator, View } from "react-native";

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { MaintenanceBanner } from './src/components/common/MaintenanceBanner';
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
      // ── Auth screens ──
      Login: "login",
      Signup: "signup",
      AcceptInvite: "accept-invite",
      VerifyEmail: "verify-email",
      AwaitingApproval: "awaiting-approval",

      // ── Super Admin screens ──
      AdminSchools: {
        path: "admin",
        screens: {
          AdminSchoolsTab: "schools",
          AdminPeople: "people",
          AdminOperations: "operations",
          AdminSystem: "system",
        },
      },
      AdminCreateSchool: "admin/schools/create",
      AdminSchoolDetail: {
        path: "admin/schools/:schoolId",
        parse: { schoolId: Number },
      },
      AdminClassDetail: {
        path: "admin/schools/:schoolId/class/:classId",
        parse: { schoolId: Number, classId: Number },
      },
      AdminSubjectDetail: {
        path: "admin/schools/:schoolId/subject/:subjectId",
        parse: { schoolId: Number, subjectId: Number },
      },

      // ── School Admin screens ──
      SchoolAdminTabs: {
        screens: {
          SchoolAdminDashboard: "dashboard",
          SchoolAdminClasses: "classes",
          SchoolAdminTeachers: "teachers",
          SchoolAdminPlanner: "planner",
          SchoolAdminTimetable: "timetable",
        },
      },

      SchoolAdminClassDetail: {
        path: "admin/class/:classId",
        parse: { classId: Number },
      },
      SchoolAdminTeacherDetail: {
        path: "admin/teacher/:teacherId",
        parse: { teacherId: Number },
      },
      SchoolAdminTeacherAnalytics: {
        path: "admin/teacher/:teacherId/analytics",
        parse: { teacherId: Number },
      },
      SchoolAdminTeacherRecordings: {
        path: "admin/teacher/:teacherId/recordings",
        parse: { teacherId: Number, chapterId: Number },
      },
      SchoolAdminSubjectChapters: {
        path: "admin/subject/:subjectId/chapters",
        parse: { subjectId: Number },
      },
      SchoolAdminChapterDetail: {
        path: "admin/chapter/:chapterId",
        parse: { chapterId: Number },
      },
      SchoolAdminProfile: "admin/profile",

      // ── Teacher screens ──
      TeacherTabs: {
        screens: {
          TeacherDashboard: "teacher/dashboard",
          TeacherHome: "teacher/subjects",
          TeacherTimetable: "teacher/timetable",
          TeacherRecordings: "teacher/recordings",
        },
      },

      TeacherSubjectWorkspace: {
        path: "teacher/subject/:subjectId/workspace",
        parse: { subjectId: Number },
      },
      TeacherChapterDetail: {
        path: "teacher/chapter/:chapterId",
        parse: { chapterId: Number },
      },
      TeacherRecording: {
        path: "teacher/recording",
        parse: { subjectId: Number, chapterId: Number, learningPlanId: Number, replaceRecordingId: Number },
      },
      TeacherProfile: "teacher/profile",

      // ── Student screens ──
      StudentHome: "student",
      StudentSubjectDetail: {
        path: "student/subject/:subjectId",
        parse: { subjectId: Number },
      },
      StudentProfile: "student/profile",

      // ── Shared detail screens ──
      RecordingDetail: {
        path: "recording/:recordingId",
        parse: { recordingId: Number },
      },
    },
  },
};

function RootNavigator() {
  const { isLoading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      linking={linking}
    >
      <StatusBar style="dark" />
      {/* Above the navigator so it is visible on every screen, including
          the login form — a user who cannot sign in during maintenance
          needs the explanation more than anyone. */}
      <MaintenanceBanner />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
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
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
