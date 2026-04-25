'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', orgName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name', label: 'Full Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'password', label: 'Password', type: 'password' },
    { key: 'orgName', label: 'Organization Name', type: 'text' },
  ] as const;

  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-surface border border-outline-variant flex items-center justify-center mx-auto mb-4">
            <span className="text-primary font-bold text-lg">TF</span>
          </div>
          <h1 className="text-h1 font-semibold text-on-surface">Triefrog</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">Create your account</p>
        </div>

        <div className="bg-surface border border-surface-variant rounded-lg p-6">
          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded text-error text-body-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {fields.map(({ key, label, type }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-ui-label text-on-surface-variant uppercase tracking-widest font-mono">
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-on-surface text-body-sm outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
            ))}
            <Button type="submit" loading={loading} className="w-full justify-center mt-2">
              Create Account
            </Button>
          </form>
          <p className="text-body-sm text-on-surface-variant text-center mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
