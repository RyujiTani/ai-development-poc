'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/Toast';
import { IndexedDBUserRepository } from '@/features/user/repository/indexedDBUserRepository';
import { LoginUseCase } from '@/features/user/usecase/loginUseCase';
import { seedDatabase } from '@/lib/db/seed';
import { logger } from '@/lib/logger/logger';

const loginSchema = z.object({
  loginId: z.string().min(1, { message: 'IDを入力してください' }),
  password: z.string().min(1, { message: 'パスワードを入力してください' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    seedDatabase()
      .then(() => {
        logger.info('DATABASE_SEEDED_SUCCESSFULLY');
      })
      .catch((err) => {
        logger.error('DATABASE_SEED_FAILED', err);
      });
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
    logger.info('LOGIN_ATTEMPT', { login_id: data.loginId });

    const userRepository = new IndexedDBUserRepository();
    const loginUseCase = new LoginUseCase(userRepository);

    const result = await loginUseCase.execute(data.loginId, data.password);

    if (result.success) {
      const { token, user_info } = result.value;

      try {
        sessionStorage.setItem('auth_token', token);
        sessionStorage.setItem('user_id', user_info.user_id);
        sessionStorage.setItem('user_role', user_info.role);
        sessionStorage.setItem('user_display_name', user_info.display_name);
        if (user_info.contractor_id) {
          sessionStorage.setItem('contractor_id', user_info.contractor_id);
        }

        logger.info('LOGIN_SUCCESS', { user_id: user_info.user_id, role: user_info.role });
        toast('ログインに成功しました。', 'success');

        if (user_info.role === 'CONTRACTOR_MANAGER') {
          router.push('/contractor/home');
        } else {
          router.push('/admin/dashboard');
        }
      } catch (e) {
        logger.error('SESSION_STORAGE_ERROR', e);
        setAuthError('セッションの保存に失敗しました。ブラウザの設定を確認してください。');
        toast('ログイン処理中にエラーが発生しました。', 'error');
      }
    } else {
      logger.info('LOGIN_FAILED', { login_id: data.loginId, reason: result.error.message });
      setAuthError(result.error.message);
      toast(result.error.message, 'error');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-xl shadow-md border border-slate-200">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            外注作業員管理システム
          </h2>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            外注先管理者 ログイン
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {authError && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md text-red-700 text-sm animate-fade-in" role="alert">
              <p className="font-bold">認証エラー</p>
              <p>{authError}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="loginId" className="block text-sm font-semibold text-slate-700">
                ログインID
              </label>
              <div className="mt-1">
                <input
                  id="loginId"
                  type="text"
                  autoComplete="username"
                  className={`appearance-none block w-full px-4 py-3 sm:py-3.5 border rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-lg ${
                    errors.loginId ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="IDを入力してください"
                  {...register('loginId')}
                />
              </div>
              {errors.loginId && (
                <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.loginId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                パスワード
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className={`appearance-none block w-full px-4 py-3 sm:py-3.5 border rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-lg ${
                    errors.password ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="パスワードを入力してください"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              } min-h-[48px]`}
            >
              {isSubmitting ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-500 space-y-1">
            <p className="font-bold text-slate-700 mb-1">【デモ用アカウント情報】</p>
            <p>外注先管理者 ID: <span className="font-mono bg-slate-200 px-1 py-0.5 rounded">contractor1</span> / PW: <span className="font-mono bg-slate-200 px-1 py-0.5 rounded">password123</span></p>
            <p>工場側管理者 ID: <span className="font-mono bg-slate-200 px-1 py-0.5 rounded">admin1</span> / PW: <span className="font-mono bg-slate-200 px-1 py-0.5 rounded">admin123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}