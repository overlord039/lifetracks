/**
 * @fileOverview Utility for handling browser-level local notifications for the LifeTrack PWA.
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported in this browser.');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    // Optionally trigger a welcome notification
    sendLocalNotification('Reminders Active', {
      body: 'LifeTrack will now alert you if you forget to log your daily spending.',
      silent: true
    });
  }
  return permission;
}

export function sendLocalNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const defaultOptions: NotificationOptions = {
    icon: 'https://picsum.photos/seed/lifetrack-icon-192/192/192',
    badge: 'https://picsum.photos/seed/lifetrack-icon-192/192/192',
    tag: 'lifetrack-reminder',
    renotify: true,
  };

  // If we have a service worker, use it to show the notification (better for PWA standalone)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, { ...defaultOptions, ...options });
    });
  } else {
    // Fallback to standard Notification constructor for standard browser tabs
    try {
      new Notification(title, { ...defaultOptions, ...options });
    } catch (e) {
      console.error('Notification constructor failed, likely on mobile. SW is preferred.');
    }
  }
}
