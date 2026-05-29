/**
 * Device and layout context utilities.
 *
 * Determines:
 * - Whether the device is mobile (touch-primary) or desktop (mouse-primary)
 * - Whether the layout should be portrait or landscape
 *
 * Layout rules:
 * - Mobile devices: always portrait
 * - Desktop: portrait only if height:width ratio exceeds PORTRAIT_THRESHOLD
 */

export type InputMode = 'touch' | 'mouse';
export type LayoutMode = 'portrait' | 'landscape';

/**
 * On desktop, the window must be taller than this ratio (height/width)
 * before switching to portrait layout. Default: 1.2 (20% taller than wide).
 */
const PORTRAIT_THRESHOLD = 1.2;

// ── Debug flags ─────────────────────────────────────────────────────────────
/** Set VITE_DEBUG_TOUCH=true in .env to force touch mode on desktop for testing. */
export const DEBUG_FORCE_TOUCH = import.meta.env.VITE_DEBUG_TOUCH === 'true';

/** Set VITE_DEBUG=true in .env to enable debug buttons and logging. */
export const DEBUG = import.meta.env.VITE_DEBUG === 'true';
console.log('[ENV] VITE_DEBUG =', import.meta.env.VITE_DEBUG, '| DEBUG =', DEBUG);

/** Detect if the device is primarily touch-based (mobile/tablet). */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  // Check for touch capability + mobile user agent
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const mobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

  return hasTouch && mobileUA;
}

/** Get the current input mode. */
export function getInputMode(): InputMode {
  if (DEBUG_FORCE_TOUCH) return 'touch';
  return isMobileDevice() ? 'touch' : 'mouse';
}

/**
 * Determine the layout mode based on device type and window dimensions.
 *
 * @param width  Current canvas/window width
 * @param height Current canvas/window height
 */
export function getLayoutMode(width: number, height: number): LayoutMode {
  if (isMobileDevice()) {
    // Mobile: always portrait
    return 'portrait';
  }

  // Desktop: portrait only if height/width exceeds threshold
  const ratio = height / width;
  return ratio >= PORTRAIT_THRESHOLD ? 'portrait' : 'landscape';
}

/**
 * Returns all context info at once.
 */
export function getDeviceContext(width: number, height: number) {
  return {
    isMobile: isMobileDevice(),
    inputMode: getInputMode(),
    layoutMode: getLayoutMode(width, height),
  };
}
