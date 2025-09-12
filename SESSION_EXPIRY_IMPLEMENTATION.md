# Session Expiry Implementation

## Overview

This document describes the implementation of automatic session expiry functionality for the ticketing system. The system now automatically logs out users after a period of inactivity and provides a warning dialog to allow users to extend their session.

## Features Implemented

### 1. Backend Session Management

#### New Files Created:
- `backend/src/utils/sessionUtils.ts` - Utility functions for session timeout handling
- Updated `backend/src/middleware/auth.ts` - Enhanced authentication middleware with session expiry checks
- Updated `backend/src/routes/auth.ts` - Added session refresh endpoint and updated JWT token generation

#### Key Features:
- **Session Timestamps**: JWT tokens now include `sessionStart` and `lastActivity` timestamps
- **Idle Timeout**: Configurable timeout for user inactivity (default: 30 minutes)
- **Absolute Timeout**: Maximum session duration (default: 8 hours)
- **Session Refresh Endpoint**: `/api/auth/refresh-session` to update lastActivity timestamp
- **Automatic Validation**: Middleware checks session expiry on every authenticated request

#### Environment Variables:
```bash
SESSION_IDLE_TIMEOUT=30m    # Time before idle timeout
SESSION_ABSOLUTE_TIMEOUT=8h # Maximum session duration
```

### 2. Frontend Session Management

#### New Files Created:
- `src/lib/services/idleTimeoutService.ts` - Comprehensive idle timeout detection service
- `src/components/SessionWarningDialog.tsx` - Interactive warning dialog component
- `src/components/SessionManager.tsx` - Session management coordinator component

#### Key Features:
- **Activity Detection**: Tracks mouse, keyboard, scroll, touch, and focus events
- **Throttled Updates**: Activity updates are throttled to once per second for performance
- **Warning System**: Shows dialog 5 minutes before idle timeout
- **Automatic Refresh**: Sessions refresh every 5 minutes during activity
- **Graceful Logout**: Automatic logout with user notification

#### Updated Files:
- `src/lib/services/authService.ts` - Added session management methods
- `src/components/LoginDialog.tsx` - Initialize session management on login
- `src/components/Profile.tsx` - Cleanup session management on logout
- `src/App.tsx` - Initialize session management on app startup
- `src/lib/api.ts` - Added session refresh endpoint

## How It Works

### 1. Login Process
1. User logs in successfully
2. JWT token is generated with `sessionStart` and `lastActivity` timestamps
3. Frontend initializes idle timeout service
4. Activity listeners are set up to track user interaction

### 2. Activity Tracking
1. User interactions (mouse, keyboard, scroll, etc.) are detected
2. `lastActivity` timestamp is updated (throttled to once per second)
3. Session refresh endpoint is called every 5 minutes during activity
4. Server updates JWT token with new `lastActivity` timestamp

### 3. Session Expiry Process
1. **Warning Phase** (25 minutes of inactivity):
   - Warning dialog appears with countdown timer
   - User can click "Extend Session" to continue
   - User can click "Logout Now" to logout immediately

2. **Expiry Phase** (30 minutes of inactivity):
   - User is automatically logged out
   - All session data is cleared
   - User is redirected to login page

3. **Absolute Timeout** (8 hours total session time):
   - User is logged out regardless of activity
   - Session cannot be extended beyond this limit

### 4. Server-Side Validation
1. Every authenticated request checks session expiry
2. If `lastActivity` is older than idle timeout → return 401 with `SESSION_IDLE_EXPIRED`
3. If `sessionStart` is older than absolute timeout → return 401 with `SESSION_ABSOLUTE_EXPIRED`
4. Frontend handles these errors and triggers logout

## Configuration

### Time Format Support
The system supports flexible time formats:
- `30s` - 30 seconds
- `5m` - 5 minutes
- `2h` - 2 hours
- `1d` - 1 day

### Default Settings
```bash
SESSION_IDLE_TIMEOUT=30m      # 30 minutes of inactivity
SESSION_ABSOLUTE_TIMEOUT=8h   # 8 hours maximum session
```

### Customization Examples
```bash
# More restrictive (15 minutes idle, 4 hours max)
SESSION_IDLE_TIMEOUT=15m
SESSION_ABSOLUTE_TIMEOUT=4h

# More permissive (1 hour idle, 12 hours max)
SESSION_IDLE_TIMEOUT=1h
SESSION_ABSOLUTE_TIMEOUT=12h
```

## Security Benefits

1. **Automatic Logout**: Prevents unauthorized access from unattended sessions
2. **Configurable Timeouts**: Organizations can set appropriate security policies
3. **Activity-Based**: Only active users maintain their sessions
4. **Graceful Handling**: Users are warned before logout and can extend sessions
5. **Server Validation**: Session expiry is validated on every request

## User Experience

1. **Transparent Operation**: Session management works in the background
2. **Warning System**: Users are notified before session expiry
3. **Easy Extension**: One-click session extension
4. **Clear Feedback**: Toast notifications for session events
5. **Smooth Logout**: Automatic logout with clear messaging

## Testing

To test the session expiry functionality:

1. **Start the application**:
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend
   npm run dev
   ```

2. **Login to the system**

3. **Test idle timeout**:
   - Wait 25 minutes to see the warning dialog
   - Wait 30 minutes to be automatically logged out

4. **Test session extension**:
   - When warning appears, click "Extend Session"
   - Verify session continues normally

5. **Test activity detection**:
   - Move mouse or type occasionally
   - Verify session doesn't expire

## Troubleshooting

### Common Issues

1. **Session expires too quickly**:
   - Check `SESSION_IDLE_TIMEOUT` environment variable
   - Verify activity detection is working (check browser console)

2. **Warning dialog doesn't appear**:
   - Check browser console for errors
   - Verify `SessionManager` component is rendered in App.tsx

3. **Session refresh fails**:
   - Check network tab for API errors
   - Verify `/api/auth/refresh-session` endpoint is accessible

### Debug Information

The system logs session events to the browser console:
- Session initialization
- Activity updates
- Warning triggers
- Session expiry
- Logout events

## Future Enhancements

Potential improvements for future versions:

1. **Remember Me**: Option to extend absolute timeout for trusted devices
2. **Session Analytics**: Track session patterns and optimize timeouts
3. **Multi-tab Sync**: Synchronize session state across browser tabs
4. **Custom Warning Times**: Allow users to customize warning timing
5. **Session History**: Log session events for audit purposes

## Conclusion

The session expiry implementation provides a robust, user-friendly solution for automatic session management. It balances security requirements with user experience, ensuring that inactive sessions are properly terminated while providing clear warnings and easy extension options for active users.
