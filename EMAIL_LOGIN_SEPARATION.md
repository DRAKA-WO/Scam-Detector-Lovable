# Email Login Separation from Google OAuth

## Overview

Email/password login has been separated from Google OAuth login to allow independent debugging and testing. All email login logic is now isolated in dedicated files.

## New Files Created

### 1. `src/components/EmailAuthModal.jsx`
- **Purpose**: Dedicated component for email/password sign-in and sign-up
- **Features**:
  - Handles email/password form (sign in and sign up modes)
  - Uses `signInWithEmailPassword` and `signUpWithEmailPassword` from `emailAuth.js`
  - After success, calls `syncSessionToExtension()` (same as OAuth) so extension gets session
  - Optional full name on sign-up; handles "confirm email" flow with a message
  - Independent from Google OAuth code; easy to remove (delete file + remove button in LoginModal/SignupModal)

### 2. `src/utils/emailAuth.js`
- **Purpose**: Isolated Supabase email/password auth helpers
- **Features**:
  - `signInWithEmailPassword(email, password)` → uses `supabase.auth.signInWithPassword`
  - `signUpWithEmailPassword({ email, password, full_name })` → uses `supabase.auth.signUp`
  - Logging with `[EMAIL AUTH]` prefix for debugging
  - No side effects; callers handle sync and redirects

## Modified Files

### 1. `src/components/LoginModal.jsx`
- **Changes**:
  - Google OAuth code unchanged
  - Added "Sign in with Email" button that opens `EmailAuthModal` (mode="signin")
  - Email flow is isolated; removing the button and EmailAuthModal import disables email login

### 2. `src/components/SignupModal.jsx`
- **Changes**:
  - Google sign-up code unchanged
  - Added "Sign up with Email" button that opens `EmailAuthModal` (mode="signup")
  - On email sign-up success, calls `handlePendingScan(userId)` then `onSignup()` so pending scans are saved

## Debugging Features

### Email Login Logging
All email login operations are prefixed with `[EMAIL LOGIN]`:
- `🔐 [EMAIL LOGIN]` - Login attempts
- `📊 [EMAIL LOGIN]` - Login responses
- `✅ [EMAIL LOGIN]` - Successful operations
- `❌ [EMAIL LOGIN]` - Errors
- `⚠️ [EMAIL LOGIN]` - Warnings

### Email Login Sync Logging
All sync operations are prefixed with `[EMAIL LOGIN SYNC]`:
- `📤 [EMAIL LOGIN SYNC]` - Sync start
- `✅ [EMAIL LOGIN SYNC]` - Successful sync steps
- `📊 [EMAIL LOGIN SYNC]` - Data fetching
- `❌ [EMAIL LOGIN SYNC]` - Sync errors
- `⚠️ [EMAIL LOGIN SYNC]` - Warnings

### Google OAuth Logging
All Google OAuth operations are prefixed with `[GOOGLE OAUTH]`:
- `🔵 [GOOGLE OAUTH]` - OAuth flow steps
- `✅ [GOOGLE OAUTH]` - Successful operations
- `❌ [GOOGLE OAUTH]` - Errors

## How Email Login Works Now

1. **User clicks "Sign in with Email"** → Opens `EmailAuthModal`
2. **User enters credentials** → Form submit calls `signInWithEmailPassword()` from `emailAuth.js`
3. **Supabase** → `supabase.auth.signInWithPassword()`; session is stored by Supabase client
4. **Extension sync** → `syncSessionToExtension(session, userId, null, null, true)` (same as OAuth callback)
5. **Close** → `onSuccess()` and `onClose()` so parent closes modals; app auth state updates via `onAuthStateChange`

## How Google OAuth Works Now

1. **User clicks "Sign in with Google"** → `handleGoogleLogin()` is called
2. **OAuth redirect** → `supabase.auth.signInWithOAuth()` redirects to Google
3. **Callback handling** → OAuth callback is handled by existing OAuth flow
4. **Extension sync** → Uses `syncSessionToExtension()` from `extensionSync.js` (shared utility)

## Testing Email Login Independently

### Step 1: Open Browser Console
Open developer tools console to see all `[EMAIL LOGIN]` and `[EMAIL LOGIN SYNC]` logs.

### Step 2: Test Email Login Flow
1. Navigate to login page
2. Click "Sign in with Email"
3. Enter email and password
4. Watch console for email login logs
5. Check for any errors with `[EMAIL LOGIN]` or `[EMAIL LOGIN SYNC]` prefix

### Step 3: Debug Extension Sync
1. After successful login, check console for sync logs
2. Look for `[EMAIL LOGIN SYNC]` messages
3. Check if `scamChecker:syncSession` event is dispatched
4. Verify extension receives the session

### Step 4: Compare with Google OAuth
- Google OAuth uses `[GOOGLE OAUTH]` logs
- Email login uses `[EMAIL LOGIN]` logs
- Both are completely separate code paths

## Benefits of Separation

1. **Independent Debugging**: Email login issues can be debugged without OAuth code interference
2. **Clear Logging**: All logs are prefixed for easy filtering
3. **Isolated Testing**: Test email login without affecting OAuth
4. **Easier Maintenance**: Changes to email login won't affect OAuth and vice versa
5. **Better Error Tracking**: Errors are clearly identified by login method

## File Structure

```
src/
├── components/
│   ├── EmailAuthModal.jsx        ← NEW: Email sign-in/sign-up modal
│   ├── LoginModal.jsx            ← MODIFIED: Added "Sign in with Email" + EmailAuthModal
│   ├── SignupModal.jsx           ← MODIFIED: Added "Sign up with Email" + EmailAuthModal
│   └── ...
├── utils/
│   ├── emailAuth.js              ← NEW: signInWithEmailPassword, signUpWithEmailPassword
│   ├── extensionSync.js          ← EXISTING: Used for both OAuth and email after login
│   └── ...
└── SUPABASE_EMAIL_AUTH_SETUP.md  ← Supabase checklist + SQL for checks column
```

## Next Steps for Debugging

1. **Check Console Logs**: Filter by `[EMAIL LOGIN]` prefix to see email login flow
2. **Check Network Tab**: Look for Supabase API calls during email login
3. **Check Extension Storage**: Verify session is stored in `chrome.storage.local`
4. **Compare Logs**: Compare `[EMAIL LOGIN SYNC]` with `[GOOGLE OAUTH]` logs to identify differences

## Common Issues to Check

1. **Session Validation**: Check if `access_token` is present in session
2. **User ID**: Verify `userId` is not null or undefined
3. **Supabase Queries**: Check if `users` table queries succeed
4. **Extension Events**: Verify `scamChecker:syncSession` event is dispatched
5. **Extension Listener**: Ensure extension content script is listening for events
