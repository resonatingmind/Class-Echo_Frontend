import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { getTeacherDashboard, getTeacherSubjectRecordings } from './api';

/* Faster while something is being analysed, so the badge clears soon after a report lands. */
const ACTIVE_POLL_MS = 30_000;
const IDLE_POLL_MS = 120_000;

/**
 * Number of the teacher's recordings still queued or being analysed. Stands in
 * for a push notification until those exist: the Recordings tab shows it as a badge.
 * Must be called from a component inside a navigator screen (it uses focus events).
 */
export function useProcessingCount(): number {
  const { session } = useAuth();
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  const refresh = useCallback(async () => {
    if (session?.role !== 'teacher' || !session.token) return;
    try {
      const dashboard = await getTeacherDashboard(session.token);
      // The dashboard marks a subject "Pending" while any of its recordings is
      // queued or processing, so only those subjects need their recordings fetched.
      const busy = dashboard.subjects.filter((s) => s.ai_status === 'Pending');
      const lists = await Promise.all(
        busy.map((s) => getTeacherSubjectRecordings(session.token, s.subject_id).catch(() => [])),
      );
      const next = lists
        .flat()
        .filter((r) => !r.is_archived && (r.status === 'pending' || r.status === 'processing')).length;
      countRef.current = next;
      setCount(next);
    } catch {
      // Keep the last count; a missed poll is not worth an error.
    }
  }, [session?.role, session?.token]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = async () => {
      await refresh();
      if (stopped) return;
      timer = setTimeout(tick, countRef.current > 0 ? ACTIVE_POLL_MS : IDLE_POLL_MS);
    };
    void tick();

    // Coming back to the app is when the teacher looks for the report.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [refresh]);

  // Back from recording or a report: an upload may have just been queued.
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  return count;
}
