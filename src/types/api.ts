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
};

export type SchoolOut = {
  id: number;
  name: string;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  admin?: SchoolAdminOut | null;
};

export type SchoolCreatePayload = {
  name: string;
  address?: string | null;
  logo_url?: string | null;
  admin_name: string;
  admin_email: string;
  admin_password: string;
};

export type ClassOut = {
  id: number;
  name: string;
  section: string;
  profile_image_url: string | null;
  school_id: number;
  created_at: string;
};

export type TeacherOut = {
  id: number;
  name: string;
  email: string;
  profile_image_url: string | null;
  school_id: number | null;
  school_name: string | null;
  created_at: string;
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
  processed_at: string | null;
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
};

export type TeacherDashboardResponse = {
  subjects: TeacherDashboardSubject[];
};