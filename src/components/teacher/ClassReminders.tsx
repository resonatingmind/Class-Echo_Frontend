import { RefObject, useEffect } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import { listenForReminderTaps, registerForClassReminders } from '../../lib/classReminders';

/**
 * Registers a signed-in teacher's phone for class reminders and opens the
 * dashboard, where the brief is, when one is tapped. Renders nothing.
 */
export function ClassReminders({ navigationRef }: { navigationRef: RefObject<NavigationContainerRef<any> | null> }) {
  const { session } = useAuth();
  const token = session?.role === 'teacher' && session.status === 'active' ? session.token : null;

  useEffect(() => {
    if (token) void registerForClassReminders(token);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    return listenForReminderTaps(token, () => {
      navigationRef.current?.navigate('TeacherTabs', { screen: 'TeacherDashboard' });
    });
  }, [token, navigationRef]);

  return null;
}
