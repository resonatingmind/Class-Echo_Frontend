import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { markClassBriefOpened, registerDeviceToken, removeDeviceToken } from './api';

/** Must match the channelId the server sends (class_reminder_service). */
export const CLASS_REMINDER_CHANNEL = 'class-reminders';

/** What the server puts in a class reminder's data. */
type ClassReminderData = { type: 'class_brief'; timetable_entry_id: number; on: string };

// The phone registered by this app session, so sign-out can stop its reminders.
let registered: { apiToken: string; pushToken: string } | null = null;

// A reminder arriving while the app is open still shows as a banner.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Ask for notification permission and register this phone for reminders about
 * 10 minutes before each timetabled class. Phones only: web has no Expo push,
 * and simulators cannot receive it. Never throws; reminders are optional.
 */
export async function registerForClassReminders(apiToken: string): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CLASS_REMINDER_CHANNEL, {
        name: 'Class reminders',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerDeviceToken(apiToken, {
      token: pushToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    registered = { apiToken, pushToken };
  } catch {
    // No reminders on this phone; everything else works as before.
  }
}

/** Stop reminders on this phone. Called on sign-out, best effort. */
export async function forgetClassReminders(): Promise<void> {
  const current = registered;
  registered = null;
  if (!current) return;
  try {
    await removeDeviceToken(current.apiToken, current.pushToken);
  } catch {
    // The server drops tokens Expo reports as gone anyway.
  }
}

function reminderData(response: Notifications.NotificationResponse | null): ClassReminderData | null {
  const data = response?.notification.request.content.data as Partial<ClassReminderData> | undefined;
  return data?.type === 'class_brief' && typeof data.timetable_entry_id === 'number' && data.on
    ? (data as ClassReminderData)
    : null;
}

/**
 * Calls onOpen when the teacher taps a class reminder, including the tap that
 * launched the app. The open is counted as a push open before onOpen runs, so
 * the dashboard's own count of the same brief is the duplicate that is ignored.
 */
export function listenForReminderTaps(apiToken: string, onOpen: () => void): () => void {
  if (Platform.OS === 'web') return () => {};
  let handled: string | null = null;
  const handle = (response: Notifications.NotificationResponse | null) => {
    const data = reminderData(response);
    if (!data || handled === response!.notification.request.identifier) return;
    handled = response!.notification.request.identifier;
    void markClassBriefOpened(apiToken, data.timetable_entry_id, data.on, 'push').finally(onOpen);
  };
  void Notifications.getLastNotificationResponseAsync().then(handle);
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
