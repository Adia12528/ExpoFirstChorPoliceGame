import * as Haptics from 'expo-haptics';

export type Buzz = 'heavy' | 'medium' | 'light' | 'success' | 'error' | 'warning';

export function buzz(kind: Buzz) {
  try {
    switch (kind) {
      case 'heavy':
        return void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      case 'medium':
        return void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      case 'light':
        return void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      case 'success':
        return void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      case 'error':
        return void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      case 'warning':
        return void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  } catch {
    // haptics unsupported (simulator/web)
  }
}
