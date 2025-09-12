/**
 * Utility functions for session management and timeout handling
 */

/**
 * Parse time string to milliseconds
 * Supports formats like: 30m, 2h, 1d, 8h, etc.
 */
export function parseTimeToMs(timeString: string): number {
  const timeRegex = /^(\d+)([smhd])$/;
  const match = timeString.match(timeRegex);
  
  if (!match) {
    throw new Error(`Invalid time format: ${timeString}. Use format like 30m, 2h, 1d`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error(`Unsupported time unit: ${unit}`);
  }
}

/**
 * Check if session has expired based on idle timeout
 */
export function isSessionIdleExpired(lastActivity: number, idleTimeoutMs: number): boolean {
  const now = Date.now();
  return (now - lastActivity) > idleTimeoutMs;
}

/**
 * Check if session has expired based on absolute timeout
 */
export function isSessionAbsoluteExpired(sessionStart: number, absoluteTimeoutMs: number): boolean {
  const now = Date.now();
  return (now - sessionStart) > absoluteTimeoutMs;
}

/**
 * Get session timeout configuration from environment variables
 */
export function getSessionTimeouts() {
  const idleTimeout = process.env.SESSION_IDLE_TIMEOUT || '30m';
  const absoluteTimeout = process.env.SESSION_ABSOLUTE_TIMEOUT || '8h';
  
  return {
    idleTimeoutMs: parseTimeToMs(idleTimeout),
    absoluteTimeoutMs: parseTimeToMs(absoluteTimeout),
    idleTimeoutString: idleTimeout,
    absoluteTimeoutString: absoluteTimeout
  };
}
