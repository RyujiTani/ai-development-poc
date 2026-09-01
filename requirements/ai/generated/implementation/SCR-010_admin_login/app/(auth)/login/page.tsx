'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { IndexedDBUserRepository } from '@/features/user/repository/userRepository';
import { LoginUseCase } from '@/features/user/usecase/loginUseCase';
import { setSession, getSession } from '@/lib/auth/session';
import { initDB } from '@/lib/db/indexedDb';

const loginSchema = z.object({
  id: z.string().min(1, { message: 'IDを入力してください。' }),
  password: z.string().min(1, { message: 'パスワードを入力してください。' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      id: '',
      password: '',
    },
  });

  useEffect(() => {
    // IndexedDB の初期化とシードデータ投入を試みる
    initDB().catch((err) => {
      console.error('Failed to initialize IndexedDB:', err);
    });

    // すでにログインしている場合はリダイレクト
    const session = getSession();
    if (session.userId && session.role === 'FACTORY_ADMIN') {
      router.push('/factory/dashboard');
    }
  }, [router]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setApiError(null);

    try {
      const userRepository = new IndexedDBUserRepository();
      const loginUseCase = new LoginUseCase(userRepository);

      // クライアント内モックによるログイン検証（POST /api/admin/auth/login に相当）
      const result = await loginUseCase.execute(data.id, data.password);

      if (result.success) {
        const { admin_info } = result.value;

        // セッション管理（sessionStorageへの格納）
        setSession(admin_info.user_id, admin_info.role);

        // ログ出力（個人情報保護のためIDとロールのみ構造化出力）
        console.log(JSON.stringify({
          level: 'INFO',
          event: 'LOGIN_SUCCESS',
          payload: { user_id: admin_info.user_id, role: admin_info.role }
        }));

        // 総合ダッシュボード画面（SCR-011）にリダイレクト
        router.push('/factory/dashboard');
      } else {
        setApiError(result.error.message);
        console.log(JSON.stringify({
          level: 'WARN',
          event: 'LOGIN_FAILURE',
          payload: { login_id: data.id, code: result.error.code }
        }));
      }
    } catch (error) {
      setApiError('予期せぬ接続エラーが発生しました。');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
            工場側管理者 ログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            外注作業員 勤怠・配置管理システム
          </p>
        </div>

        {apiError && (
          <div 
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium" 
            role="alert" 
            data-testid="api-error"
          >
            {apiError}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="id-input" className="block text-sm font-medium text-gray-700 mb-1">
                管理者ID
              </label>
              <input
                id="id-input"
                type="text"
                autoComplete="username"
                {...register('id')}
                className={`appearance-none relative block w-full px-3 py-3 border ${
                  errors.id 
                    ? 'border-red-300 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:z-10 text-base sm:text-sm`}
                placeholder="IDを入力してください"
                disabled={isLoading}
              />
              {errors.id && (
                <p className="mt-1 text-sm text-red-600" data-testid="error-id">
                  {errors.id.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password-input" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="password-input"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className={`appearance-none relative block w-full px-3 py-3 border ${
                  errors.password 
                    ? 'border-red-300 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:z-10 text-base sm:text-sm`}
                placeholder="パスワードを入力してください"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600" data-testid="error-password">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              } transition-colors duration-200 h-12 items-center`}
            >
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>ログイン中...</span>
                </span>
              ) : (
                'ログイン'
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center bg-gray-50 py-3 rounded-lg border border-dashed border-gray-200">
          <p className="text-xs text-gray-500 font-semibold mb-1">
            デバッグ用初期アカウント情報
          </p>
          <p className="text-xs text-gray-500">
            ID: <code className="bg-gray-150 px-1 py-0.5 rounded text-gray-800 font-mono">admin</code> / 
            PW: <code className="bg-gray-150 px-1 py-0.5 rounded text-gray-800 font-mono">admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
"
    },
    {