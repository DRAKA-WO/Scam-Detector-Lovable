# Email/Password Authentication Setup Guide

This guide will help you enable and configure email/password authentication in your Supabase project.

## ✅ Code Status

**Good news!** The code is already fully implemented and ready to use:
- ✅ Login with email/password (`LoginModal.jsx`)
- ✅ Signup with email/password (`SignupModal.jsx`)
- ✅ Email confirmation callback handling (`App.tsx` - `/auth/callback`)
- ✅ Auto-login when email confirmation is disabled
- ✅ Pending scan handling after signup

## 📋 Step-by-Step Supabase Configuration

### Step 1: Enable Email Provider

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication → Providers**
4. Find **Email** provider and toggle it **ON**
5. Click **Save**

### Step 2: Configure Email Settings

In the same **Email** provider settings:

#### Option A: Disable Email Confirmation (Recommended for Testing)

- **Enable email confirmations**: Toggle **OFF**
  - Users can sign in immediately after signup
  - No email confirmation required
  - Faster for development/testing

#### Option B: Enable Email Confirmation (Production)

- **Enable email confirmations**: Toggle **ON**
  - Users must confirm their email before signing in
  - More secure, required for production
  - Users receive a confirmation email

**Other Settings:**
- **Secure email change**: Optional (toggle ON/OFF as needed)
- **Double confirm email changes**: Optional

### Step 3: Configure Email Templates (If confirmation is enabled)

1. Go to **Authentication → Email Templates**
2. Customize templates:
   - **Confirm signup** - Email sent when user signs up
   - **Invite user** - Optional
   - **Magic Link** - Optional
   - **Change Email Address** - Optional
   - **Reset Password** - For password reset functionality

3. Important: Ensure the **Redirect URL** in the template includes:
   ```
   {{ .SiteURL }}/auth/callback
   ```
   Or use your full redirect URL.

### Step 4: Configure Site URLs

1. Go to **Authentication → URL Configuration**
2. Set **Site URL**:
   - Development: `http://localhost:5173`
   - Production: `https://your-domain.com`

3. Add **Redirect URLs** (one per line):
   ```
   http://localhost:5173/auth/callback
   http://localhost:5173/**
   https://your-domain.com/auth/callback
   https://your-domain.com/**
   ```

### Step 5: Test the Flow

#### Testing Sign Up:

1. Open your app
2. Click "Sign up" or "Sign up with Email"
3. Enter:
   - **Email**: `test@example.com`
   - **Password**: `password123` (minimum 6 characters)
4. Click "Sign up"

**If email confirmation is DISABLED:**
- ✅ You'll be automatically logged in
- ✅ Redirected to `/dashboard`
- ✅ Can use the app immediately

**If email confirmation is ENABLED:**
- ✅ You'll see: "Check your email to confirm your account!"
- ✅ Check your email inbox (or Supabase logs)
- ✅ Click the confirmation link
- ✅ Redirected to `/auth/callback` then `/dashboard`
- ✅ Now you can sign in

#### Testing Sign In:

1. Open the login modal
2. Enter your email and password
3. Click "Sign in"
4. ✅ You'll be redirected to `/dashboard`

## 🔧 Troubleshooting

### Issue: "Invalid login credentials"

**Solutions:**
- Check if email confirmation is required and you haven't confirmed
- Verify the email and password are correct
- Check Supabase dashboard → Authentication → Users to see if user exists

### Issue: Email confirmation link not working

**Solutions:**
- Verify redirect URL is in allowed URLs list
- Check email template has correct redirect URL
- Check browser console for errors
- Verify `/auth/callback` route exists (it does in `App.tsx`)

### Issue: "Email rate limit exceeded"

**Solutions:**
- Wait a few minutes and try again
- Check Supabase dashboard → Authentication → Settings for rate limits
- Consider disabling email confirmation for testing

### Issue: Users can't sign up

**Solutions:**
- Verify Email provider is enabled in Supabase
- Check Supabase logs: Dashboard → Logs → Auth Logs
- Ensure email/password meets requirements (min 6 chars)

## 📧 Email Confirmation Flow

When email confirmation is **ENABLED**:

1. User signs up → Receives confirmation email
2. User clicks link → Redirected to `/auth/callback`
3. Supabase processes confirmation → Creates session
4. Callback handler → Redirects to `/dashboard`
5. User is now logged in ✅

When email confirmation is **DISABLED**:

1. User signs up → Session created immediately
2. User redirected to `/dashboard` automatically
3. User is logged in ✅

## 🎯 File Locations

- **Login Component**: `src/components/LoginModal.jsx`
- **Signup Component**: `src/components/SignupModal.jsx`
- **Auth Callback Handler**: `src/App.tsx` (OAuthCallback component)
- **Supabase Client**: `src/integrations/supabase/client.ts`

## 💡 Tips

1. **For Development**: Disable email confirmation for faster testing
2. **For Production**: Enable email confirmation for security
3. **Testing Emails**: Check Supabase dashboard → Authentication → Users → Email logs
4. **Password Requirements**: Minimum 6 characters (enforced by Supabase)

## ✅ Verification Checklist

- [ ] Email provider enabled in Supabase
- [ ] Site URL configured correctly
- [ ] Redirect URLs added (including `/auth/callback`)
- [ ] Email confirmation setting configured (ON/OFF)
- [ ] Email templates customized (if confirmation enabled)
- [ ] Tested sign up flow
- [ ] Tested sign in flow
- [ ] Tested email confirmation link (if enabled)

---

**That's it!** Your email/password authentication should now be fully functional. 🎉
