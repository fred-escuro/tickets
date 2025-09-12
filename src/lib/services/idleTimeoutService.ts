/**
 * Idle Timeout Service
 * Handles user activity detection and session management
 */

import { API_ENDPOINTS } from '@/lib/api';
import { apiClient } from '@/lib/api';

export interface IdleTimeoutConfig {
  idleTimeoutMs: number; // Time before user is considered idle (default: 30 minutes)
  warningTimeoutMs: number; // Time before showing warning (default: 25 minutes)
  absoluteTimeoutMs: number; // Maximum session duration (default: 8 hours)
  refreshIntervalMs: number; // How often to refresh session (default: 5 minutes)
}

export interface SessionStatus {
  isActive: boolean;
  timeUntilIdle: number;
  timeUntilAbsoluteExpiry: number;
  lastActivity: number;
  sessionStart: number;
}

class IdleTimeoutService {
  private config: IdleTimeoutConfig;
  private lastActivity: number = Date.now();
  private sessionStart: number = Date.now();
  private idleTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private warningCallback: (() => void) | null = null;
  private logoutCallback: (() => void) | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // Default configuration
    this.config = {
      idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
      warningTimeoutMs: 25 * 60 * 1000, // 25 minutes (5 minutes before idle)
      absoluteTimeoutMs: 8 * 60 * 60 * 1000, // 8 hours
      refreshIntervalMs: 5 * 60 * 1000, // 5 minutes
    };
  }

  /**
   * Initialize the idle timeout service
   */
  initialize(config?: Partial<IdleTimeoutConfig>): void {
    if (this.isInitialized) {
      this.cleanup();
    }

    // Update config if provided
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.lastActivity = Date.now();
    this.sessionStart = Date.now();
    this.isInitialized = true;

    // Set up event listeners for user activity
    this.setupActivityListeners();

    // Start timers
    this.startTimers();
  }

  /**
   * Set callbacks for warning and logout
   */
  setCallbacks(callbacks: {
    onWarning?: () => void;
    onLogout?: () => void;
  }): void {
    this.warningCallback = callbacks.onWarning || null;
    this.logoutCallback = callbacks.onLogout || null;
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    this.lastActivity = Date.now();
    this.restartTimers();
  }

  /**
   * Get current session status
   */
  getSessionStatus(): SessionStatus {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    const timeSinceSessionStart = now - this.sessionStart;

    return {
      isActive: timeSinceLastActivity < this.config.idleTimeoutMs,
      timeUntilIdle: Math.max(0, this.config.idleTimeoutMs - timeSinceLastActivity),
      timeUntilAbsoluteExpiry: Math.max(0, this.config.absoluteTimeoutMs - timeSinceSessionStart),
      lastActivity: this.lastActivity,
      sessionStart: this.sessionStart,
    };
  }

  /**
   * Refresh session on server
   */
  private async refreshSession(): Promise<boolean> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_SESSION);
      
      if (response.success && response.data?.token) {
        // Update stored token
        localStorage.setItem('auth-token', response.data.token);
        
        // Update session timestamps from token
        this.updateSessionTimestamps(response.data.token);
        
        console.log('Session refreshed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return false;
    }
  }

  /**
   * Update session timestamps from JWT token
   */
  private updateSessionTimestamps(token: string): void {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.sessionStart) {
        this.sessionStart = payload.sessionStart;
      }
      if (payload.lastActivity) {
        this.lastActivity = payload.lastActivity;
      }
    } catch (error) {
      console.error('Failed to parse token for session timestamps:', error);
    }
  }

  /**
   * Set up event listeners for user activity
   */
  private setupActivityListeners(): void {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus',
      'blur',
    ];

    const throttledUpdateActivity = this.throttle(() => {
      this.updateActivity();
    }, 1000); // Throttle to once per second

    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, true);
    });

    // Also listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateActivity();
      }
    });
  }

  /**
   * Start all timers
   */
  private startTimers(): void {
    this.startIdleTimer();
    this.startWarningTimer();
    this.startRefreshTimer();
  }

  /**
   * Restart all timers
   */
  private restartTimers(): void {
    this.clearTimers();
    this.startTimers();
  }

  /**
   * Start idle timer
   */
  private startIdleTimer(): void {
    this.idleTimer = setTimeout(() => {
      console.log('User session expired due to inactivity');
      this.handleLogout();
    }, this.config.idleTimeoutMs);
  }

  /**
   * Start warning timer
   */
  private startWarningTimer(): void {
    this.warningTimer = setTimeout(() => {
      console.log('User session warning - will expire soon');
      if (this.warningCallback) {
        this.warningCallback();
      }
    }, this.config.warningTimeoutMs);
  }

  /**
   * Start refresh timer
   */
  private startRefreshTimer(): void {
    this.refreshTimer = setInterval(async () => {
      const success = await this.refreshSession();
      if (!success) {
        console.log('Session refresh failed, logging out');
        this.handleLogout();
      }
    }, this.config.refreshIntervalMs);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Handle logout
   */
  private handleLogout(): void {
    if (this.logoutCallback) {
      this.logoutCallback();
    }
  }

  /**
   * Throttle function calls
   */
  private throttle(func: () => void, delay: number): () => void {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecTime = 0;

    return () => {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func();
        lastExecTime = currentTime;
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          func();
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    this.clearTimers();
    this.isInitialized = false;
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const idleTimeoutService = new IdleTimeoutService();
