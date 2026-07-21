import { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SchoolAdminTabParamList } from "./SchoolAdminTabNavigator";
import { SchoolAdminPlannerDetailScreen } from "../screens/SchoolAdminPlannerDetailScreen";
import { useAuth } from "../context/AuthContext";
import { RecordingWithReport, UserRole } from "../types/api";
import { SchoolAdminTabNavigator } from "./SchoolAdminTabNavigator";

// Super Admin screens
import { AdminClassDetailScreen } from "../screens/AdminClassDetailScreen";
import { AdminCreateSchoolScreen } from "../screens/AdminCreateSchoolScreen";
import { AdminSchoolDetailScreen } from "../screens/AdminSchoolDetailScreen";
import { AdminSubjectDetailScreen } from "../screens/AdminSubjectDetailScreen";
import { SchoolsScreen } from "../screens/SchoolsScreen";
import { SchoolAdminTeacherRecordingsScreen } from "../screens/SchoolAdminTeacherRecordingsScreen";

// School Admin screens
import { SchoolAdminClassDetailScreen } from "../screens/SchoolAdminClassDetailScreen";
import { SchoolAdminClassesScreen } from "../screens/SchoolAdminClassesScreen";
import { SchoolAdminPlannerScreen } from "../screens/SchoolAdminPlannerScreen";
import { SchoolAdminTeacherDetailScreen } from "../screens/SchoolAdminTeacherDetailScreen";
import { SchoolAdminSubjectDetailScreen } from "../screens/SchoolAdminSubjectDetailScreen";
import { SchoolAdminSubjectChaptersScreen } from "../screens/SchoolAdminSubjectChaptersScreen";
import { SchoolAdminChapterDetailScreen } from "../screens/SchoolAdminChapterDetailScreen";
import { TeacherChapterDetailScreen } from "../screens/TeacherChapterDetailScreen";
import { SchoolAdminTeacherAnalyticsScreen } from "../screens/SchoolAdminTeacherAnalyticsScreen";
import { SchoolAdminTimetableScreen } from "../screens/SchoolAdminTimetableScreen";

// Auth screens
import { LoginScreen } from "../screens/LoginScreen";
import { SignupScreen } from "../screens/SignupScreen";

// Student screens
import { StudentHomeScreen } from "../screens/StudentHomeScreen";
import { StudentProfileScreen } from "../screens/StudentProfileScreen";
import { StudentSubjectDetailScreen } from "../screens/StudentSubjectDetailScreen";

