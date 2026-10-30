import {
  NextClassBriefOut,
  FeedbackTarget,
  GrowthOut,
  LearningPlanOut,
  LearningPlanCreatePayload,
  ReportFeedback,
  ReportFeedbackIn,
  ReportFeedbackSummary,
  SelfRating,
  SelfRatingArea,
  SharedClip,
  Milestone,
  SchoolGrowth,
  AdminTeacherGrowth,
} from '../types/api';
import {
  ClassOut,
  ClassFiltersOut,
  SchoolAdminClassFilters,
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
  AcceptInvitePayload,
  ResetPasswordPayload,
  AuditLogEntry,
  CredentialUpdateOut,
  ExportResource,
  EmailLogEntry,
  EmailLogStatus,
  EmailStatsOut,
  EmailStatusOut,
  EmailTestResult,
  PipelineRecordingOut,
  PublicSystemStatus,
  SettingOut,
  SystemHealthOut,
  UserSearchResult,
  SetPasswordPayload,
  TeacherBulkInviteResponse,
  TeacherInviteEntry,
} from "../types/api";

import { notifyUnauthorized } from "./authSession";
import { Platform } from "react-native";

function getDefaultApiBaseUrl() {
  return "https://3-24-211-242.sslip.io";
}

// Load from environment variable (Expo requires prefixing with EXPO_PUBLIC_)
// Fall back to the deployed production backend.
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

  // Web and native need genuinely different bodies: a browser wants a real
  // Blob, React Native wants a `{ uri, type, name }` descriptor. Branch on
  // Platform.OS — the old sniff read `window.navigator.userAgent`, which React
  // Native never defines, so every native upload took the browser branch. On
  // iOS `fetch('file://…')` actually succeeds there, and the resulting Blob was
  // then dropped by RN's FormData (it only understands `uri` descriptors),
  // producing a body with no file at all and a 422 from the API.
  if (Platform.OS === "web") {
    try {
      const response = await fetch(uploadUri);
      const blob = await response.blob();
      // The Blob is the only trustworthy source of the real format: a
      // MediaRecorder clip is webm on Chrome no matter what the caller
      // guessed, and storing webm bytes under an .m4a name makes the
      // server-side analysis reject the audio later on.
      const resolvedType = normalizeMimeType(uploadUri, blob.type || mimeType);
      const ext = inferFileExtension(uploadUri, resolvedType);
      const name = `${fallbackPrefix}_${Date.now()}.${ext}`;

      debugLog("appendFile:web", { fieldName, uploadUri, resolvedType, ext });
      form.append(
        fieldName,
        blob.type ? blob : new Blob([blob], { type: resolvedType }),
        name,
      );
      return;
    } catch (err) {
      debugError("appendFile:web_fetch_failed", err);
      throw new ApiError("Could not read the selected file for upload.", 0);
    }
  }

  const normalizedType = normalizeMimeType(uploadUri, mimeType);
  const ext = inferFileExtension(uploadUri, normalizedType);
  const name = `${fallbackPrefix}_${Date.now()}.${ext}`;

  debugLog("appendFile:native", { fieldName, uploadUri, normalizedType, ext });

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

// Extensions we are willing to trust when they appear on an incoming URI.
// Sniffing "the text after the last dot" alone is not safe: a `blob:` or
// `content://` URI has no extension, and its host/path fragment gets mistaken
// for one.
const KNOWN_UPLOAD_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "mp3",
  "mp4",
  "m4a",
  "wav",
  "ogg",
  "webm",
  "aac",
  "flac",
  "pdf",
  "docx",
  "pptx",
  "txt",
]);

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/aac": "aac",
  "audio/flac": "flac",
  "application/pdf": "pdf",
  // Office types matter here: their MIME strings contain dots, so the generic
  // "text after the slash" fallback produced filenames like
  // "doc.vnd.openxmlformats-officedocument.wordprocessingml.document", which
  // the server rejected as an unsupported extension.
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/msword": "docx",
  "application/vnd.ms-powerpoint": "pptx",
  "text/plain": "txt",
};

