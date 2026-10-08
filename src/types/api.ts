export type UserRole = "admin" | "school_admin" | "teacher" | "student";

export type TokenResponse = {
  access_token: string;
  token_type: string;
  role: UserRole;
};

export type SchoolAdminOut = {
  id: number;
  name: string;
  email: string;
  status: string;
  email_verified: boolean;
  rejected_reason: string | null;
};

export type SchoolOut = {
  id: number;
  name: string;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  admin?: SchoolAdminOut | null;
};

export type TeacherInviteEntry = {
  name: string;
  email: string;
};

export type SchoolCreatePayload = {
  name: string;
  address?: string | null;
  logo_url?: string | null;
  admin_name: string;
  admin_email: string;
  // The admin sets their own password from the emailed invite link, so no
  // password is sent from here.
  teachers?: TeacherInviteEntry[];
};

export type TeacherInviteResult = {
  email: string;
  name: string;
  outcome: 'invited' | 'reinvited' | 'skipped';
  teacher_id: number | null;
  reason: string | null;
};

export type TeacherBulkInviteResponse = {
  invited_count: number;
  skipped_count: number;
  results: TeacherInviteResult[];
};

export type AcceptInvitePayload = {
  token: string;
  password: string;
};

/** What this deployment is configured to do with outgoing email. */
export type EmailStatusOut = {
  backend: 'resend' | 'brevo' | 'mailjet' | 'smtp' | 'log';
  delivers_email: boolean;
  from_email: string | null;
  from_name: string | null;
  sandbox: boolean;
  frontend_url: string;
  sample_invite_link: string;
  credentials: string | null;
  warnings: string[];
};

/** What actually happened when a real message was pushed to the provider. */
export type EmailTestResult = {
  delivered: boolean;
  backend: string;
  to_email: string;
  from_email: string | null;
  error: string | null;
  credentials: string | null;
  detail: string;
};

export type EmailLogStatus = 'queued' | 'sent' | 'failed' | 'skipped';

/**
 * One recorded send attempt.
 *
 * Carries no message body: invite HTML holds a live single-use token, so
 * resending re-mints one through the invite endpoints instead of replaying
 * whatever went out before. `can_resend` is false when the row does not name an
 * account to re-invite (a test send, or an invite whose account is gone).
 */
export type EmailLogEntry = {
  id: number;
  to_email: string;
  subject: string;
  purpose: string;
  status: EmailLogStatus;
  backend: string | null;
  error: string | null;
  school_id: number | null;
  related_type: string | null;
  related_id: number | null;
  created_at: string;
  updated_at: string | null;
  can_resend: boolean;
};

/** Delivery totals for the last rolling 24 hours, against the provider's cap. */
export type EmailStatsOut = {
  sent_today: number;
  failed_today: number;
  skipped_today: number;
  queued_now: number;
  backend: string;
  provider_daily_cap: number | null;
  cap_note: string | null;
};

/** A recording as the operations screen needs it: what broke, and whose. */
export type PipelineRecordingOut = {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_reason: string | null;
  lecture_title: string | null;
  chapter_name: string | null;
  teacher_name: string | null;
  subject_name: string | null;
  school_id: number | null;
  school_name: string | null;
  uploaded_at: string;
  processed_at: string | null;
  /** Time in the current state. 4 minutes of "processing" is work; 90 is death. */
  minutes_in_state: number;
};

export type HealthComponent = {
  key: string;
  label: string;
  /** warn means running, but configured in a way that loses data or mail. */
  status: 'ok' | 'warn' | 'error';
  detail: string;
};

export type SystemHealthOut = {
  healthy: boolean;
  components: HealthComponent[];
  checked_at: string;
};

/**
 * An operational value changeable from the panel instead of by redeploy.
 *
 * `is_overridden` separates "this is what the environment says" from "somebody
 * changed this here" — indistinguishable from the value alone, and the first
 * thing you want to know when a setting is not behaving.
 */
export type SettingOut = {
  key: string;
  label: string;
  description: string;
  kind: 'string' | 'bool' | 'int';
  category: string;
  value: string | number | boolean;
  default: string | number | boolean;
  is_overridden: boolean;
};

