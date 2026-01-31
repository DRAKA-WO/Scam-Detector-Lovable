/**
 * Email/password auth only. Isolated from Google OAuth.
 * To remove email auth: delete this file and EmailAuthModal.jsx, and remove
 * "Sign in with Email" / "Sign up with Email" from LoginModal and SignupModal.
 */

import { supabase } from '@/integrations/supabase/client';

const LOG_PREFIX = '[EMAIL AUTH]';

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: { session, user } | null, error: Error | null }>}
 */
export async function signInWithEmailPassword(email, password) {
  try {
    if (!email?.trim() || !password) {
      return { data: null, error: new Error('Email and password are required') };
    }
    console.log(`${LOG_PREFIX} Signing in...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      console.warn(`${LOG_PREFIX} Sign-in error:`, error.message);
      return { data: null, error };
    }
    console.log(`${LOG_PREFIX} Sign-in success for`, data?.user?.email);
    return { data: { session: data.session, user: data.user }, error: null };
  } catch (err) {
    console.warn(`${LOG_PREFIX} Exception:`, err);
    return { data: null, error: err };
  }
}

/**
 * Sign up with email and password. Supabase creates auth.users row;
 * sync_user_from_auth trigger will create/update public.users.
 * @param {{ email: string, password: string, full_name?: string }} options
 * @returns {Promise<{ data: { session, user } | null, error: Error | null }>}
 */
export async function signUpWithEmailPassword({ email, password, full_name }) {
  try {
    if (!email?.trim() || !password) {
      return { data: null, error: new Error('Email and password are required') };
    }
    console.log(`${LOG_PREFIX} Signing up...`);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        ...(full_name?.trim() ? { data: { full_name: full_name.trim() } } : {}),
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    });
    if (error) {
      console.warn(`${LOG_PREFIX} Sign-up error:`, error.message);
      return { data: null, error };
    }
    // Supabase may require email confirmation; if so, data.session can be null
    if (data.session && data.user) {
      console.log(`${LOG_PREFIX} Sign-up success (no confirmation) for`, data.user.email);
      return { data: { session: data.session, user: data.user }, error: null };
    }
    // No session: either pending confirmation or email already used by another provider (e.g. Google)
    if (data.user?.identities && data.user.identities.length === 0) {
      console.log(`${LOG_PREFIX} Sign-up: email already registered (e.g. with Google)`);
      return {
        data: null,
        error: new Error('User already registered'),
      };
    }
    console.log(`${LOG_PREFIX} Sign-up pending email confirmation for`, data.user?.email);
    return {
      data: data.user ? { session: null, user: data.user, needsConfirmation: true } : null,
      error: null,
    };
  } catch (err) {
    console.warn(`${LOG_PREFIX} Exception:`, err);
    return { data: null, error: err };
  }
}
