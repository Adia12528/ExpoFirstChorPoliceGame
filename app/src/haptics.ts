import * as Haptics from 'expo-haptics';

export type Buzz =
  | 'heavy'
  | 'medium'
  | 'light'
  | 'success'
  | 'error'
  | 'warning'
  | 'loot'
  | 'arrest'
  | 'escape'
  | 'radarPing'
  | 'countdown';

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

      // Crisp double-tap for collecting loot
      case 'loot':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }, 90);
        return;

      // Heavy double slam for successful arrest
      case 'arrest':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        }, 120);
        return;

      // Swift double light tap when freeing an ally or smoke bomb escape
      case 'escape':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }, 100);
        return;

      // Subtle sonar heartbeat tick
      case 'radarPing':
        return void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      // Tick for 3-2-1 match countdown
      case 'countdown':
        return void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  } catch {
    // haptics unsupported (simulator/web)
  }
}
