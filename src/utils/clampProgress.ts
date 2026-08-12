/** Clamps a progress value to the 0-100 range used everywhere a task's
 * progress is displayed or computed (screen and export alike). */
export function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, value));
}
