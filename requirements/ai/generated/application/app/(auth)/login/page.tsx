'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../components/ui/toast';
import { LoginUseCase } from '../../../features/user/usecase/loginUseCase';
import { IndexedDBUserRepository } from '../../../features/user/repository/userRepository';
import { initializeDBWithSeed } from '../../../lib/db/indexedDB';

const loginSchema = z.object({
  loginId: z.string().min(1, 'ログインIDを入力してください。'),
  password: z.string().min(1, 'パスワードを入力してください。'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dbReady, setDbReady] = useState(false);

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
    try {
      const userRepository = new IndexedDBUserRepository();
      const loginUseCase = new LoginUseCase(userRepository);

      const result = await loginUseCase.execute(data.loginId, data.password);

      if (result.success) {
        const user = result.value.user;
        showToast(`${user.display_name}様としてログインしました。`, 'success');

        if (user.role === 'CONTRACTOR_MANAGER') {
          router.push('/contractor');
        } else if (user.role === 'FACTORY_ADMIN') {
          router.push('/factory');
        } else {
          router.push('/');
        }
      } else {
        showToast(result.error.message, 'error');
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
            外注先管理者 ログイン
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <Input
              id="loginId"
              type="text"
              label="ログインID"
              placeholder="subcon_oshima"
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