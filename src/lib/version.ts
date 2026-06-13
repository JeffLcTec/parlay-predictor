/** App identity constants. Single source of truth for name/version display. */
export const APP_NAME = 'Parlay Predictor';
export const APP_VERSION = '0.1.0';

/** Human-readable banner, e.g. "Parlay Predictor v0.1.0". */
export function appBanner(): string {
  return `${APP_NAME} v${APP_VERSION}`;
}
