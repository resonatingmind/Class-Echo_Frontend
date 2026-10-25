import { getTeacherChapters, getTeacherLearningPlans, getTeacherSubjectRecordings } from './api';
import { ChapterOut, LearningPlanOut } from '../types/api';

export type LectureSuggestion = {
  chapters: ChapterOut[];
  chapter: ChapterOut | null;
  plan: LearningPlanOut | null;
  /** 'today': the planner has an entry dated today. 'next': the next lecture not yet recorded. */
  reason: 'today' | 'next' | null;
};

/* Local calendar day, matching how the planner stores dates. */
function todayIsoDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Dated entries first, oldest first; undated ones after, in the order they were planned. */
function byPlannedOrder(a: LearningPlanOut, b: LearningPlanOut): number {
  if (a.date && b.date) return a.date.localeCompare(b.date) || a.id - b.id;
  if (a.date) return -1;
  if (b.date) return 1;
  return a.id - b.id;
}

/**
 * Guess the chapter and planner lecture for a class started from the timetable,
 * so the teacher only has to confirm it after recording:
 *   1. a planner entry dated today that has no recording yet;
 *   2. otherwise the next lecture with no recording yet, in the chapter taught most recently;
 *   3. otherwise just that chapter, for a new lecture.
 * The planner has no "done" flag, so a lecture counts as done once it has a recording.
 */
export async function suggestLecture(token: string, subjectId: number): Promise<LectureSuggestion> {
  const [chapters, recordings] = await Promise.all([
    getTeacherChapters(token, subjectId),
    getTeacherSubjectRecordings(token, subjectId).catch(() => []),
  ]);
  if (chapters.length === 0) {
    return { chapters, chapter: null, plan: null, reason: null };
  }

  const plansByChapter = new Map<number, LearningPlanOut[]>();
  const planLists = await Promise.all(
    chapters.map((c) => getTeacherLearningPlans(token, subjectId, c.id).catch(() => [] as LearningPlanOut[])),
  );
  chapters.forEach((c, i) => plansByChapter.set(c.id, planLists[i] ?? []));

  const recordedPlanIds = new Set(
    recordings.map((r) => r.learning_plan_id).filter((id): id is number => id != null),
  );
  const chapterById = (id: number | null | undefined) => chapters.find((c) => c.id === id) ?? null;

  const today = todayIsoDate();
  // An entry for today that is already recorded was an earlier class; fall through to the next one.
  const todaysPlan = planLists
    .flat()
    .filter((p) => p.date === today && !recordedPlanIds.has(p.id))
    .sort(byPlannedOrder)[0];
  if (todaysPlan) {
    return { chapters, chapter: chapterById(todaysPlan.chapter_id), plan: todaysPlan, reason: 'today' };
  }

  const latest = [...recordings]
    .filter((r) => r.chapter_id != null)
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0];
  const currentChapter = chapterById(latest?.chapter_id) ?? chapters[0]!;

  // The current chapter first, then the rest in their own order.
  const searchOrder = [currentChapter, ...chapters.filter((c) => c.id !== currentChapter.id)];
  for (const chapter of searchOrder) {
    const next = (plansByChapter.get(chapter.id) ?? [])
      .filter((p) => !recordedPlanIds.has(p.id))
      .sort(byPlannedOrder)[0];
    if (next) {
      return { chapters, chapter, plan: next, reason: 'next' };
    }
  }

  return { chapters, chapter: currentChapter, plan: null, reason: null };
}
