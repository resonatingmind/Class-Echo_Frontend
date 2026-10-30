import { TeacherStatus } from '../types/api';

/** How a teacher is doing against their own past, for the school admin. Never a rank. */
export const TEACHER_STATUS: Record<TeacherStatus | 'none', { label: string; bg: string; fg: string }> = {
  improving: { label: 'Improving', bg: '#DCFCE7', fg: '#166534' },
  steady: { label: 'Steady', bg: '#F1F3F4', fg: '#3C4043' },
  needs_support: { label: 'Needs support', bg: '#FEF3C7', fg: '#92400E' },
  none: { label: 'Not enough lectures yet', bg: '#F1F3F4', fg: '#5F6368' },
};

export const statusOf = (status: TeacherStatus | null | undefined) => TEACHER_STATUS[status ?? 'none'];
