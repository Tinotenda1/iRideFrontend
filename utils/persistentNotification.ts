import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function showPersistentNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Drift",
      body: "Tap to return to Drift",
      sticky: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null,
  });
}

export async function clearPersistentNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function notifyRideEvent(
  title: string,
  body: string,
  options?: {
    sound?: string;
    color?: string;
  },
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: options?.sound ?? "ride_request.wav",
      color: options?.color ?? "#10B981",
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null,
  });
}
