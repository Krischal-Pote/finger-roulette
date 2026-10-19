import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

const ANDROID_API =
  Platform.OS === 'android' && typeof Platform.Version === 'number'
    ? Platform.Version
    : 0;

const CONFIRM_API = 30;
const SEGMENT_TICK_API = 34;

function report(scope: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[haptics] ${scope} failed`, error);
  }
}

async function systemAndroid(type: Haptics.AndroidHaptics): Promise<boolean> {
  if (ANDROID_API === 0) {
    return false;
  }
  try {
    await Haptics.performAndroidHapticsAsync(type);
    return true;
  } catch (error) {
    report(`android:${type}`, error);
    return false;
  }
}


function androidBuzz(pattern: number | number[]): void {
  try {
    Vibration.vibrate(pattern);
  } catch (error) {
    report('android:vibrate', error);
  }
}

function fire(scope: string, run: () => Promise<void>): void {
  run().catch((error) => report(scope, error));
}

/** A solid buzz when the spin starts. */
export function hapticImpact(): void {
  fire('impact', async () => {
    if (Platform.OS === 'android') {
      androidBuzz(30);
      if (ANDROID_API >= CONFIRM_API) {
        await systemAndroid(Haptics.AndroidHaptics.Confirm);
      }
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });
}

export function hapticTick(): void {
  fire('tick', async () => {
    if (Platform.OS === 'android') {
      androidBuzz(12);
      if (ANDROID_API >= SEGMENT_TICK_API) {
        await systemAndroid(Haptics.AndroidHaptics.Segment_Tick);
      }
      return;
    }
    await Haptics.selectionAsync();
  });
}

export function hapticResult(safe: boolean): void {
  const type = safe
    ? Haptics.NotificationFeedbackType.Success
    : Haptics.NotificationFeedbackType.Error;

  fire('result', async () => {
    if (Platform.OS === 'android') {
      androidBuzz(safe ? [0, 45, 70, 90] : [0, 140, 90, 140, 90, 260]);
      if (ANDROID_API >= CONFIRM_API) {
        await systemAndroid(
          safe
            ? Haptics.AndroidHaptics.Confirm
            : Haptics.AndroidHaptics.Reject,
        );
      }
      return;
    }
    await Haptics.notificationAsync(type);
  });
}
