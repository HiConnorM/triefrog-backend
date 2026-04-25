'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('demo@triefrog.dev');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-surface border border-outline-variant flex items-center justify-center mx-auto mb-4">
            <span className="text-primary font-bold text-lg">TF</span>
          </div>
          <h1 className="text-h1 font-sans font-semibold text-on-surface">Triefrog</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">Visual Project OS</p>
        </div>

        <div className="bg-surface border border-surface-variant rounded-lg p-6">
          <h2 className="text-h2 font-semibold text-on-surface mb-5">Sign in</h2>

          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded text-error text-body-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-ui-label text-on-surface-variant uppercase tracking-widest font-mono">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-on-surface text-body-sm outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-ui-label text-on-surface-variant uppercase tracking-widest font-mono">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-on-surface text-body-sm outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            <Button type="submit" loading={loading} className="w-full justify-center mt-2">
              Sign In
            </Button>
          </form>

          <p className="text-body-sm text-on-surface-variant text-center mt-4">
            No account?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Create one
            </Link>
          </p>

          <div className="mt-4 p-3 bg-surface-container rounded border border-outline-variant">
            <p className="text-[11px] text-on-surface-variant font-mono">
              Demo: demo@triefrog.dev / password123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
