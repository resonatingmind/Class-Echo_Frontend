import { LLMReportOut } from '../types/api';

/**
 * One line that tells a teacher what a finished report says, for lists and the
 * dashboard: the top strength, or the overall note when there is none. Callers
 * clip it to one line, so the whole sentence is returned.
 */
export function reportHighlight(report: LLMReportOut | null | undefined): string | null {
  const strength = report?.quantitative_metrics?.top_strengths?.[0]?.trim();
  if (strength) return `Went well: ${strength}`;
  const note = report?.teaching_quality_notes?.trim();
  return note || null;
}

/** Status words a teacher reads in lists, including the processing step when known. */
export function recordingStatusLabel(
  status: string,
  step?: 'transcribing' | 'analysing' | null,
): string {
  switch (status) {
    case 'completed': return 'Report ready';
    case 'processing': return step === 'transcribing' ? 'Transcribing' : 'Analysing';
    case 'pending': return 'Queued';
    case 'failed': return 'Needs attention';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