function inferFileExtension(fileUri: string, mimeType: string) {
  const lastSegment = fileUri.split("?")[0]?.split("#")[0]?.split("/").pop() ?? "";
  const fromUri = lastSegment.includes(".")
    ? lastSegment.split(".").pop()?.toLowerCase()
    : undefined;
  if (fromUri && KNOWN_UPLOAD_EXTENSIONS.has(fromUri)) {
    return fromUri;
  }

  return (
    EXTENSION_BY_MIME_TYPE[mimeType] ?? mimeType.split("/")[1] ?? "bin"
  );
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

/* ── Organisation onboarding (super admin) ─────────────────────────────────── */

export async function getAdminSchoolTeachers(
  token: string,
  schoolId: number,
  status?: string,
) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<TeacherOut[]>(`/admin/schools/${schoolId}/teachers${query}`, {}, token);
}

export async function inviteAdminSchoolTeachers(
  token: string,
  schoolId: number,
  teachers: TeacherInviteEntry[],
) {
  return request<TeacherBulkInviteResponse>(
    `/admin/schools/${schoolId}/teachers/invite`,
    { method: "POST", body: JSON.stringify({ teachers }) },
    token,
  );
}

export async function resendAdminSchoolAdminInvite(token: string, schoolId: number) {
  return request<{ detail: string }>(
    `/admin/schools/${schoolId}/admin/resend-invite`,
    { method: "POST" },
    token,
  );
}

export async function resendAdminTeacherInvite(
  token: string,
  schoolId: number,
  teacherId: number,
) {
  return request<{ detail: string }>(
    `/admin/schools/${schoolId}/teachers/${teacherId}/resend-invite`,
    { method: "POST" },
    token,
  );
}

export async function revokeAdminTeacherInvite(
  token: string,
  schoolId: number,
  teacherId: number,
) {
  return request<void>(
    `/admin/schools/${schoolId}/teachers/${teacherId}`,
    { method: "DELETE" },
    token,
  );
}

/* ── Email delivery diagnostics (super admin) ──────────────────────────────── */

/** What this deployment is configured to do with outgoing email. */
export async function getAdminEmailStatus(token: string) {
  return request<EmailStatusOut>('/admin/system/email-status', {}, token);
}

/** Push a real message to the provider now and report its own error verbatim. */
export async function sendAdminTestEmail(token: string, toEmail: string) {
  return request<EmailTestResult>(
    '/admin/system/email-test',
    { method: 'POST', body: JSON.stringify({ to_email: toEmail }) },
    token,
  );
}

/* ── Operations & system health (super admin) ──────────────────────────────── */

/** Every send attempt, newest first — the answer to "no invite arrived". */
export async function getAdminEmailLog(
  token: string,
  opts: { status?: EmailLogStatus; purpose?: string; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.purpose) params.set('purpose', opts.purpose);
  params.set('limit', String(opts.limit ?? 50));
  return request<EmailLogEntry[]>(`/admin/system/email-log?${params}`, {}, token);
}

/** Rolling 24h delivery totals, and how close they are to the provider's cap. */
export async function getAdminEmailStats(token: string) {
  return request<EmailStatsOut>('/admin/system/email-stats', {}, token);
}

/**
 * Re-send the invitation a log row refers to. Mints a fresh token rather than
 * replaying the original link, which re-issuing would have invalidated anyway.
 */
export async function resendAdminEmailLog(token: string, logId: number) {
  return request<{ detail: string }>(
    `/admin/system/email-log/${logId}/resend`,
    { method: 'POST' },
    token,
  );
}

