
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
    sendLocalNotification('Strategic Comms Active', {
      body: 'LifeTrack will now deliver tactical alerts and scheduled prompts.',
      silent: true
    });
  }
  return permission;
}

export function sendLocalNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const defaultOptions: NotificationOptions = {
    icon: '/icon.png',
    badge: '/icon.png',
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

/**
 * Sends specialized notifications based on module status changes.
 */
export function notifyModuleStatus(moduleId: string, isEnabled: boolean) {
  if (!isEnabled) {
    sendLocalNotification(`${moduleId.toUpperCase()} Node Deactivated`, {
      body: `Module has been removed from active navigation.`,
      tag: 'module-status'
    });
    return;
  }

  const specializedMessages: Record<string, { title: string, body: string }> = {
    diary: {
      title: 'Memoir Protocol Initialized',
      body: 'Nightly reflection prompt scheduled for 22:00. Secured via AES-GCM.'
    },
    budget: {
      title: 'Vault Monitoring Active',
      body: 'Daily expenditure tracking enabled. Keep your variable velocity under cap.'
    },
    'craving-meter': {
      title: 'Physiological Vault Ready',
      body: 'Fuel intake and nutritional density monitoring is now active.'
    },
    learning: {
      title: 'Skill Forge Activated',
      body: 'Daily mastery goals synchronized. Precision tracking enabled.'
    },
    'future-vision': {
      title: 'Aspiration Ledger Open',
      body: 'Long-term duty and vision list is now active and encrypted.'
    }
  };

  const msg = specializedMessages[moduleId] || {
    title: `${moduleId.toUpperCase()} Module Enabled`,
    body: 'Workspace navigation updated. Tactical node is now accessible.'
  };

  sendLocalNotification(msg.title, {
    body: msg.body,
    tag: 'module-status'
  });
}