/** Anyone with an account, found by email or name across every school. */
export type UserSearchResult = {
  id: number;
  name: string;
  email: string;
  role: 'school_admin' | 'teacher' | 'student';
  status: string | null;
  school_id: number | null;
  school_name: string | null;
  has_password: boolean;
  email_verified: boolean | null;
  created_at: string | null;
  can_resend_invite: boolean;
};

/**
 * One recorded super admin action.
 *
 * Every field is a snapshot taken at the time, not a live lookup — the actions
 * most worth auditing are the ones that delete or rename what they touched.
 */
export type AuditLogEntry = {
  id: number;
  actor_email: string;
  action: string;
  target_type: string | null;
  target_id: number | null;
  target_label: string | null;
  school_id: number | null;
  detail: string | null;
  created_at: string;
};

export type ExportResource = 'teachers' | 'classes' | 'recordings';

/** Unauthenticated maintenance state, for the banner every client shows. */
export type PublicSystemStatus = {
  maintenance_mode: boolean;
  maintenance_message: string;
};

/** Super admin setting someone else's password directly, without any email. */
export type SetPasswordPayload = {
  new_password: string;
  /** The acting super admin re-enters their own password to confirm. */
  admin_password: string;
  activate?: boolean;
};

export type CredentialUpdateOut = {
  user_type: 'school_admin' | 'teacher';
  user_id: number;
  name: string;
  email: string;
  status: string;
  activated: boolean;
  detail: string;
};

export type ClassOut = {
  id: number;
  name: string;
  section: string;
  profile_image_url: string | null;
  school_id: number;
  created_at: string;
};

export type ClassFilterTeacher = {
  id: number;
  name: string;
};

export type ClassFiltersOut = {
  classes: string[];
  sections: string[];
  teachers: ClassFilterTeacher[];
  subjects: string[];
};

export type SchoolAdminClassFilters = {
  name?: string | null;
  section?: string | null;
  teacher_id?: number | null;
  subject?: string | null;
};

export type TeacherOut = {
  id: number;
  name: string;
  email: string;
  profile_image_url: string | null;
  school_id: number | null;
  school_name: string | null;
  created_at: string;
  status: string;
  email_verified?: boolean;
  rejected_reason?: string | null;
};

export type TeacherBrief = {
  id: number;
  name: string;
  email: string;
};

export type SchoolAdminProfileOut = {
  id: number;
  name: string;
  email: string;
  status: string;
  profile_pic_url: string | null;
  school_id: number;
  school_name: string;
  school_logo_url: string | null;
  school_address: string | null;
  created_at: string;
};

export type ClassBrief = {
  id: number;
  name: string;
  section: string;
  profile_image_url?: string | null;
};

export type SubjectOut = {
  id: number;
  name: string;

  class_id: number;

  class_?: ClassBrief;

  teacher?: TeacherOut | null;

  academic_year?: string;

  status?: string;
  created_at?: string;
  teacher_id?: number | null;
  teacher_assigned_at?: string | null;
};

export type SubjectWithClassOut = {
  id: number;
  name: string;
  profile_image_url: string | null;
  class_id: number;
  school_id: number;
  teacher_id: number | null;
  class_: ClassBrief | null;
  teacher: TeacherBrief | null;
  teacher_assigned_at: string | null;
  created_at: string;
};

export type DimensionScore = {
  score: number;
  finding: string;
  evidence: string[];
};

export type ScoreBreakdown = {
  verbal_clarity: DimensionScore;
  pacing_delivery: DimensionScore;
  content_structure: DimensionScore;
  conceptual_depth: DimensionScore;
  student_engagement: DimensionScore;
  language_accessibility: DimensionScore;
  closure_recap: DimensionScore;
};

export type QuantitativeMetrics = {
  wpm_estimate: number;
  filler_words_heard: number;
  questions_asked: number;
  languages_detected: string[];
  code_switching_frequency: "none" | "low" | "medium" | "high";
  top_strengths: string[];
  priority_improvements: string[];
};

export type CurriculumCoverage = {
  covered_concepts: string[];
  missing_concepts: string[];
  coverage_percentage: number;
};

export type LectureCoverage = {
  topic?: string | null;
  sub_topic?: string | null;
  planned_concepts: string[];
  covered_concepts: string[];
  missed_concepts: string[];
  coverage_percentage: number;
  alignment_status?: "fully_aligned" | "partially_aligned" | "diverged" | null;
  notes?: string | null;
};

