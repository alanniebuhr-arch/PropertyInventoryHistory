import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_TEXT_SCALE_KEY = 'pih.appTextScaleStep';
/** Prefer new key; migrate legacy property big-text boolean. */
const LEGACY_BIG_TEXT_KEY = 'pih.propertyBigText';

/** Discrete scales: smaller ↔ default ↔ larger (matches Playing Card–style bumps). */
export const TEXT_SCALE_STEPS = [0.9, 1, 1.15, 1.3, 1.45] as const;
export const DEFAULT_TEXT_SCALE_STEP = 1; // 1.0

let cachedStep = DEFAULT_TEXT_SCALE_STEP;
let loadedFromDisk = false;

export function getAppTextScaleStep(): number {
  return cachedStep;
}

export function getAppTextScale(): number {
  return TEXT_SCALE_STEPS[cachedStep] ?? 1;
}

function clampStep(step: number): number {
  return Math.max(0, Math.min(TEXT_SCALE_STEPS.length - 1, Math.round(step)));
}

export async function loadAppTextScaleStep(): Promise<number> {
  if (loadedFromDisk) return cachedStep;
  try {
    const raw = await AsyncStorage.getItem(APP_TEXT_SCALE_KEY);
    if (raw != null && raw !== '') {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed)) {
        cachedStep = clampStep(parsed);
        loadedFromDisk = true;
        return cachedStep;
      }
    }
    const legacy = await AsyncStorage.getItem(LEGACY_BIG_TEXT_KEY);
    if (legacy === '1') {
      // Closest to previous 1.4× big text.
      cachedStep = 3;
    }
  } catch {
    // Keep default / cache.
  }
  loadedFromDisk = true;
  return cachedStep;
}

export async function setAppTextScaleStep(step: number): Promise<number> {
  cachedStep = clampStep(step);
  loadedFromDisk = true;
  try {
    await AsyncStorage.setItem(APP_TEXT_SCALE_KEY, String(cachedStep));
  } catch {
    // Memory cache still updated for this session.
  }
  return cachedStep;
}

export function canMakeTextLarger(step = cachedStep): boolean {
  return step < TEXT_SCALE_STEPS.length - 1;
}

export function canMakeTextSmaller(step = cachedStep): boolean {
  return step > 0;
}