// Teacher screens
import { RecordingDetailScreen } from "../screens/RecordingDetailScreen";
import { RecordingScreen } from "../screens/RecordingScreen";
import { TeacherProfileScreen } from "../screens/TeacherProfileScreen";
import { TeacherSubjectDetailScreen } from "../screens/TeacherSubjectDetailScreen";
import { TeacherSubjectWorkspaceScreen } from "../screens/TeacherSubjectWorkspaceScreen";
import { TeacherTabNavigator } from "./TeacherTabNavigator";

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Signup: undefined;
  // Super Admin
  AdminSchools: undefined;
  AdminCreateSchool: undefined;
  AdminSchoolDetail: { schoolId: number };
  AdminClassDetail: {
    schoolId: number;
    classId: number;
    className: string;
    section: string;
    schoolName: string;
  };
  AdminSubjectDetail: {
    schoolId: number;
    subjectId: number;
    subjectName: string;
  };
  // School Admin
  SchoolAdminTabs: NavigatorScreenParams<SchoolAdminTabParamList>;
  SchoolAdminClasses: undefined;

  SchoolAdminClassDetail: {
    classId: number;
    className: string;
    section: string;
  };
  SchoolAdminTeachers: undefined;
  SchoolAdminTeacherDetail: {
    teacherId: number;
  };
  SchoolAdminTeacherAnalytics: {
    teacherId: number;
  };

  SchoolAdminTeacherRecordings: {
    teacherId?: number;
    chapterId?: number;
    subjectName?: string;
    chapterName?: string;
  };
  SchoolAdminPlanner: undefined;

  SchoolAdminTimetable: undefined;

  SchoolAdminPlannerDetail: {
    subjectId: number;
  };
  SchoolAdminSubjectDetail: { subjectId: number; subjectName: string };
  SchoolAdminSubjectChapters: { subjectId: number; subjectName: string };
  SchoolAdminChapterDetail: {
    chapterId: number;
    chapterName: string;
    subjectName: string;

    openUpload?: boolean;
  };

  TeacherChapterDetail: {
    chapterId: number;
    chapterName: string;
    subjectName: string;
    openUpload?: boolean;
  };
  TeacherTabs: undefined;
  TeacherSubjectDetail: {
    subjectId: number;
    subjectName: string;
    initialChapterId?: number;
    initialTab?: "recordings" | "students";
  };
  TeacherSubjectWorkspace: {
    subjectId: number;
    subjectName: string;
    className: string;
    section: string;
  };
  TeacherRecording: {
    subjectId: number;
    subjectName: string;
    existingChapters?: string[];
    chapterId?: number;
    chapterName?: string;
  };
  TeacherProfile: undefined;

  // Student
  StudentHome: undefined;
  StudentSubjectDetail: { subjectId: number; subjectName: string };
  StudentProfile: undefined;
  RecordingDetail: { recording: RecordingWithReport; subjectName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function roleHome(role: UserRole): keyof RootStackParamList {
  switch (role) {
    case "admin":
      return "AdminSchools";
    case "school_admin":
      return "SchoolAdminTabs";
    case "teacher":
      return "TeacherTabs";
    case "student":
      return "StudentHome";
    default:
      return "Login";
  }
}

export function AppNavigator() {
  const { session, isLoading } = useAuth();
  if (isLoading) {
    return null;
  }
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FAF9F9" },
        animation: "slide_from_right",
      }}
    >
      {!session ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : session.role === "admin" ? (
        <>
          <Stack.Screen name="AdminSchools" component={SchoolsScreen} />
          <Stack.Screen
            name="AdminCreateSchool"
            component={AdminCreateSchoolScreen}
          />
          <Stack.Screen
            name="AdminSchoolDetail"
            component={AdminSchoolDetailScreen}
          />
          <Stack.Screen
            name="AdminClassDetail"
            component={AdminClassDetailScreen}
          />
          <Stack.Screen
            name="AdminSubjectDetail"
            component={AdminSubjectDetailScreen}
          />
          <Stack.Screen
            name="RecordingDetail"
            component={RecordingDetailScreen}
          />
        </>
      ) : session.role === "school_admin" ? (
        <>
          {/* Root Bottom Tabs */}
          <Stack.Screen
            name="SchoolAdminTabs"
            component={SchoolAdminTabNavigator}
          />

          {/* Other Screens */}
          <Stack.Screen
            name="SchoolAdminClasses"
            component={SchoolAdminClassesScreen}
          />

          <Stack.Screen
            name="SchoolAdminPlanner"
            component={SchoolAdminPlannerScreen}
          />

          <Stack.Screen
            name="SchoolAdminTimetable"
            component={SchoolAdminTimetableScreen}
          />

          <Stack.Screen
            name="SchoolAdminPlannerDetail"
            component={SchoolAdminPlannerDetailScreen}
          />

          <Stack.Screen
            name="SchoolAdminClassDetail"
            component={SchoolAdminClassDetailScreen}
          />

          <Stack.Screen
            name="SchoolAdminTeacherDetail"
            component={SchoolAdminTeacherDetailScreen}
          />

          <Stack.Screen
            name="SchoolAdminTeacherAnalytics"
            component={SchoolAdminTeacherAnalyticsScreen}
          />

          <Stack.Screen
            name="SchoolAdminTeacherRecordings"
            component={SchoolAdminTeacherRecordingsScreen}
          />

          <Stack.Screen
            name="SchoolAdminSubjectDetail"
            component={SchoolAdminSubjectDetailScreen}
          />

          <Stack.Screen
            name="SchoolAdminSubjectChapters"
            component={SchoolAdminSubjectChaptersScreen}
          />

          <Stack.Screen
            name="SchoolAdminChapterDetail"
            component={SchoolAdminChapterDetailScreen}
          />

          <Stack.Screen
            name="RecordingDetail"
            component={RecordingDetailScreen}
          />
        </>
      ) : session.role === "teacher" ? (
        <>
          <Stack.Screen name="TeacherTabs" component={TeacherTabNavigator} />

          <Stack.Screen
            name="TeacherSubjectDetail"
            component={TeacherSubjectDetailScreen}
          />

          <Stack.Screen
            name="TeacherSubjectWorkspace"
            component={TeacherSubjectWorkspaceScreen}
          />

          <Stack.Screen
            name="TeacherChapterDetail"
            component={TeacherChapterDetailScreen}
          />

          <Stack.Screen name="TeacherRecording" component={RecordingScreen} />
          <Stack.Screen
            name="TeacherProfile"
            component={TeacherProfileScreen}
          />
          <Stack.Screen
            name="RecordingDetail"
            component={RecordingDetailScreen}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
          <Stack.Screen
            name="StudentSubjectDetail"
            component={StudentSubjectDetailScreen}
          />
          <Stack.Screen
            name="StudentProfile"
            component={StudentProfileScreen}
          />
          <Stack.Screen
            name="RecordingDetail"
            component={RecordingDetailScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
