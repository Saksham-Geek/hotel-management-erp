import { Banner, btnCls, inputCls } from '@/components/ui';
import { login } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-4xl font-bold tracking-tight">Front desk</h1>
        <p className="mb-8 mt-2 text-muted">Sign in with your hotel code and work email.</p>
        <Banner error={error} />
        <form action={login} className="space-y-4">
          <label className="block text-sm font-medium">
            Hotel code
            <input name="tenant" required autoComplete="organization" placeholder="grand-azure" className={`${inputCls} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" required autoComplete="username" className={`${inputCls} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" required autoComplete="current-password" className={`${inputCls} mt-1`} />
          </label>
          <button className={`${btnCls} w-full`}>Sign in</button>
        </form>
      </div>
    </main>
  );
}
