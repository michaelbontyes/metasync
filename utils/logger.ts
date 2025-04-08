/**
 * Simple logger utility to enable/disable logging throughout the application
 */

// Set to false to disable all logging
const ENABLE_LOGGING = true;

/**
 * Log messages to the console if logging is enabled
 */
export function log(...args: any[]): void {
  if (ENABLE_LOGGING) {
    console.log('[MetaSync]', ...args);
  }
}

/**
 * Log errors to the console if logging is enabled
 */
export function logError(...args: any[]): void {
  if (ENABLE_LOGGING) {
    console.error('[MetaSync Error]', ...args);
  }
}

/**
 * Log warnings to the console if logging is enabled
 */
export function logWarning(...args: any[]): void {
  if (ENABLE_LOGGING) {
    console.warn('[MetaSync Warning]', ...args);
  }
}
