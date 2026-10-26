import {
  FeedbackReason,
  FeedbackTarget,
  LLMReportOut,
  ReportFeedback,
  ReportImprovement,
  ReportStrength,
} from '../types/api';

/**
 * Strengths as structured findings. Backends that predate rubric 2 only send
 * plain strings in quantitative_metrics, which are lifted into the same shape.
 */
export function reportStrengths(report: LLMReportOut | null | undefined): ReportStrength[] {
  if (report?.strengths?.length) return report.strengths.slice(0, 2);
  return (report?.quantitative_metrics?.top_strengths ?? [])
    .filter(Boolean)
    .slice(0, 2)
    .map((text) => ({ area: null, text, evidence: '' }));
}

/** Improvements with the focus first. Same fallback as reportStrengths. */
export function reportImprovements(report: LLMReportOut | null | undefined): ReportImprovement[] {
  if (report?.improvements?.length) return report.improvements.slice(0, 3);
  return (report?.quantitative_metrics?.priority_improvements ?? [])
    .filter(Boolean)
    .slice(0, 3)
    .map((observation, i) => ({ area: null, observation, try_this: '', why: '', is_focus: i === 0 }));
}

export function findFeedback(
  feedback: ReportFeedback[] | null | undefined,
  targetType: FeedbackTarget,
  targetKey: string,
): ReportFeedback | undefined {
  return feedback?.find((f) => f.target_type === targetType && f.target_key === targetKey);
}

/** Reason chips in the order the disagree sheet shows them. */
export const FEEDBACK_REASONS: { key: FeedbackReason; label: string }[] = [
  { key: 'score_too_low', label: 'Score feels too low' },
  { key: 'score_too_high', label: 'Score feels too high' },
  { key: 'quote_out_of_context', label: 'Quote is out of context' },
  { key: 'transcript_wrong', label: 'Transcript is wrong' },
  { key: 'class_type', label: "Doesn't fit this type of class (lab / test / revision)" },
  { key: 'student_context', label: "Students' situation not considered" },
  { key: 'other', label: 'Other' },
];

export function reasonLabel(reason: FeedbackReason): string {
  return FEEDBACK_REASONS.find((r) => r.key === reason)?.label ?? reason;
}

export const DIMENSION_LABELS: Record<string, string> = {
  verbal_clarity: 'Verbal Clarity',
  pacing_delivery: 'Pacing & Delivery',
  content_structure: 'Content Structure',
  conceptual_depth: 'Conceptual Depth',
  student_engagement: 'Student Engagement',
  language_accessibility: 'Language Accessibility',
  closure_recap: 'Closure & Recap',
};
