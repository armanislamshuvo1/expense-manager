import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const REMINDER_NOTIFICATION_ID = 1001;

/**
 * Requests permission for local notifications across Native and Web
 */
export async function requestReminderPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (err) {
      console.warn('Failed to request native notification permissions:', err);
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.warn('Failed to request web notification permission:', err);
      return false;
    }
  }

  return false;
}

/**
 * Schedules a daily recurring reminder notification
 * @param {string} timeStr - Time in "HH:mm" 24h format (e.g. "20:00")
 */
export async function scheduleDailyReminder(timeStr = '20:00') {
  const [hourStr, minuteStr] = (timeStr || '20:00').split(':');
  const hour = parseInt(hourStr, 10) || 20;
  const minute = parseInt(minuteStr, 10) || 0;

  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Ensure permission is granted
      const check = await LocalNotifications.checkPermissions();
      if (check.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return false;
      }

      // 2. Create notification channel for Android 8+
      try {
        await LocalNotifications.createChannel({
          id: 'nexus_daily_reminders',
          name: 'Daily Expense Reminders',
          description: 'Daily alerts reminding you to log your expenses and income',
          importance: 4,
          visibility: 1,
          vibration: true
        });
      } catch (_channelErr) {
        // Channel may already exist
      }

      // 3. Cancel any existing reminder first
      await LocalNotifications.cancel({
        notifications: [{ id: REMINDER_NOTIFICATION_ID }]
      });

      // 4. Schedule daily recurring notification at specified time
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'NexusWealth Expense Log',
            body: "Time to log today's expenses and track your net worth!",
            id: REMINDER_NOTIFICATION_ID,
            channelId: 'nexus_daily_reminders',
            schedule: {
              on: {
                hour,
                minute
              },
              allowWhileIdle: true
            },
            smallIcon: 'ic_stat_icon',
            actionTypeId: ''
          }
        ]
      });

      return true;
    } catch (err) {
      console.error('Error scheduling native local notification:', err);
      return false;
    }
  }

  // Web fallback: Schedule in-session check
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    return true;
  }

  return false;
}

/**
 * Cancels any scheduled daily reminder notification
 */
export async function cancelDailyReminder() {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: REMINDER_NOTIFICATION_ID }]
      });
      return true;
    } catch (err) {
      console.warn('Error cancelling native local notification:', err);
      return false;
    }
  }
  return true;
}

/**
 * Synchronizes reminder status based on user settings
 */
export async function syncReminderSchedule(settings = {}) {
  if (settings.alarmEnabled) {
    await scheduleDailyReminder(settings.alarmTime || '20:00');
  } else {
    await cancelDailyReminder();
  }
}
