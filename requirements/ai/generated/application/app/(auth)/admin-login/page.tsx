'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { loginMock } from '@/lib/auth/mockAuth';

const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const loginSchema = z.object({
  login_id: z.string().min(1, { message: 'IDは必須入力です' }),
  password: z.string().min(1, { message: 'パスワードは必須入力です' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login_id: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    if (submitting) return;
    setSubmitting(true);
    setAuthError(null);

    try {
      const result = await loginMock(data.login_id, data.password);
      if (result.success && result.user) {
        if (result.user.role === 'FACTORY_ADMIN') {
          router.push('/factory/dashboard');
        } else {
          setAuthError('管理者権限がありません');
        }
      } else {
        setAuthError(result.error || 'IDまたはパスワードが正しくありません');
      }
    } catch (err) {
      setAuthError('システムエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-6 sm:p-10 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            管理者ログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            作業員 勤怠・配置管理システム
          </p>
        </div>

        {authError && (
          <div className="rounded-md bg-red-50 p-4" role="alert" data-testid="auth-error">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{authError}</h3>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="login_id" className="block text-sm font-medium text-gray-700 mb-1">
                ログインID
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="login_id"
                  type="text"
                  autoComplete="username"
                  className={`block w-full rounded-md border-0 py-3 pl-10 text-gray-900 ring-1 ring-inset ${
                    errors.login_id ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300 focus:ring-blue-600'
                  } placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
                  placeholder="IDを入力してください"
                  {...register('login_id')}
                />
              </div>
              {errors.login_id && (
                <p className="mt-1 text-sm text-red-600" id="login_id-error" data-testid="login-id-error">
                  {errors.login_id.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <LockIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className={`block w-full rounded-md border-0 py-3 pl-10 text-gray-900 ring-1 ring-inset ${
                    errors.password ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300 focus:ring-blue-600'
                  } placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6`}
                  placeholder="パスワードを入力してください"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600" id="password-error" data-testid="password-error">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-3.5 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-blue-400 md:py-3"
              style={{ minHeight: '44px' }}
            >
              {submitting ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}