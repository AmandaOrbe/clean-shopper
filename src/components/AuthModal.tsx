import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Modal from './Modal';
import InputField from './InputField';
import Button from './Button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = 'sign-in' | 'sign-up';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  function reset() {
    setEmail('');
    setPassword('');
    setError('');
    setLoading(false);
    setCheckEmail(false);
  }

  function switchView(next: View) {
    reset();
    setView(next);
  }

  function handleClose() {
    reset();
    setView('sign-in');
    onClose();
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      handleClose();
      navigate('/browse');
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      handleClose();
      navigate('/browse');
    } else {
      setCheckEmail(true);
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-space-2xl flex flex-col gap-space-xl">
        {checkEmail ? (
          <>
            <div className="flex flex-col gap-space-sm">
              <span className="text-h3 text-primary font-bold">Clean Shopper</span>
              <h2 className="text-h2 text-neutral-900">Check your email</h2>
              <p className="text-body text-neutral-600">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
              </p>
            </div>
            <button
              className="text-small text-primary font-semibold hover:underline text-left"
              onClick={() => switchView('sign-in')}
            >
              Back to sign in
            </button>
          </>
        ) : view === 'sign-in' ? (
          <>
            <div className="flex flex-col gap-space-sm">
              <span className="text-h3 text-primary font-bold">Clean Shopper</span>
              <h2 className="text-h2 text-neutral-900">Sign in</h2>
            </div>
            <form onSubmit={handleSignIn} className="flex flex-col gap-space-lg">
              <InputField
                id="modal-email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
              />
              <InputField
                id="modal-password"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Your password"
              />
              {error && <p className="text-small text-error">{error}</p>}
              <Button
                label="Sign in"
                variant="primary"
                type="submit"
                isLoading={loading}
                fullWidth
              />
            </form>
            <p className="text-small text-neutral-600 text-center">
              Don't have an account?{' '}
              <button
                className="text-primary font-semibold hover:underline"
                onClick={() => switchView('sign-up')}
              >
                Sign up
              </button>
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-space-sm">
              <span className="text-h3 text-primary font-bold">Clean Shopper</span>
              <h2 className="text-h2 text-neutral-900">Create account</h2>
            </div>
            <form onSubmit={handleSignUp} className="flex flex-col gap-space-lg">
              <InputField
                id="modal-email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
              />
              <InputField
                id="modal-password"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Choose a password"
              />
              {error && <p className="text-small text-error">{error}</p>}
              <Button
                label="Create account"
                variant="primary"
                type="submit"
                isLoading={loading}
                fullWidth
              />
            </form>
            <p className="text-small text-neutral-600 text-center">
              Already have an account?{' '}
              <button
                className="text-primary font-semibold hover:underline"
                onClick={() => switchView('sign-in')}
              >
                Sign in
              </button>
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
