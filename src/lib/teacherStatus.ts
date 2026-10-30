import { TeacherStatus } from '../types/api';
import { AppTheme } from '../theme/AppTheme';

/** How a teacher is doing against their own past, for the school admin. Never a rank. */
export const TEACHER_STATUS: Record<TeacherStatus | 'none', { label: string; bg: string; fg: string }> = {
  improving: { label: 'Improving', bg: AppTheme.colors.successTint, fg: '#166534' },
  steady: { label: 'Steady', bg: '#F1F3F4', fg: '#3C4043' },
  needs_support: { label: 'Needs support', bg: AppTheme.colors.warningSoft, fg: AppTheme.colors.warningStrong },
  none: { label: 'Not enough lectures yet', bg: '#F1F3F4', fg: '#5F6368' },
};

export const statusOf = (status: TeacherStatus | null | undefined) => TEACHER_STATUS[status ?? 'none'];
