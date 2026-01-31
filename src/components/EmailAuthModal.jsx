/**
 * Email/password sign-in and sign-up only. Isolated from Google OAuth.
 * Rendered via Portal to document.body so it's not clipped by parent modal (fixes glitched overlay).
 * To remove: delete this file and src/utils/emailAuth.js, and remove
 * the "Sign in with Email" / "Sign up with Email" UI from LoginModal and SignupModal.
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInWithEmailPassword, signUpWithEmailPassword } from '@/utils/emailAuth';
import { syncSessionToExtension } from '@/utils/extensionSync';

function EmailAuthModal({ isOpen, onClose, mode = 'signin', onSuccess, preventRedirect = false }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setMessage('');
      setEmail('');
      setPassword('');
      setFullName('');
    }
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const getFriendlyAuthError = (err) => {
    const msg = err?.message || '';
    if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid_credentials')) {
      return 'Email or password is incorrect. Please try again.';
    }
    if (msg.toLowerCase().includes('email not confirmed')) {
      return 'Please check your email and confirm your account first.';
    }
    if (msg.toLowerCase().includes('user already registered') || msg.toLowerCase().includes('already registered')) {
      return 'We already have this email signed in with Google or another provider. Please sign in with that method instead.';
    }
    if (msg.toLowerCase().includes('password') && msg.toLowerCase().includes('6')) {
      return 'Password must be at least 6 characters.';
    }
    return msg || (mode === 'signup' ? 'Sign up failed. Please try again.' : 'Sign in failed. Please try again.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { data, error: err } = await signInWithEmailPassword(email, password);
        if (err) {
          setError(getFriendlyAuthError(err));
          setLoading(false);
          return;
        }
        if (data?.session && data?.user) {
          await syncSessionToExtension(data.session, data.user.id, null, null, true);
          onSuccess?.({ session: data.session, user: data.user });
          onClose();
          if (!preventRedirect) navigate('/dashboard');
        }
      } else {
        const { data, error: err } = await signUpWithEmailPassword({
          email,
          password,
          full_name: fullName || undefined,
        });
        if (err) {
          setError(getFriendlyAuthError(err));
          setLoading(false);
          return;
        }
        if (data?.needsConfirmation) {
          onClose();
          navigate(preventRedirect ? '/verifyemail' : '/checkemail', { state: { email: email.trim() } });
          setLoading(false);
          return;
        }
        if (data?.session && data?.user) {
          await syncSessionToExtension(data.session, data.user.id, null, null, true);
          onSuccess?.({ session: data.session, user: data.user });
          onClose();
          if (!preventRedirect) navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(getFriendlyAuthError(err));
    }
    setLoading(false);
  };

  const isSignUp = mode === 'signup';
  const title = isSignUp ? 'Sign up with Email' : 'Sign in with Email';
  const submitLabel = isSignUp ? 'Create account' : 'Sign in';

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        margin: 0, padding: '1rem', overflow: 'auto',
        zIndex: 10001, // above parent Login/Signup modal (z-9999) so we draw on top and aren't clipped
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-gray-700 max-w-md w-full overflow-hidden relative"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          transform: 'translateZ(0)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pb-4 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <span className="text-xl">✉️</span>
            </div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
          <p className="text-gray-400 text-sm">
            {isSignUp ? 'Create an account with your email' : 'Use your email and password'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">{message}</p>
            </div>
          )}

          {isSignUp && (
            <div className="mb-4">
              <Label htmlFor="email-auth-fullname" className="text-gray-300">Name (optional)</Label>
              <Input
                id="email-auth-fullname"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
              />
            </div>
          )}
          <div className="mb-4">
            <Label htmlFor="email-auth-email" className="text-gray-300">Email</Label>
            <Input
              id="email-auth-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="email-auth-password" className="text-gray-300">Password</Label>
            <Input
              id="email-auth-password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder={isSignUp ? 'At least 6 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold"
          >
            {loading ? 'Please wait...' : submitLabel}
          </Button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default EmailAuthModal;