export type ChapterCoverage = {
  chapter_name?: string | null;
  total_concepts_count: number;
  covered_in_lecture: string[];
  remaining_chapter_concepts: string[];
  chapter_coverage_percentage: number;
};

export type AccuracyAnalysis = {
  correct_explanations: string[];
  potential_inaccuracies: string[];
};

export type ChapterInfo = {
  chapter_name: string | null;
  document_count: number;
  learning_objectives: string[];
};

export type LearningObjectiveStatus = {
  objective: string;
  status: "achieved" | "partial" | "missing";
};

export type LLMReportOut = {
  id: number;
  recording_id: number;
  overall_score: number | null;
  teaching_quality_notes: string | null;
  score_breakdown: ScoreBreakdown | null;
  quantitative_metrics: QuantitativeMetrics | null;
  curriculum_coverage: CurriculumCoverage | null;
  lecture_coverage?: LectureCoverage | null;
  chapter_coverage?: ChapterCoverage | null;
  accuracy_analysis: AccuracyAnalysis | null;
  chapter_info: ChapterInfo | null;
  learning_objectives_achievement: LearningObjectiveStatus[] | null;
  created_at: string;
};

export type RecordingStatus = "pending" | "processing" | "completed" | "failed";

export type RecordingWithReport = {
  id: number;
  subject_id: number;
  teacher_id: number;
  chapter_name: string | null;
  chapter_id: number | null;
  lecture_title: string | null;
  description: string | null;
  transcription: string | null;
  cloudinary_url: string;
  duration_seconds: number | null;
  status: RecordingStatus;
  error_reason: string | null;
  is_archived: boolean;
  uploaded_at: string;
  learning_plan_id?: number | null;
  learning_plan?: LearningPlanOut | null;
  report?: LLMReportOut | null;
};

export type StudentWithClassOut = {
  id: number;
  name: string;
  email: string;
  profile_image_url: string | null;
  mobile_number: string | null;
  class_id: number;
  class_name: string;
  created_at: string;
};

export type StudentOut = {
  id: number;
  name: string;
  email: string;
  mobile_number: string | null;
  school_id: number;
  class_id: number;
  created_at: string;
};

export type StudentProfileOut = {
  id: number;
  name: string;
  email: string;
  profile_image_url: string | null;
  mobile_number: string | null;
  school_id: number;
  school_name: string;
  class_id: number;
  class_name: string;
  created_at: string;
};

export type ChapterOut = {
  id: number;
  subject_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  document_count: number;
  ai_status?: TeacherDashboardStatus | null;
  average_score?: number | null;
};

export type ChapterCreatePayload = {
  name: string;
  description?: string | null;
};

export type ChapterUpdatePayload = {
  name?: string | null;
  description?: string | null;
};

export type ChapterDocumentOut = {
  id: number;
  chapter_id: number;
  file_name: string;
  storage_url: string;
  file_type: string;
  processing_status: string;
  uploaded_at: string;
};

export type ChapterKnowledgeOut = {
  chapter_id: number;
  chapter_summary: string;
  learning_objectives: string[];
  key_concepts: string[];
  must_cover_topics: string[];
  common_misconceptions: string[];
  generated_at: string;
};

export type LearningPlanOut = {
  id: number;
  chapter_id: number;
  date: string | null;
  topic_name: string;
  sub_topic: string;
  classwork_activities: string | null;
  assessment_task: string | null;
  teaching_aids: string | null;
  learning_outcomes: string | null;
  created_at: string;
  updated_at: string;
};

export type LearningPlanCreatePayload = {
  date?: string | null;
  topic_name: string;
  sub_topic: string;
  classwork_activities?: string | null;
  assessment_task?: string | null;
  teaching_aids?: string | null;
  learning_outcomes?: string | null;
};

export type SchoolDashboardOverview = {
  total_teachers: number;
  total_students: number;
  total_classes: number;
  total_subjects: number;
  total_recordings: number;
  pending_reports: number;
};

