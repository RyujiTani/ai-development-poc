'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '../../../../components/ui/input';
import { Button } from '../../../../components/ui/button';
import { useToast } from '../../../../components/ui/toast';
import { LoginUseCase } from '../../../../features/user/usecase/loginUseCase';
import { IndexedDBUserRepository } from '../../../../features/user/repository/userRepository';
import { initializeDBWithSeed } from '../../../../lib/db/indexedDB';
import { sessionManager } from '../../../../lib/auth/session';

const loginSchema = z.object({
  loginId: z.string().min(1, 'ログインIDを入力してください。'),
  password: z.string().min(1, 'パスワードを入力してください。'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // 初回表示時にIndexedDBに初期シードを流し込む
  useEffect(() => {
    initializeDBWithSeed()
      .then(() => {
        setDbReady(true);
      })
      .catch((err) => {
        showToast('データベースの初期化に失敗しました。', 'error');
        console.error(err);
      });
  }, [showToast]);

  const onSubmit = async (data: LoginFormValues) => {
    if (!dbReady) {
      showToast('システム準備中です。少々お待ちください。', 'error');
      return;
    }

    setLoading(true);
    setSubmitError(null);
    try {
      const userRepository = new IndexedDBUserRepository();
      const loginUseCase = new LoginUseCase(userRepository);

      const result = await loginUseCase.execute(data.loginId, data.password);

      if (result.success) {
        const user = result.value.user;
        
        if (user.role !== 'FACTORY_ADMIN') {
          // 工場側管理者以外のログインは認証エラーとする
          sessionManager.clearSession();
          const authErrorMsg = 'IDまたはパスワードが正しくありません。';
          setSubmitError(authErrorMsg);
          showToast(authErrorMsg, 'error');
          setLoading(false);
          return;
        }

        showToast(`${user.display_name}様としてログインしました。`, 'success');
        router.push('/admin/dashboard');
      } else {
        const errMsg = result.error.message || 'IDまたはパスワードが正しくありません。';
        setSubmitError(errMsg);
        showToast(errMsg, 'error');
      }
    } catch (err) {
      showToast('認証処理中にエラーが発生しました。', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            勤怠・配置管理システム
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            工場側管理者 ログイン
          </p>
        </div>

        {submitError && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg text-center font-medium">
            {submitError}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <Input
              id="loginId"
              type="text"
              label="ログインID"
              placeholder="factory_admin"
              disabled={loading || !dbReady}
              error={errors.loginId?.message}
              {...register('loginId')}
            />

            <Input
              id="password"
              type="password"
              label="パスワード"
              placeholder="••••••••"
              disabled={loading || !dbReady}
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <div>
            <Button
              id="login-button"
              type="submit"
              loading={loading}
              disabled={loading || !dbReady}
              className="mt-2 h-12 text-base font-semibold"
            >
              {!dbReady ? 'システム初期化中...' : 'ログイン'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}