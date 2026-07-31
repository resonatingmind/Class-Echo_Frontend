import { LearningPlanOut, LearningPlanCreatePayload } from '../types/api';
import {
  ClassOut,
  LLMReportOut,
  RecordingWithReport,
  SchoolCreatePayload,
  SchoolAdminProfileOut,
  SchoolOut,
  StudentOut,
  StudentProfileOut,
  StudentWithClassOut,
  SubjectOut,
  SubjectWithClassOut,
  TeacherOut,
  SchoolDashboardOverview,
  SchoolAnalytics,
  TeacherRanking,
  RecentActivity,
  TokenResponse,
  ChapterOut,
  ChapterCreatePayload,
  ChapterUpdatePayload,
  ChapterDocumentOut,
  ChapterKnowledgeOut,
  TeacherRecording,
  PlannerItemOut,
  PlannerSubjectDetail,
  TeacherLookupOut,
  ClassLookupOut,
  QuickAssignmentResponse,
  QuickAssignmentRequest,
  ReplaceAssignmentRequest,
  ReplaceAssignmentResponse,
  TeacherDashboardResponse,
  TimetableEntryOut,
  TimetableEntryPayload,
  TimetableImportResult,
} from "../types/api";

import { notifyUnauthorized } from "./authSession";
import { Platform } from "react-native";

function getDefaultApiBaseUrl() {
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }

  return "http://localhost:8000";
}

// Load from environment variable (Expo requires prefixing with EXPO_PUBLIC_)
// Fall back to the current host on web, or the standard emulator host on Android.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || getDefaultApiBaseUrl();

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function debugLog(label: string, payload?: unknown) {
  console.log(`[api] ${label}`, payload ?? "");
}

function debugError(label: string, payload?: unknown) {
  console.error(`[api] ${label}`, payload ?? "");
}

async function appendFile(
  form: FormData,
  fieldName: string,
  fileUri: string,
  mimeType: string,
  fallbackPrefix: string,
) {
  const uploadUri = normalizeUploadUri(fileUri);
  const normalizedType = normalizeMimeType(uploadUri, mimeType);
  const ext = inferFileExtension(uploadUri, normalizedType);
  const name = `${fallbackPrefix}_${Date.now()}.${ext}`;

  debugLog("appendFile", {
    fieldName,
    originalUri: fileUri,
    uploadUri,
    normalizedType,
    ext,
  });

  if (
    uploadUri.startsWith("blob:") ||
    uploadUri.startsWith("data:") ||
    (typeof window !== "undefined" &&
      !window.navigator.userAgent?.includes("ReactNative"))
  ) {
    try {
      const response = await fetch(uploadUri);
      const blob = await response.blob();
      form.append(fieldName, blob, name);
      return;
    } catch (err) {
      debugError("appendFile:web_fetch_failed", err);
    }
  }

  form.append(fieldName, {
    uri: uploadUri,
    type: normalizedType,
    name,
  } as unknown as Blob);
}

function normalizeUploadUri(fileUri: string) {
  if (
    fileUri.startsWith("file://") ||
    fileUri.startsWith("content://") ||
    fileUri.startsWith("http://") ||
    fileUri.startsWith("https://")
  ) {
    return fileUri;
  }

  if (fileUri.startsWith("/")) {
    return `file://${fileUri}`;
  }

  return fileUri;
}

function normalizeMimeType(fileUri: string, mimeType?: string | null) {
  const normalized = mimeType?.split(";")[0]?.trim().toLowerCase();
  if (normalized) {
    return normalized;
  }

  const ext = fileUri.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "m4a":
      return "audio/mp4";
    case "ogg":
      return "audio/ogg";
    case "webm":
      return "audio/webm";
    case "aac":
      return "audio/aac";
    default:
      return "application/octet-stream";
  }
}