/** Recordings the analysis pipeline failed or abandoned. */
export async function getAdminPipelineRecordings(
  token: string,
  opts: { status?: string; problemsOnly?: boolean; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  params.set('problems_only', String(opts.problemsOnly ?? true));
  params.set('limit', String(opts.limit ?? 50));
  return request<PipelineRecordingOut[]>(
    `/admin/system/recordings?${params}`,
    {},
    token,
  );
}

/** Put a failed or stuck recording back through analysis. 409 if no worker. */
export async function retryAdminRecording(token: string, recordingId: number) {
  return request<{ detail: string }>(
    `/admin/system/recordings/${recordingId}/retry`,
    { method: 'POST' },
    token,
  );
}

/** Database, Redis, worker, email, storage, AI and invite-link configuration. */
export async function getAdminSystemHealth(token: string) {
  return request<SystemHealthOut>('/admin/system/health', {}, token);
}

/* ── Runtime settings (super admin) ────────────────────────────────────────── */

/** Everything changeable without a redeploy. Never includes credentials. */
export async function getAdminSettings(token: string) {
  return request<SettingOut[]>('/admin/system/settings', {}, token);
}

export async function updateAdminSetting(
  token: string,
  key: string,
  value: string | number | boolean,
) {
  return request<SettingOut>(
    `/admin/system/settings/${key}`,
    { method: 'PUT', body: JSON.stringify({ value }) },
    token,
  );
}

/** Drop the override so the environment variable applies again. */
export async function resetAdminSetting(token: string, key: string) {
  return request<SettingOut>(
    `/admin/system/settings/${key}/reset`,
    { method: 'POST' },
    token,
  );
}

/* ── Global user lookup (super admin) ──────────────────────────────────────── */

/** Find anyone across every school by email or name. */
export async function searchAdminUsers(token: string, q: string) {
  return request<UserSearchResult[]>(
    `/admin/users/search?q=${encodeURIComponent(q)}`,
    {},
    token,
  );
}

/* ── Audit log & export (super admin) ──────────────────────────────────────── */

/** What super admins have done, newest first. Read-only — there is no delete. */
export async function getAdminAuditLog(
  token: string,
  opts: { action?: string; schoolId?: number; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (opts.action) params.set('action', opts.action);
  if (opts.schoolId != null) params.set('school_id', String(opts.schoolId));
  params.set('limit', String(opts.limit ?? 50));
  return request<AuditLogEntry[]>(`/admin/system/audit-log?${params}`, {}, token);
}

/**
 * Download one school's records as CSV.
 *
 * Fetched with the auth header and handed to the browser as a blob rather than
 * opened as a plain link: the endpoint requires a bearer token, which a link
 * navigation cannot carry. Web only — a native save needs the filesystem and
 * sharing APIs, so callers should route mobile users to the web panel rather
 * than silently doing nothing.
 */
export async function downloadAdminSchoolExport(
  token: string,
  schoolId: number,
  resource: ExportResource,
): Promise<void> {
  if (Platform.OS !== 'web') {
    throw new ApiError('Exports are available in the web admin panel.', 0);
  }

  const response = await fetch(
    `${API_BASE_URL}/admin/schools/${schoolId}/export?resource=${resource}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized();
    throw new ApiError(
      (await response.text()) || 'Export failed',
      response.status,
    );
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const named = /filename="?([^";]+)"?/.exec(disposition);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = named?.[1] ?? `school-${schoolId}-${resource}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next tick, not immediately: Safari cancels an in-flight
  // download if the object URL disappears in the same frame as the click.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* ── Public ────────────────────────────────────────────────────────────────── */

/**
 * Maintenance state. Unauthenticated, because the people who most need to see
 * it are the ones whose requests are being refused.
 */
export async function getPublicSystemStatus() {
  return request<PublicSystemStatus>('/public/system/status', {});
}

/* ── Direct credential management (super admin) ────────────────────────────── */

/**
 * Set a school admin's password outright. Nothing is emailed — use this when
 * the invite link cannot reach them or credentials are being handed over live.
 */
export async function setAdminSchoolAdminPassword(
  token: string,
  schoolId: number,
  payload: SetPasswordPayload,
) {
  return request<CredentialUpdateOut>(
    `/admin/schools/${schoolId}/admin/set-password`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

/** Set a teacher's password outright, without sending an email. */
export async function setAdminTeacherPassword(
  token: string,
  schoolId: number,
  teacherId: number,
  payload: SetPasswordPayload,
) {
  return request<CredentialUpdateOut>(
    `/admin/schools/${schoolId}/teachers/${teacherId}/set-password`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

/** Activate a school admin regardless of their current state, no email sent. */
export async function activateAdminSchoolAdmin(token: string, schoolId: number) {
  return request<SchoolOut>(
    `/admin/schools/${schoolId}/admin/activate`,
    { method: 'POST' },
    token,
  );
}

/** Activate a teacher regardless of their current state, no email sent. */
export async function activateAdminTeacher(
  token: string,
  schoolId: number,
  teacherId: number,
) {
  return request<TeacherOut>(
    `/admin/schools/${schoolId}/teachers/${teacherId}/activate`,
    { method: 'POST' },
    token,
  );
}

/** Exchange an emailed invite token for a session by setting a password. */
export async function acceptInvite(payload: AcceptInvitePayload) {
  return request<TokenResponse>("/auth/accept-invite", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Consume an emailed email-verification token. Needs no session of its own. */
export async function verifyEmail(token: string) {
  return request<{ email_verified: boolean }>(
    `/auth/verify-email?token=${encodeURIComponent(token)}`,
  );
}

/** Ask for a password reset email. Resolves the same way whether or not the email has an account. */
export async function forgotPassword(email: string) {
  return request<{ detail: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** Set a new password using the token from an emailed reset link. */
export async function resetPassword(payload: ResetPasswordPayload) {
  return request<{ password_reset: boolean }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export async function getSchoolAdminClasses(
  token: string,
  filters?: SchoolAdminClassFilters,
) {
  const query = new URLSearchParams();

  if (filters?.name) query.set("name", filters.name);
  if (filters?.section) query.set("section", filters.section);
  if (filters?.teacher_id != null) {
    query.set("teacher_id", String(filters.teacher_id));
  }
  if (filters?.subject) query.set("subject", filters.subject);

  const qs = query.toString();

  return request<ClassOut[]>(
    `/school/classes${qs ? `?${qs}` : ""}`,
    {},
    token,
  );
}

export async function getSchoolAdminClassFilters(token: string) {
  return request<ClassFiltersOut>("/school/classes/filters", {}, token);
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
    streak_min_recordings?: number;
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

export async function deleteSubject(token: string, subjectId: number) {
  return request<{ message: string } | any>(
    `/school/subjects/${subjectId}`,
    { method: "DELETE" },
    token,
  );
}

export async function assignTeacherToSubject(
  token: string,
  subjectId: number,
  teacherId: number | null,
) {
  return request<SubjectOut>(
    `/school/subjects/${subjectId}/assign-teacher`,
    { method: "PUT", body: JSON.stringify({ teacher_id: teacherId }) },
    token,
  );
}

// ── School Admin: Teachers ────────────────────────────────────────────────────

export type TeacherInvitePayload = {
  name: string;
  email: string;
};

// The school admin does not set a password here: the teacher receives the same
// invitation email as every other onboarding path and chooses their own.
export async function inviteSchoolAdminTeacher(
  token: string,
  payload: TeacherInvitePayload,
) {
  return request<TeacherOut>(
    "/school/teachers/invite",
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
  replaceRecordingId?: number,
): Promise<RecordingWithReport> {
  const form = new FormData();
  const normalizedType = normalizeMimeType(fileUri, mimeType);
  await appendFile(form, "file", fileUri, normalizedType, "recording");
  form.append("chapter_id", String(chapterId));
  if (learningPlanId) form.append("learning_plan_id", String(learningPlanId));
  if (replaceRecordingId) form.append("replace_recording_id", String(replaceRecordingId));
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

/** Agree or disagree with one report finding. Returns all feedback on the report. */
export async function putReportFeedback(
  token: string,
  recordingId: number,
  body: ReportFeedbackIn,
): Promise<ReportFeedback[]> {
  return request<ReportFeedback[]>(
    `/teacher/recordings/${recordingId}/feedback`,
    { method: "PUT", body: JSON.stringify(body) },
    token,
  );
}

/** Undo a 👍/👎. Returns the remaining feedback on the report. */
export async function deleteReportFeedback(
  token: string,
  recordingId: number,
  targetType: FeedbackTarget,
  targetKey: string,
): Promise<ReportFeedback[]> {
  return request<ReportFeedback[]>(
    `/teacher/recordings/${recordingId}/feedback/${targetType}/${encodeURIComponent(targetKey)}`,
    { method: "DELETE" },
    token,
  );
}

/** The teacher's own view before the report is revealed, or a skip. Once per report. */
export async function putSelfRating(
  token: string,
  recordingId: number,
  body: { ratings?: Partial<Record<SelfRatingArea, number>>; reflection?: string | null; skipped?: boolean },
): Promise<SelfRating> {
  return request<SelfRating>(
    `/teacher/recordings/${recordingId}/self-rating`,
    { method: "PUT", body: JSON.stringify(body) },
    token,
  );
}

/** Show a moment to the school admin. Returns every clip now shared from the report. */
export async function shareClip(
  token: string,
  recordingId: number,
  body: { start: number; title: string; note?: string | null },
): Promise<SharedClip[]> {
  return request<SharedClip[]>(
    `/teacher/recordings/${recordingId}/shared-clips`,
    { method: "PUT", body: JSON.stringify(body) },
    token,
  );
}

/** Stop showing a moment to the school admin. Returns the clips still shared. */
export async function unshareClip(token: string, recordingId: number, clipId: number): Promise<SharedClip[]> {
  return request<SharedClip[]>(
    `/teacher/recordings/${recordingId}/shared-clips/${clipId}`,
    { method: "DELETE" },
    token,
  );
}

/** Count a clip played from the report. Best effort: a failure is ignored. */
export async function recordClipPlay(token: string, recordingId: number): Promise<void> {
  try {
    await request<void>(`/teacher/recordings/${recordingId}/clip-plays`, { method: "POST" }, token);
  } catch {
    // Usage counting must never get in the way of playback.
  }
}

export async function getReportFeedbackSummary(
  token: string,
  rubricVersion?: string,
): Promise<ReportFeedbackSummary> {
  const query = rubricVersion ? `?rubric_version=${encodeURIComponent(rubricVersion)}` : "";
  return request<ReportFeedbackSummary>(`/admin/system/report-feedback${query}`, {}, token);
}

export async function getTeacherRecordingDetail(
  token: string,
  recordingId: number,
): Promise<RecordingWithReport> {
  return request<RecordingWithReport>(
    `/teacher/recordings/${recordingId}`,
    {},
    token,
  );
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

/**
 * Turn a stored media URL into something this client can actually fetch.
 *
 * When the backend has no object storage configured it saves uploads to its own
 * disk and records an absolute loopback URL (`http://127.0.0.1:8000/uploads/…`).
 * That address means "this device" to a phone or a browser, so playback failed
 * for every locally stored recording. Loopback hosts are therefore rewritten
 * onto the API base URL, which is the host actually serving those files.
 */
export function resolveMediaUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const base = API_BASE_URL.replace(/\/+$/, "");
  const loopback = url.match(
    /^https?:\/\/(?:127\.0\.0\.1|localhost|0\.0\.0\.0)(?::\d+)?(\/.*)?$/i,
  );
  if (loopback) {
    return `${base}${loopback[1] ?? ""}`;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${base}/${url.replace(/^\/+/, "")}`;
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

/** The recap before a period. `on` is the local date (YYYY-MM-DD), for the planner entry dated today. */
export async function getClassBrief(token: string, entryId: number, on: string) {
  return request<NextClassBriefOut>(`/teacher/timetable/${entryId}/brief?on=${on}`, {}, token);
}

/** The teacher saw the brief before this class (counted once per day). Best effort. */
export async function markClassBriefOpened(
  token: string,
  entryId: number,
  on: string,
  source: 'dashboard' | 'push' = 'dashboard',
): Promise<void> {
  try {
    await request<void>(
      `/teacher/timetable/${entryId}/brief/opened`,
      { method: "POST", body: JSON.stringify({ on, source }) },
      token,
    );
  } catch {
    // Usage counting must never get in the way of the brief.
  }
}

/** Register this phone for class reminders, with its timezone (timetable times are local). */
export async function registerDeviceToken(
  token: string,
  body: { token: string; platform: 'ios' | 'android'; timezone: string },
): Promise<void> {
  await request<void>("/teacher/device-token", { method: "PUT", body: JSON.stringify(body) }, token);
}

/** Stop reminders on this phone, e.g. on sign-out. */
export async function removeDeviceToken(token: string, pushToken: string): Promise<void> {
  await request<void>(
    "/teacher/device-token",
    { method: "DELETE", body: JSON.stringify({ token: pushToken }) },
    token,
  );
}

/** My Growth: trends per area and focus progress, against the teacher's own past. */
export async function getMyGrowth(token: string) {
  return request<GrowthOut>("/teacher/growth", {}, token);
}

/** Show a milestone to the school admin, or make it private again. */
export async function setMilestoneShared(token: string, milestoneId: number, shared: boolean) {
  return request<Milestone>(
    `/teacher/milestones/${milestoneId}`,
    { method: "PUT", body: JSON.stringify({ shared }) },
    token,
  );
}

/** School admin: every teacher's status against their own past, and common weak areas. */
export async function getSchoolGrowth(token: string) {
  return request<SchoolGrowth>("/school/growth", {}, token);
}

/** School admin: one teacher's trends, focus, streak, and what they shared. */
export async function getTeacherGrowthForAdmin(token: string, teacherId: number) {
  return request<AdminTeacherGrowth>(`/school/teachers/${teacherId}/growth`, {}, token);
}

/** Leave a lecture out of My Growth trends (needs a doesn't-fit-this-class dispute), or put it back. */
export async function setExcludedFromTrends(token: string, recordingId: number, excluded: boolean) {
  return request<{ excluded_from_trends: boolean }>(
    `/teacher/recordings/${recordingId}/trends`,
    { method: "PUT", body: JSON.stringify({ excluded }) },
    token,
  );
}

/** Turn the brief off or on for this class, every period. Returns the brief as it now stands. */
export async function setClassBriefMuted(token: string, entryId: number, muted: boolean) {
  return request<NextClassBriefOut>(
    `/teacher/timetable/${entryId}/brief/mute`,
    { method: "PUT", body: JSON.stringify({ muted }) },
    token,
  );
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

export async function importSchoolSubjectLearningPlans(
  token: string,
  subjectId: number,
  fileUri: string,
  mimeType: string,
  fileName: string,
): Promise<LearningPlanOut[]> {
  const form = new FormData();
  await appendFile(
    form,
    "file",
    fileUri,
    mimeType,
    fileName.replace(/\.[^/.]+$/, ""),
  );

  return request<LearningPlanOut[]>(
    `/school/subjects/${subjectId}/learning-plans/import`,
    { method: "POST", body: form },
    token,
  );
}

export async function importSchoolSubjectLearningPlansPhoto(
  token: string,
  subjectId: number,
  fileUri: string,
  mimeType: string,
  fileName: string,
): Promise<LearningPlanOut[]> {
  const form = new FormData();
  await appendFile(
    form,
    "file",
    fileUri,
    mimeType,
    fileName,
  );

  return request<LearningPlanOut[]>(
    `/school/subjects/${subjectId}/learning-plans/import-photo`,
    { method: "POST", body: form },
    token,
  );
}

export async function importTeacherSubjectLearningPlans(
  token: string,
  subjectId: number,
  fileUri: string,
  mimeType: string,
  fileName: string,
): Promise<LearningPlanOut[]> {
  const form = new FormData();
  await appendFile(
    form,
    "file",
    fileUri,
    mimeType,
    fileName.replace(/\.[^/.]+$/, ""),
  );

  return request<LearningPlanOut[]>(
    `/teacher/subjects/${subjectId}/learning-plans/import`,
    { method: "POST", body: form },
    token,
  );
}

export async function importTeacherSubjectLearningPlansPhoto(
  token: string,
  subjectId: number,
  fileUri: string,
  mimeType: string,
  fileName: string,
): Promise<LearningPlanOut[]> {
  const form = new FormData();
  await appendFile(
    form,
    "file",
    fileUri,
    mimeType,
    fileName,
  );

  return request<LearningPlanOut[]>(
    `/teacher/subjects/${subjectId}/learning-plans/import-photo`,
    { method: "POST", body: form },
    token,
  );
}

export function getSubjectLearningPlanTemplateUrl() {
  return `${API_BASE_URL}/public/learning-plans/subject-template`;
}
