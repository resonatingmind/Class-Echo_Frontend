import { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SchoolAdminTabParamList } from "./SchoolAdminTabNavigator";
import { useAuth } from "../context/AuthContext";
import { RecordingWithReport, UserRole } from "../types/api";
import { SchoolAdminTabNavigator } from "./SchoolAdminTabNavigator";
import { AdminTabNavigator } from "./AdminTabNavigator";
import type { AdminTabParamList } from "./AdminTabNavigator";

// Super Admin screens
import { AdminClassDetailScreen } from "../screens/AdminClassDetailScreen";
import { AdminCreateSchoolScreen } from "../screens/AdminCreateSchoolScreen";
import { AdminSchoolDetailScreen } from "../screens/AdminSchoolDetailScreen";
import { AdminSubjectDetailScreen } from "../screens/AdminSubjectDetailScreen";
import { SchoolAdminTeacherRecordingsScreen } from "../screens/SchoolAdminTeacherRecordingsScreen";

// School Admin screens
import { SchoolAdminClassDetailScreen } from "../screens/SchoolAdminClassDetailScreen";
import { SchoolAdminClassesScreen } from "../screens/SchoolAdminClassesScreen";
import { SchoolAdminPlannerScreen } from "../screens/SchoolAdminPlannerScreen";
import { SchoolAdminTeacherDetailScreen } from "../screens/SchoolAdminTeacherDetailScreen";
import { SchoolAdminSubjectChaptersScreen } from "../screens/SchoolAdminSubjectChaptersScreen";
import { SchoolAdminChapterDetailScreen } from "../screens/SchoolAdminChapterDetailScreen";
import { TeacherChapterDetailScreen } from "../screens/TeacherChapterDetailScreen";
import { SchoolAdminTeacherAnalyticsScreen } from "../screens/SchoolAdminTeacherAnalyticsScreen";
import { SchoolAdminTimetableScreen } from "../screens/SchoolAdminTimetableScreen";
import { SchoolAdminProfileScreen } from "../screens/SchoolAdminProfileScreen";

// Auth screens
import { AcceptInviteScreen } from "../screens/AcceptInviteScreen";
import { VerifyEmailScreen } from "../screens/VerifyEmailScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { SignupScreen } from "../screens/SignupScreen";
import { AwaitingApprovalScreen } from "../screens/AwaitingApprovalScreen";

// Student screens
import { StudentHomeScreen } from "../screens/StudentHomeScreen";
import { StudentProfileScreen } from "../screens/StudentProfileScreen";
import { StudentSubjectDetailScreen } from "../screens/StudentSubjectDetailScreen";

// Teacher screens
import { RecordingDetailScreen } from "../screens/RecordingDetailScreen";
import { RecordingScreen } from "../screens/RecordingScreen";
import { TeacherSubjectWorkspaceScreen } from "../screens/TeacherSubjectWorkspaceScreen";
import { TeacherProfileScreen } from "../screens/TeacherProfileScreen";
import { TeacherTabNavigator } from "./TeacherTabNavigator";

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Signup: undefined;
  // token arrives as the ?token= query string on the emailed invite link.
  AcceptInvite: { token?: string } | undefined;
  // token arrives as the ?token= query string on the emailed verification link.
  VerifyEmail: { token?: string } | undefined;
  // email pre-fills the field with whatever was typed on the Login screen.
  ForgotPassword: { email?: string } | undefined;
  // token arrives as the ?token= query string on the emailed reset link.
  ResetPassword: { token?: string } | undefined;
  AwaitingApproval: undefined;
  // Super Admin
  // The super admin shell. Kept under its original route name so every existing
  // navigate("AdminSchools") still lands somewhere sensible - the Schools tab.
  AdminSchools: NavigatorScreenParams<AdminTabParamList> | undefined;
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
  SchoolAdminProfile: undefined;


  SchoolAdminSubjectChapters: { subjectId: number; subjectName: string };
  SchoolAdminChapterDetail: {
    chapterId: number;
    chapterName: string;
    subjectName: string;
    subjectId?: number;
    openUpload?: boolean;
  };

  TeacherChapterDetail: {
    chapterId: number;
    chapterName: string;
    subjectName: string;
    subjectId?: number;
    openUpload?: boolean;
    initialTab?: 'planner' | 'profile' | 'documents';
  };
  TeacherProfile: undefined;
  TeacherTabs: undefined;

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
    learningPlanId?: number;
    lectureTitle?: string;
    replaceRecordingId?: number;
  };

  // Student
  StudentHome: undefined;
  StudentSubjectDetail: { subjectId: number; subjectName: string };
  StudentProfile: undefined;
  RecordingDetail: { recording: RecordingWithReport; subjectName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function roleHome(role: UserRole): keyof RootStackParamList {
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
      id="RootStack"
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
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (session.role === "school_admin" || session.role === "teacher") && session.status !== "active" ? (
        <Stack.Screen name="AwaitingApproval" component={AwaitingApprovalScreen} />
      ) : session.role === "admin" ? (
        <>
          <Stack.Screen name="AdminSchools" component={AdminTabNavigator} />
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

          {/* Detail & Secondary Screens */}
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
            name="SchoolAdminSubjectChapters"
            component={SchoolAdminSubjectChaptersScreen}
          />

          <Stack.Screen
            name="SchoolAdminChapterDetail"
            component={SchoolAdminChapterDetailScreen}
          />

          <Stack.Screen
            name="SchoolAdminProfile"
            component={SchoolAdminProfileScreen}
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
            name="TeacherSubjectWorkspace"
            component={TeacherSubjectWorkspaceScreen}
          />

          <Stack.Screen
            name="TeacherChapterDetail"
            component={TeacherChapterDetailScreen}
          />

          <Stack.Screen name="TeacherRecording" component={RecordingScreen} />
          <Stack.Screen
            name="RecordingDetail"
            component={RecordingDetailScreen}
          />
          <Stack.Screen
            name="TeacherProfile"
            component={TeacherProfileScreen}
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

      {/* Registered outside the session branches on purpose. An invitation link
          is how an account first gets a password, so it has to open even when
          this browser already holds a session — otherwise the emailed link
          silently lands on whatever home screen that stale session resolves to
          and the invited user never sees the password form. Kept last so the
          first screen of the matched branch stays the initial route. */}
      <Stack.Screen name="AcceptInvite" component={AcceptInviteScreen} />

      {/* Registered outside the session branches for the same reason as
          AcceptInvite: a verification link is emailed to an address that may
          already be signed in on this browser, or not signed in at all, and
          either way the link has to show the verification result instead of
          silently resolving to a home screen. */}
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />

      {/* Same reasoning again: a reset link may be opened on a browser that is
          still signed in (often as someone else), and it must reach the form. */}
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

