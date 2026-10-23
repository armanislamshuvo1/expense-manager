import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = () => Capacitor.isNativePlatform();

/**
 * Trigger subtle selection vibration (e.g., bottom nav tab switch, picker change)
 */
export async function hapticSelection() {
  if (!isNative()) return;
  try {
    await Haptics.selectionChanged();
  } catch {
    // Graceful no-op if unsupported on device
  }
}

/**
 * Trigger light tactile feedback on standard button tap
 */
export async function hapticTap() {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Graceful no-op
  }
}

/**
 * Trigger medium tactile feedback for impactful actions (e.g. submit, quick log)
 */
export async function hapticMedium() {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // Graceful no-op
  }
}

/**
 * Trigger success notification pattern (e.g. transaction saved)
 */
export async function hapticSuccess() {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Graceful no-op
  }
}

/**
 * Trigger warning or error notification pattern (e.g. deletion, validation error)
 */
export async function hapticWarning() {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    // Graceful no-op
  }
}
