import { DIMENSION_LABELS } from './reportFindings';
import { Milestone } from '../types/api';

type MilestoneText = { title: string; detail: string; icon: string };

/** What a milestone says, in a grown-up tone. Keys come from milestone_service on the server. */
export function describeMilestone(m: Milestone): MilestoneText {
  const [kind] = m.key.split(':');
  switch (kind) {
    case 'first_recording':
      return { title: 'First lecture recorded', detail: 'The start of your record.', icon: 'mic-outline' };
    case 'ten_lectures':
      return { title: '10 lectures', detail: 'Ten lectures recorded and reviewed.', icon: 'albums-outline' };
    case 'streak_4_weeks':
      return { title: '4-week streak', detail: 'Four teaching weeks in a row.', icon: 'flame-outline' };
    case 'focus_achieved': {
      const area = m.meta.area ? DIMENSION_LABELS[m.meta.area] ?? m.meta.area : 'your focus';
      return { title: 'Focus achieved', detail: `${area} improved in most of your recent lectures.`, icon: 'flag-outline' };
    }
    case 'best_engagement':
      return {
        title: 'Best engagement yet',
        detail: m.meta.score != null ? `Student engagement ${m.meta.score}/${m.meta.max}.` : 'Your highest student engagement.',
        icon: 'people-outline',
      };
    case 'chapter_covered':
      return {
        title: 'Every key concept covered',
        detail: m.meta.chapter ? `All must-cover concepts in ${m.meta.chapter}.` : 'All must-cover concepts in a chapter.',
        icon: 'checkmark-done-outline',
      };
    case 'five_self_ratings':
      return { title: '5 self-ratings', detail: 'You reflected before five reports.', icon: 'create-outline' };
    case 'self_match_3':
      return {
        title: 'Spot on, three times',
        detail: 'Your own view matched the report three lectures in a row.',
        icon: 'eye-outline',
      };
    default:
      return { title: 'Milestone', detail: '', icon: 'ribbon-outline' };
  }
}
