import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Button from '../../components/Button';
import InputField from '../../components/InputField';

export default function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/browse');
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center px-space-md">
      <div className="bg-white rounded-md shadow-md p-space-2xl w-full max-w-md">
        <div className="flex flex-col gap-space-xl">
          <div className="flex flex-col gap-space-sm">
            <span className="text-h3 text-primary font-bold">Clean Shopper</span>
            <h1 className="text-h1 text-neutral-900">Log in</h1>
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
              placeholder="Your password"
            />

            {error && (
              <p className="text-small text-error">{error}</p>
            )}

            <Button
              label="Log in"
              variant="primary"
              type="submit"
              isLoading={loading}
              fullWidth
            />
          </form>

          <p className="text-small text-neutral-600 text-center">
            Don't have an account?{' '}
            <Link to="/sign-up" className="text-primary font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
