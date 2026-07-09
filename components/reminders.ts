import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local due-date reminders. Web has no scheduled notifications, so every
 * function is a safe no-op there; on device the user is asked for permission
 * the first time a reminder gets scheduled.
 */

export function initNotifications() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Assignment reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Schedules "due tomorrow" (5 PM the day before) and "due today" (9 AM)
 * reminders for an assignment. Returns the scheduled notification ids so
 * they can be cancelled later; skips anything already in the past.
 */
export async function scheduleTaskReminders(
  assignmentName: string,
  className: string,
  dueDateRaw: string,
): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  try {
    if (!(await ensurePermission())) return [];

    const due = new Date(dueDateRaw);
    if (isNaN(due.getTime())) return [];

    const dayBefore = new Date(due);
    dayBefore.setDate(due.getDate() - 1);
    dayBefore.setHours(17, 0, 0, 0);

    const morningOf = new Date(due);
    morningOf.setHours(9, 0, 0, 0);

    const reminders: { when: Date; title: string; body: string }[] = [
      {
        when: dayBefore,
        title: `${assignmentName} is due tomorrow`,
        body: `${className} — a focus session today keeps it on track.`,
      },
      {
        when: morningOf,
        title: `${assignmentName} is due today`,
        body: `${className} — finish it before the deadline.`,
      },
    ];

    const ids: string[] = [];
    for (const reminder of reminders) {
      if (reminder.when.getTime() <= Date.now()) continue;
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: reminder.title, body: reminder.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.when,
        },
      });
      ids.push(id);
    }
    return ids;
  } catch {
    return [];
  }
}

export async function cancelTaskReminders(ids?: string[]) {
  if (Platform.OS === 'web' || !ids?.length) return;
  await Promise.all(
    ids.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
}
