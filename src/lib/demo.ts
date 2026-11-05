/** Shared settings for the prototype. */

/**
 * The prototype runs on a fixed "today" so deadlines look the same whenever an assessor opens it.
 * Shown in the header so nobody mistakes it for the real date.
 */
export const DEMO_TODAY = "2026-11-09";

/** Live mode is on only when a key is set and LIVE_MODE is not "off" (a kill switch in the hosting settings). */
export function liveModeAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.LIVE_MODE !== "off";
}