export type SchoolAnalytics = {
  overall_score: number;
  engagement_score: number;
  confidence_score: number;
  clarity_score: number;
  fluency_score: number;
  pace_score: number;
  curriculum_coverage: number;
  accuracy_score: number;
};

export type TeacherRankingItem = {
  teacher_id: number;
  teacher_name: string;
  total_lectures: number;
  overall_score: number;
};

export type TeacherRanking = {
  teachers: TeacherRankingItem[];
};

export type RecentActivityItem = {
  recording_id: number;
  teacher_name: string;
  lecture_title: string | null;
  chapter_name: string | null;
  uploaded_at: string;
  status: string;
};

export type RecentActivity = {
  activities: RecentActivityItem[];
};

export type TeacherRecording = {
  id: number;

  lecture_title: string | null;

  chapter_name: string | null;

  uploaded_at: string;

  status: string;

  overall_score: number | null;

  subject_name: string;

  cloudinary_url: string;

  duration_seconds: number | null;
};

export type PlannerItemOut = {
  subject_id: number;

  class_id: number;
  class_name: string;
  section: string;

  teacher_id: number | null;
  teacher_name: string | null;

  subject_name: string;

  academic_year: string;

  chapter_count: number;

  recording_count: number;

  created_at: string;
};

export type PlannerStatistics = {
  total_chapters: number;
  total_documents: number;
  total_recordings: number;
  average_score: number | null;
};

export type PlannerChapter = {
  id: number;

  subject_id: number;

  teacher_id: number | null;

  name: string;

  document_count: number;

  recording_count: number;

  average_score: number | null;

  status: string;
};

export type PlannerSubjectDetail = {
  subject_id: number;

  subject_name: string;

  class_name: string;

  teacher_name: string | null;

  academic_year: string;

  statistics: PlannerStatistics;

  chapters: PlannerChapter[];
};

export type TeacherLookupOut = {
  exists: boolean;

  id?: number;

  name?: string;

  email: string;
};

export type ClassLookupOut = {
  exists: boolean;

  id?: number;

  name?: string;

  section?: string;
};

export type QuickAssignmentRequest = {
  teacher_email: string;
  teacher_name: string;
  temporary_password: string;

  class_name: string;
  section: string;
  subject_name: string;
};

export type QuickAssignmentResponse = {
  status: "created" | "already_assigned" | "replace_required";

  message: string;

  teacher_id: number;
  class_id: number;
  subject_id: number;

  current_teacher_name?: string;
  current_teacher_email?: string;
};

export type ReplaceAssignmentRequest = {
  teacher_id: number;
  subject_id: number;
};

export type ReplaceAssignmentResponse = {
  success: boolean;
  message: string;
};

export type TeacherDashboardStatus =
  | "No Recording"
  | "Processing"
  | "Pending"
  | "Completed"
  | "Failed";

export type TeacherDashboardSubject = {
  subject_id: number;
  subject_name: string;
  class_name: string;
  section: string;
  academic_year: string;
  student_count: number;
  recording_count: number;
  ai_status: TeacherDashboardStatus;
  average_score: number | null;
};

export type TeacherDashboardResponse = {
  subjects: TeacherDashboardSubject[];
};

// ── Timetable ──────────────────────────────────────────────────────────────

export const TIMETABLE_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DEFAULT_ACADEMIC_YEAR = "2026-27";

export type TimetableClassBrief = {
  id: number;
  name: string;
  section: string;
};

export type TimetableSubjectBrief = {
  id: number;
  name: string;
};

export type TimetableTeacherBrief = {
  id: number;
  name: string;
};

export type TimetableEntryOut = {
  id: number;
  school_id: number;
  class_id: number;
  subject_id: number;
  teacher_id: number;
  day_of_week: string; // "Monday" ... "Saturday"
  period_number: number;
  start_time: string;
  end_time: string;
  room: string | null;
  academic_year: string;
  class_: TimetableClassBrief | null;
  subject: TimetableSubjectBrief | null;
  teacher: TimetableTeacherBrief | null;
  created_at: string;
  updated_at: string;
};

export type TimetableEntryPayload = {
  class_id: number;
  subject_id: number;
  teacher_id: number;
  day_of_week: string;
  period_number: number;
  start_time: string;
  end_time: string;
  room?: string | null;
  academic_year?: string;
};

export type TimetableImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