function inferFileExtension(fileUri: string, mimeType: string) {
  const fromUri = fileUri.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (fromUri && fromUri.length <= 5) {
    return fromUri;
  }

  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "audio/mpeg":
      return "mp3";
    case "audio/mp4":
      return "m4a";
    default:
      return mimeType.split("/")[1] ?? "bin";
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  debugLog("request:start", {
    path,
    method: init.method ?? "GET",
    hasToken: Boolean(token),
    isFormData: init.body instanceof FormData,
  });

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    debugError("request:network_error", {
      path,
      method: init.method ?? "GET",
      hasToken: Boolean(token),
      isFormData: init.body instanceof FormData,
      error,
    });
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Network request failed";
    throw new ApiError(message, 0);
  }

  debugLog("request:response", {
    path,
    method: init.method ?? "GET",
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    if (response.status === 401 && token) {
      notifyUnauthorized();
    }
    let message = "Request failed";
    const raw = await response.text();
    debugError("request:http_error", {
      path,
      method: init.method ?? "GET",
      status: response.status,
      raw,
    });
    if (raw) {
      try {
        const body = JSON.parse(raw) as { detail?: string; message?: string };
        message = body.detail ?? body.message ?? raw;
      } catch {
        message = raw;
      }
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function login(username: string, password: string) {
  const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

  return request<TokenResponse>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export async function getAdminSchools(token: string) {
  return request<SchoolOut[]>("/admin/schools", {}, token);
}

export async function createAdminSchool(
  token: string,
  payload: SchoolCreatePayload,
) {
  return request<SchoolOut>(
    "/admin/schools",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function getAdminSchool(token: string, schoolId: number) {
  return request<SchoolOut>(`/admin/schools/${schoolId}`, {}, token);
}

export async function updateAdminSchool(
  token: string,
  schoolId: number,
  payload: { name: string; address?: string | null },
) {
  return request<SchoolOut>(
    `/admin/schools/${schoolId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteAdminSchool(token: string, schoolId: number, password?: string) {
  return request<void>(
    `/admin/schools/${schoolId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    },
    token,
  );
}

export async function getAdminSchoolClasses(token: string, schoolId: number) {
  return request<ClassOut[]>(`/admin/schools/${schoolId}/classes`, {}, token);
}

export async function getAdminClass(
  token: string,
  schoolId: number,
  classId: number,
) {
  return request<ClassOut>(
    `/admin/schools/${schoolId}/classes/${classId}`,
    {},
    token,
  );
}

export async function getAdminClassSubjects(
  token: string,
  schoolId: number,
  classId: number,
) {
  return request<SubjectOut[]>(
    `/admin/schools/${schoolId}/classes/${classId}/subjects`,
    {},
    token,
  );
}

export async function getAdminSubjectStudents(
  token: string,
  schoolId: number,
  subjectId: number,
) {
  return request<StudentOut[]>(
    `/admin/schools/${schoolId}/subjects/${subjectId}/students`,
    {},
    token,
  );
}

export async function getAdminSubjectRecordings(
  token: string,
  schoolId: number,
  subjectId: number,
) {
  return request<RecordingWithReport[]>(
    `/admin/schools/${schoolId}/subjects/${subjectId}/recordings`,
    {},
    token,
  );
}

export async function deleteAdminRecording(token: string, recordingId: number) {
  return request<void>(
    `/admin/recordings/${recordingId}`,
    { method: "DELETE" },
    token,
  );
}

export async function getSchoolAdminClasses(token: string) {
  return request<ClassOut[]>("/school/classes", {}, token);
}

export async function getSchoolAdminTeachers(token: string) {
  return request<TeacherOut[]>("/school/teachers", {}, token);
}

export async function getSchoolPlanner(
  token: string,
): Promise<PlannerItemOut[]> {
  return request<PlannerItemOut[]>("/school/planner", {}, token);
}

export async function getSchoolAdminMe(token: string) {
  return request<SchoolAdminProfileOut>("/school/me", {}, token);
}

export async function updateSchoolAdminMe(
  token: string,
  payload: {
    name?: string | null;
    school_name?: string | null;
    school_address?: string | null;
  },
) {
  return request<SchoolAdminProfileOut>(
    "/school/me",
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );
}

export async function getTeacherSubjects(token: string) {
  return request<SubjectOut[]>("/teacher/subjects", {}, token);
}

export async function getTeacherSubject(token: string, subjectId: number) {
  return request<SubjectOut>(`/teacher/subjects/${subjectId}`, {}, token);
}

// export async function getTeacherSubjectRecordings(
//   token: string,
//   subjectId: number,
// ) {
//   return request<RecordingWithReport[]>(
//     `/teacher/subjects/${subjectId}/recordings`,
//     {},
//     token,
//   );
// }

export async function getTeacherSubjectRecordings(
  token: string,
  subjectId: number,
  chapterId?: number,
) {
  const query = chapterId !== undefined ? `?chapter_id=${chapterId}` : "";

  return request<RecordingWithReport[]>(
    `/teacher/subjects/${subjectId}/recordings${query}`,
    {},
    token,
  );
}

export async function getTeacherDashboard(
  token: string,
): Promise<TeacherDashboardResponse> {
  return request<TeacherDashboardResponse>(
    "/teacher/dashboard-summary",
    {
      method: "GET",
    },
    token,
  );
}

export async function getTeacherSubjectStudents(
  token: string,
  subjectId: number,
) {
  return request<StudentOut[]>(
    `/teacher/subjects/${subjectId}/students`,
    {},
    token,
  );
}

// ── School Admin: Classes ─────────────────────────────────────────────────────

export type ClassCreatePayload = {
  name: string;
  section: string;
  profile_image_url?: string | null;
};

export async function createSchoolAdminClass(
  token: string,
  payload: Partial<ClassCreatePayload>,
) {
  return request<ClassOut>(
    "/school/classes",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateSchoolAdminClass(
  token: string,
  classId: number,
  payload: Partial<ClassCreatePayload>,
) {
  return request<ClassOut>(
    `/school/classes/${classId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteSchoolAdminClass(token: string, classId: number) {
  return request<void>(
    `/school/classes/${classId}`,
    { method: "DELETE" },
    token,
  );
}

// ── School Admin: Subjects ────────────────────────────────────────────────────

export type SubjectCreatePayload = {
  name: string;
  profile_image_url?: string | null;
};

export async function getClassSubjects(token: string, classId: number) {
  return request<SubjectOut[]>(
    `/school/classes/${classId}/subjects`,
    {},
    token,
  );
}

export async function createSubject(
  token: string,
  classId: number,
  payload: SubjectCreatePayload,
) {
  return request<SubjectOut>(
    `/school/classes/${classId}/subjects`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateSubject(
  token: string,
  subjectId: number,
  payload: SubjectCreatePayload,
) {
  return request<SubjectOut>(
    `/school/subjects/${subjectId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );
}

export async function assignTeacherToSubject(
  token: string,
  subjectId: number,
  teacherId: number,
) {
  return request<SubjectOut>(
    `/school/subjects/${subjectId}/assign-teacher`,
    { method: "PUT", body: JSON.stringify({ teacher_id: teacherId }) },
    token,
  );
}

// ── School Admin: Teachers ────────────────────────────────────────────────────

export type TeacherCreatePayload = {
  name: string;
  email: string;
  password: string;
  profile_image_url?: string | null;
};

export async function createSchoolAdminTeacher(
  token: string,
  payload: TeacherCreatePayload,
) {
  return request<TeacherOut>(
    "/school/teachers",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export type SubjectPerformance = {
  subject_id: number;

  subject_name: string;

  lectures: number;

  average_score: number;

  curriculum_coverage: number;

  engagement_score: number;

  accuracy_score: number;
};

export type MonthlyPerformance = {
  month: string;

  lectures: number;

  average_score: number;
};

export type TeacherAnalytics = {
  teacher_id: number;

  teacher_name: string;

  total_lectures: number;

  completed_lectures: number;

  pending_lectures: number;

  failed_lectures: number;

  overall_score: number;

  engagement_score: number;

  confidence_score: number;

  clarity_score: number;

  fluency_score: number;

  pace_score: number;

  curriculum_coverage: number;

  accuracy_score: number;

  average_duration_seconds: number;

  highest_score: number;

  lowest_score: number;

  longest_lecture_seconds: number;

  shortest_lecture_seconds: number;

  total_recording_hours: number;

  subject_performance: SubjectPerformance[];

  monthly_performance: MonthlyPerformance[];

  recent_lectures: {
    recording_id: number;

    lecture_title: string | null;

    chapter_name: string | null;

    uploaded_at: string;

    overall_score: number | null;

    status: string;
  }[];
};

export type FilterOption = {
  id: number;

  name: string;

  class_id?: number;

  class_name?: string;
};

export type AnalyticsFilters = {
  classes: FilterOption[];

  subjects: FilterOption[];

  statuses: string[];

  semesters: number[];
};

export type TeacherAnalyticsFilters = {
  classId?: number;
  subjectId?: number;
  semester?: number;
  status?: string;
  startDate?: string;
  search?: string;
  endDate?: string;
};

export async function getTeacherAnalytics(
  token: string,
  teacherId: number,
  filters?: TeacherAnalyticsFilters,
) {
  const params = new URLSearchParams();

  if (filters?.search?.trim()) {
    params.append("search", filters.search.trim());
  }
  if (filters?.classId) {
    params.append("class_id", String(filters.classId));
  }

  if (filters?.subjectId) {
    params.append("subject_id", String(filters.subjectId));
  }

  if (filters?.semester) {
    params.append("semester", String(filters.semester));
  }

  if (filters?.status) {
    params.append("status", filters.status);
  }

  if (filters?.startDate) {
    params.append("start_date", filters.startDate);
  }

  if (filters?.endDate) {
    params.append("end_date", filters.endDate);
  }

  const query = params.toString();

  return request<TeacherAnalytics>(
    `/school/teachers/${teacherId}/analytics${query ? `?${query}` : ""}`,
    {},
    token,
  );
}

export async function getTeacherAnalyticsFilters(
  token: string,
  teacherId: number,
) {
  return request<AnalyticsFilters>(
    `/school/teachers/${teacherId}/analytics/filters`,
    {},
    token,
  );
}

export interface TeacherSubjectSummary {
  id: number;
  name: string;
  class_name: string;
  section?: string;
  chapter_count: number;
  recording_count: number;
}

export interface TeacherStatistics {
  total_classes: number;
  total_subjects: number;
  total_chapters: number;
  total_recordings: number;
}

export interface TeacherProfile {
  id: number;
  name: string;
  email: string;
  profile_image_url: string | null;
  assigned_at: string | null;
  classes: string[];
  subjects: TeacherSubjectSummary[];
  statistics: TeacherStatistics;
}

// ── Teacher ───────────────────────────────────────────────────────────────────

export async function uploadRecording(
  token: string,
  subjectId: number,
  fileUri: string,
  mimeType: string,
  chapterId: number,
  lectureTitle?: string,
  description?: string,
  transcription?: string,
  durationSeconds?: number,
  onProgress?: (pct: number) => void,
  learningPlanId?: number,
): Promise<RecordingWithReport> {
  const form = new FormData();
  const normalizedType = normalizeMimeType(fileUri, mimeType);
  await appendFile(form, "file", fileUri, normalizedType, "recording");
  form.append("chapter_id", String(chapterId));
  if (learningPlanId) form.append("learning_plan_id", String(learningPlanId));
  if (lectureTitle) form.append("lecture_title", lectureTitle);
  if (description) form.append("description", description);
  if (transcription) form.append("transcription", transcription);
  if (durationSeconds !== undefined)
    form.append("duration_seconds", String(durationSeconds));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${API_BASE_URL}/teacher/subjects/${subjectId}/recordings`,
    );
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 401) {
        notifyUnauthorized();
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as RecordingWithReport);
        } catch {
          reject(new ApiError("Invalid response from server", xhr.status));
        }
      } else {
        reject(new ApiError(`Upload failed (${xhr.status})`, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("Network request failed", 0));
    xhr.ontimeout = () => reject(new ApiError("Upload timed out", 0));
    xhr.timeout = 10 * 60 * 1000; // 10 min for large files

    xhr.send(form);
  });
}

export async function getTeacherRecordingReport(
  token: string,
  recordingId: number,
) {
  return request<LLMReportOut>(
    `/teacher/recordings/${recordingId}/report`,
    {},
    token,
  );
}

export async function getChapterRecordings(
  token: string,
  chapterId: number,
): Promise<TeacherRecording[]> {
  return request<TeacherRecording[]>(
    `/school/chapters/${chapterId}/recordings`,
    {},
    token,
  );
}

export async function retryRecording(token: string, recordingId: number) {
  return request<RecordingWithReport>(
    `/teacher/recordings/${recordingId}/retry`,
    { method: "POST" },
    token,
  );
}

export async function updateTeacherRecording(
  token: string,
  recordingId: number,
  payload: {
    chapter_name?: string | null;
    lecture_title?: string | null;
    description?: string | null;
  },
) {
  return request<RecordingWithReport>(
    `/teacher/recordings/${recordingId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function archiveTeacherRecording(
  token: string,
  recordingId: number,
) {
  return request<RecordingWithReport>(
    `/teacher/recordings/${recordingId}/archive`,
    { method: "POST" },
    token,
  );
}

export async function deleteTeacherRecording(
  token: string,
  recordingId: number,
) {
  return request<void>(
    `/teacher/recordings/${recordingId}`,
    { method: "DELETE" },
    token,
  );
}

export async function updateTeacherMe(
  token: string,
  payload: { name?: string | null },
) {
  return request<TeacherOut>(
    "/teacher/me",
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );
}

export async function uploadTeacherProfileImage(
  token: string,
  imageUri: string,
  mimeType: string,
) {
  const form = new FormData();
  await appendFile(form, "file", imageUri, mimeType, "teacher_profile");
  return request<TeacherOut>(
    "/teacher/profile-image",
    { method: "POST", body: form, headers: {} },
    token,
  );
}

export async function getPlannerSubjectDetail(
  token: string,
  subjectId: number,
): Promise<PlannerSubjectDetail> {
  return request<PlannerSubjectDetail>(
    `/school/planner/${subjectId}`,
    {},
    token,
  );
}

export async function lookupTeacher(token: string, email: string) {
  return request<TeacherLookupOut>(
    `/school/teachers/lookup?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
    },
    token,
  );
}

export async function lookupClass(
  token: string,
  className: string,
  section: string,
) {
  return request<ClassLookupOut>(
    `/school/classes/lookup?name=${encodeURIComponent(
      className,
    )}&section=${encodeURIComponent(section)}`,
    {
      method: "GET",
    },
    token,
  );
}

export async function quickAssignment(
  token: string,
  payload: QuickAssignmentRequest,
) {
  return request<QuickAssignmentResponse>(
    "/school/planner/quick-assignment",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function replaceAssignment(
  token: string,
  payload: ReplaceAssignmentRequest,
) {
  return request<ReplaceAssignmentResponse>(
    "/school/planner/assignments/replace",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

// ── Student ───────────────────────────────────────────────────────────────────

export type StudentSignupPayload = {
  name: string;
  email: string;
  password: string;
  mobile_number?: string | null;
  school_id: number;
  class_id: number;
};

export async function studentSignup(payload: StudentSignupPayload) {
  return request<TokenResponse>("/auth/student/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type RegisterTeacherPayload = {
  name: string;
  email: string;
  password: string;
  school_id: number;
};

export async function registerTeacher(payload: RegisterTeacherPayload) {
  return request<TokenResponse>("/auth/teacher/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type RegisterSchoolPayload = {
  school_name: string;
  school_address?: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
};

export async function registerSchool(payload: RegisterSchoolPayload) {
  return request<TokenResponse>("/auth/school/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export async function getTeacherMe(token: string) {
  return request<TeacherOut>("/teacher/me", {}, token);
}

export async function getSchoolAdminStudents(token: string) {
  return request<StudentWithClassOut[]>("/school/students", {}, token);
}

export async function getSchoolSubjectRecordings(
  token: string,
  subjectId: number,
) {
  return request<RecordingWithReport[]>(
    `/school/subjects/${subjectId}/recordings`,
    {},
    token,
  );
}

export async function getSchoolSubjectStudents(
  token: string,
  subjectId: number,
) {
  return request<StudentOut[]>(
    `/school/subjects/${subjectId}/students`,
    {},
    token,
  );
}

export async function getStudentMe(token: string) {
  return request<StudentProfileOut>("/student/me", {}, token);
}

export async function updateStudentMe(
  token: string,
  payload: { name?: string | null; mobile_number?: string | null },
) {
  return request<StudentProfileOut>(
    "/student/me",
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );
}

export async function uploadStudentProfileImage(
  token: string,
  imageUri: string,
  mimeType: string,
) {
  const form = new FormData();
  await appendFile(form, "file", imageUri, mimeType, "student_profile");
  return request<StudentProfileOut>(
    "/student/profile-image",
    { method: "POST", body: form, headers: {} },
    token,
  );
}

export async function getStudentSubjects(token: string, classId: number) {
  return request<SubjectOut[]>(
    `/student/classes/${classId}/subjects`,
    {},
    token,
  );
}

export async function getStudentSubjectRecordings(
  token: string,
  subjectId: number,
) {
  return request<RecordingWithReport[]>(
    `/student/subjects/${subjectId}/recordings`,
    {},
    token,
  );
}

export async function uploadSchoolAdminProfileImage(
  token: string,
  imageUri: string,
  mimeType: string,
) {
  const form = new FormData();
  await appendFile(form, "file", imageUri, mimeType, "school_admin_profile");
  return request<SchoolAdminProfileOut>(
    "/school/profile-image",
    { method: "POST", body: form, headers: {} },
    token,
  );
}

export async function uploadSchoolLogo(
  token: string,
  imageUri: string,
  mimeType: string,
) {
  const form = new FormData();
  await appendFile(form, "file", imageUri, mimeType, "school_logo");
  return request<SchoolOut>(
    "/school/logo",
    { method: "POST", body: form, headers: {} },
    token,
  );
}

// ── Public (unauthenticated) ──────────────────────────────────────────────────

export async function getPublicSchools(search?: string) {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : "";
  return request<SchoolOut[]>(`/public/schools${suffix}`);
}

export async function getPublicSchoolClasses(schoolId: number) {
  return request<ClassOut[]>(`/public/schools/${schoolId}/classes`);
}

// ── Chapters ──────────────────────────────────────────────────────────────────

export async function getChapters(token: string, subjectId: number) {
  return request<ChapterOut[]>(
    `/school/subjects/${subjectId}/chapters`,
    {},
    token,
  );
}

export async function getTeacherChapters(token: string, subjectId: number) {
  return request<ChapterOut[]>(
    `/teacher/subjects/${subjectId}/chapters`,
    {},
    token,
  );
}

export async function createTeacherChapter(
  token: string,
  subjectId: number,
  payload: ChapterCreatePayload,
) {
  return request<ChapterOut>(
    `/teacher/subjects/${subjectId}/chapters`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateTeacherChapter(
  token: string,
  chapterId: number,
  payload: ChapterCreatePayload,
) {
  return request<ChapterOut>(
    `/teacher/chapters/${chapterId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deleteTeacherChapter(token: string, chapterId: number) {
  return request<void>(
    `/teacher/chapters/${chapterId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

// ── Teacher: Learning Plans (Micro Planner) ─────────────────────────────────

export async function getTeacherLearningPlans(
  token: string,
  subjectId: number,
  chapterId: number,
) {
  return request<LearningPlanOut[]>(
    `/teacher/subjects/${subjectId}/chapters/${chapterId}/learning-plans`,
    {},
    token,
  );
}

export async function createTeacherLearningPlan(
  token: string,
  subjectId: number,
  chapterId: number,
  payload: LearningPlanCreatePayload,
) {
  return request<LearningPlanOut>(
    `/teacher/subjects/${subjectId}/chapters/${chapterId}/learning-plans`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateTeacherLearningPlan(
  token: string,
  planId: number,
  payload: Partial<LearningPlanCreatePayload>,
) {
  return request<LearningPlanOut>(
    `/teacher/learning-plans/${planId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deleteTeacherLearningPlan(token: string, planId: number) {
  return request<void>(
    `/teacher/learning-plans/${planId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

// ── School Admin: Learning Plans (Micro Planner) ──────────────────────────────

export async function getSchoolLearningPlans(
  token: string,
  subjectId: number,
  chapterId: number,
) {
  return request<LearningPlanOut[]>(
    `/school/subjects/${subjectId}/chapters/${chapterId}/learning-plans`,
    {},
    token,
  );
}

export async function createSchoolLearningPlan(
  token: string,
  subjectId: number,
  chapterId: number,
  payload: LearningPlanCreatePayload,
) {
  return request<LearningPlanOut>(
    `/school/subjects/${subjectId}/chapters/${chapterId}/learning-plans`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateSchoolLearningPlan(
  token: string,
  planId: number,
  payload: Partial<LearningPlanCreatePayload>,
) {
  return request<LearningPlanOut>(
    `/school/learning-plans/${planId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deleteSchoolLearningPlan(token: string, planId: number) {
  return request<void>(
    `/school/learning-plans/${planId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function createChapter(
  token: string,
  subjectId: number,
  payload: ChapterCreatePayload,
) {
  return request<ChapterOut>(
    `/school/subjects/${subjectId}/chapters`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateChapter(
  token: string,
  chapterId: number,
  payload: ChapterUpdatePayload,
) {
  return request<ChapterOut>(
    `/school/chapters/${chapterId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deleteChapter(token: string, chapterId: number) {
  return request<void>(
    `/school/chapters/${chapterId}`,
    { method: "DELETE" },
    token,
  );
}

export async function getChapterDetails(token: string, chapterId: number) {
  return request<ChapterOut>(`/school/chapters/${chapterId}`, {}, token);
}

export async function getChapterKnowledge(token: string, chapterId: number) {
  return request<ChapterKnowledgeOut>(
    `/school/chapters/${chapterId}/knowledge`,
    {},
    token,
  );
}

export async function getChapterDocuments(token: string, chapterId: number) {
  return request<ChapterDocumentOut[]>(
    `/school/chapters/${chapterId}/documents`,
    {},
    token,
  );
}

export async function deleteChapterDocument(token: string, documentId: number) {
  return request<void>(
    `/school/chapters/documents/${documentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function uploadChapterDocument(
  token: string,
  chapterId: number,
  fileUri: string,
  mimeType: string,
  fileName: string,
  onProgress?: (pct: number) => void,
): Promise<ChapterDocumentOut> {
  const form = new FormData();

  await appendFile(form, "file", fileUri, mimeType, "chapter_document");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${API_BASE_URL}/school/chapters/${chapterId}/documents`);

    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 401) {
        notifyUnauthorized();
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        console.log(xhr.responseText);
        reject(new ApiError(xhr.responseText, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("Network request failed", 0));

    xhr.send(form);
  });
}

export async function uploadTeacherChapterDocument(
  token: string,
  chapterId: number,
  fileUri: string,
  mimeType: string,
  fileName: string,
  onProgress?: (pct: number) => void,
): Promise<ChapterDocumentOut> {
  const form = new FormData();

  // Use the same helper as recording upload
  await appendFile(form, "file", fileUri, mimeType, "chapter_document");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${API_BASE_URL}/teacher/chapters/${chapterId}/documents`);

    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 401) {
        notifyUnauthorized();
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        console.log(xhr.responseText);
        reject(new ApiError(xhr.responseText, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("Network request failed", 0));

    xhr.send(form);
  });
}

export async function getTeacherChapterDetails(
  token: string,
  chapterId: number,
) {
  return request<ChapterOut>(`/teacher/chapters/${chapterId}`, {}, token);
}

export async function getTeacherChapterKnowledge(
  token: string,
  chapterId: number,
) {
  return request<ChapterKnowledgeOut>(
    `/teacher/chapters/${chapterId}/knowledge`,
    {},
    token,
  );
}

export async function getTeacherChapterDocuments(
  token: string,
  chapterId: number,
) {
  return request<ChapterDocumentOut[]>(
    `/teacher/chapters/${chapterId}/documents`,
    {},
    token,
  );
}

export async function deleteTeacherChapterDocument(
  token: string,
  documentId: number,
) {
  return request<void>(
    `/teacher/chapters/documents/${documentId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export { API_BASE_URL, ApiError };

export async function getSchoolDashboardOverview(
  token: string,
): Promise<SchoolDashboardOverview> {
  return request<SchoolDashboardOverview>(
    "/school/dashboard/overview",
    {},
    token,
  );
}

export async function getSchoolAnalytics(
  token: string,
): Promise<SchoolAnalytics> {
  return request<SchoolAnalytics>("/school/dashboard/analytics", {}, token);
}

export async function getTeacherRanking(
  token: string,
): Promise<TeacherRanking> {
  return request<TeacherRanking>(
    "/school/dashboard/teacher-ranking",
    {},
    token,
  );
}

export async function getRecentActivity(
  token: string,
): Promise<RecentActivity> {
  return request<RecentActivity>(
    "/school/dashboard/recent-activity",
    {},
    token,
  );
}

export async function getTeacherRecordings(
  token: string,
  teacherId: number,
): Promise<TeacherRecording[]> {
  return request<TeacherRecording[]>(
    `/school/teachers/${teacherId}/recordings`,
    {},
    token,
  );
}

export async function getSchoolTeacherSubjects(
  token: string,
  teacherId: number,
) {
  return request<SubjectWithClassOut[]>(
    `/school/teachers/${teacherId}/subjects`,
    {},
    token,
  );
}

export async function getTeacherProfile(
  token: string,
  teacherId: number,
): Promise<TeacherProfile> {
  return request<TeacherProfile>(
    `/school/teachers/${teacherId}/profile`,
    {},
    token,
  );
}

export async function approveSchoolAdminTeacher(token: string, teacherId: number) {
  return request<TeacherOut>(
    `/school/teachers/${teacherId}/approve`,
    { method: "POST" },
    token,
  );
}

export async function rejectSchoolAdminTeacher(
  token: string,
  teacherId: number,
  reason?: string,
) {
  return request<TeacherOut>(
    `/school/teachers/${teacherId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
    token,
  );
}

export async function suspendSchoolAdminTeacher(token: string, teacherId: number) {
  return request<TeacherOut>(
    `/school/teachers/${teacherId}/suspend`,
    { method: "POST" },
    token,
  );
}

export async function reactivateSchoolAdminTeacher(token: string, teacherId: number) {
  return request<TeacherOut>(
    `/school/teachers/${teacherId}/reactivate`,
    { method: "POST" },
    token,
  );
}

export async function getSchoolRecordingDetail(
  token: string,
  recordingId: number,
): Promise<RecordingWithReport> {
  return request<RecordingWithReport>(
    `/school/recordings/${recordingId}`,
    {},
    token,
  );
}

// ── School Admin: Timetable ─────────────────────────────────────────────────

export async function getSchoolAdminTimetable(
  token: string,
  filters?: { classId?: number; dayOfWeek?: string },
) {
  const params = new URLSearchParams();
  if (filters?.classId !== undefined) {
    params.set("class_id", String(filters.classId));
  }
  if (filters?.dayOfWeek !== undefined) {
    params.set("day_of_week", String(filters.dayOfWeek));
  }
  const query = params.toString() ? `?${params.toString()}` : "";

  return request<TimetableEntryOut[]>(`/school/timetable${query}`, {}, token);
}

export async function createTimetableEntry(
  token: string,
  payload: TimetableEntryPayload,
) {
  return request<TimetableEntryOut>(
    "/school/timetable",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateTimetableEntry(
  token: string,
  entryId: number,
  payload: Partial<TimetableEntryPayload>,
) {
  return request<TimetableEntryOut>(
    `/school/timetable/${entryId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteTimetableEntry(token: string, entryId: number) {
  return request<void>(
    `/school/timetable/${entryId}`,
    { method: "DELETE" },
    token,
  );
}

export async function importSchoolTimetable(
  token: string,
  fileUri: string,
  mimeType: string,
  fileName: string,
  replaceExisting: boolean,
): Promise<TimetableImportResult> {
  const form = new FormData();
  await appendFile(
    form,
    "file",
    fileUri,
    mimeType,
    fileName.replace(/\.[^/.]+$/, ""),
  );

  return request<TimetableImportResult>(
    `/school/timetable/import?replace_existing=${replaceExisting ? "true" : "false"}`,
    { method: "POST", body: form },
    token,
  );
}

export function getTimetableTemplateUrl() {
  return `${API_BASE_URL}/school/timetable/template`;
}

// ── Teacher: Timetable (read-only) ──────────────────────────────────────────

export async function getTeacherTimetable(token: string) {
  return request<TimetableEntryOut[]>("/teacher/timetable", {}, token);
}

export async function approveAdminSchool(token: string, schoolId: number) {
  return request<SchoolOut>(
    `/admin/schools/${schoolId}/approve`,
    { method: "POST" },
    token,
  );
}

export async function rejectAdminSchool(
  token: string,
  schoolId: number,
  reason?: string,
) {
  return request<SchoolOut>(
    `/admin/schools/${schoolId}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    },
    token,
  );
}

export async function suspendAdminSchool(token: string, schoolId: number) {
  return request<SchoolOut>(
    `/admin/schools/${schoolId}/suspend`,
    { method: "POST" },
    token,
  );
}

export async function reactivateAdminSchool(token: string, schoolId: number) {
  return request<SchoolOut>(
    `/admin/schools/${schoolId}/reactivate`,
    { method: "POST" },
    token,
  );
}





