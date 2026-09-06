"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormValues } from '@/features/user/domain/loginSchema';
import { LoginUseCase } from '@/features/user/usecase/loginUseCase';
import { IndexedDBUserRepository } from '@/features/user/repository/indexedDBUserRepository';
import { seedDatabase } from '@/lib/db';

export default function LoginPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    seedDatabase();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginId: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setAuthError(null);

    const userRepository = new IndexedDBUserRepository();
    const loginUseCase = new LoginUseCase(userRepository);

    const result = await loginUseCase.execute({
      loginId: data.loginId,
      password_hash: data.password,
    });

    if (result.success) {
      sessionStorage.setItem('user_id', result.value.user_id);
      sessionStorage.setItem('role', result.value.role);
      router.push('/home');
    } else if ('error' in result) {
      setAuthError(result.error.message);
    }
    setIsSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-gray-200 bg-white p-8 shadow-md">
        <div className="text-center">
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            外注先ログイン
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            IDとパスワードを入力してログインしてください
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {authError && (
            <div
              className="rounded-md bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              {authError}
            </div>
          )}

          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label
                htmlFor="loginId"
                className="block text-sm font-medium text-gray-700"
              >
                ログインID
              </label>
              <div className="mt-1">
                <input
                  id="loginId"
                  type="text"
                  autoComplete="username"
                  {...register('loginId')}
                  className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  placeholder="ユーザーIDを入力"
                />
              </div>
              {errors.loginId && (
                <p className="mt-1 text-sm text-red-600" id="loginId-error">
                  {errors.loginId.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                パスワード
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  placeholder="パスワードを入力"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600" id="password-error">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
            >
              {isSubmitting ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}