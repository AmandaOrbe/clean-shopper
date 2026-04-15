import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Button from '../../components/Button';
import InputField from '../../components/InputField';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      // Email confirmation disabled — user is signed in immediately
      navigate('/browse');
    } else {
      // Email confirmation enabled — prompt user to check inbox
      setCheckEmail(true);
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center px-space-md">
        <div className="bg-white rounded-md shadow-md p-space-2xl w-full max-w-md flex flex-col gap-space-lg">
          <span className="text-h3 text-primary font-bold">Clean Shopper</span>
          <div className="flex flex-col gap-space-sm">
            <h1 className="text-h2 text-neutral-900">Check your email</h1>
            <p className="text-body text-neutral-600">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
            </p>
          </div>
          <Link to="/sign-in" className="text-small text-primary font-semibold hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center px-space-md">
      <div className="bg-white rounded-md shadow-md p-space-2xl w-full max-w-md">
        <div className="flex flex-col gap-space-xl">
          <div className="flex flex-col gap-space-sm">
            <span className="text-h3 text-primary font-bold">Clean Shopper</span>
            <h1 className="text-h1 text-neutral-900">Create account</h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-space-lg">
            <InputField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
            />
            <InputField
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Choose a password"
            />

            {error && (
              <p className="text-small text-error">{error}</p>
            )}

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
            <Link to="/sign-in" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
