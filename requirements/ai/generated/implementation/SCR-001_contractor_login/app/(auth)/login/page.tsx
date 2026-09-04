'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IndexedDBUserRepository } from '@/features/user/repository/userRepository';
import { LoginUseCase } from '@/features/user/usecase/loginUseCase';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ loginId?: string; password?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 初回表示時にIndexedDBの初期設定とシード注入をトリガー
  useEffect(() => {
    import('@/lib/db/indexedDB').then((mod) => {
      mod.initDB().catch((err) => {
        console.error('Failed to initialize mock database:', err);
      });
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // クライアント側簡易検証
    const clientErrors: { loginId?: string; password?: string } = {};
    if (!loginId.trim()) {
      clientErrors.loginId = 'ログインIDを入力してください';
    }
    if (!password) {
      clientErrors.password = 'パスワードを入力してください';
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const userRepository = new IndexedDBUserRepository();
      const loginUseCase = new LoginUseCase(userRepository);
      const result = await loginUseCase.execute(loginId, password);

      if (result.success) {
        const { role } = result.data;
        if (role === 'CONTRACTOR_MANAGER') {
          router.push('/contractor/home');
        } else if (role === 'FACTORY_ADMIN') {
          router.push('/factory/dashboard');
        } else {
          router.push('/contractor/home');
        }
      } else {
        if (result.error.type === 'VALIDATION_ERROR') {
          if (result.error.message.includes('ID')) {
            setErrors({ loginId: result.error.message });
          } else {
            setErrors({ password: result.error.message });
          }
        } else {
          setErrors({ general: result.error.message });
        }
      }
    } catch (err) {
      setErrors({ general: 'システムへのログインに失敗しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (id: string) => {
    setLoginId(id);
    setPassword('password123');
    setErrors({});
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          勤怠・配置管理システム
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          テストプロジェクト版プロトタイプ
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleLogin} noValidate>
            <div>
              <label htmlFor="loginId" className="block text-sm font-medium text-slate-700">
                ログインID
              </label>
              <div className="mt-1">
                <input
                  id="loginId"
                  name="loginId"
                  type="text"
                  autoComplete="username"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className={`appearance-none block w-full px-3 py-3 border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base md:text-sm ${
                    errors.loginId ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300'
                  }`}
                  placeholder="例: contractor1"
                />
              </div>
              {errors.loginId && (
                <p className="mt-1.5 text-sm text-red-600" id="loginId-error">
                  {errors.loginId}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                パスワード
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`appearance-none block w-full px-3 py-3 border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base md:text-sm ${
                    errors.password ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600" id="password-error">
                  {errors.password}
                </p>
              )}
            </div>

            {errors.general && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <p className="text-sm font-medium text-red-800">{errors.general}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                {isSubmitting ? 'ログイン中...' : 'ログイン'}
              </button>
            </div>
          </form>

          {/* デモンストレーション用簡易ログインボタン */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-3">
              クイックログイン (テストアカウント用)
            </h2>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('contractor1')}
                className="w-full text-left px-3 py-2 border border-slate-200 rounded-md text-sm hover:bg-slate-50 transition flex justify-between items-center text-slate-700 cursor-pointer"
              >
                <span>外注先管理者</span>
                <span className="text-xs text-indigo-600 font-medium">ID: contractor1</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('factory1')}
                className="w-full text-left px-3 py-2 border border-slate-200 rounded-md text-sm hover:bg-slate-50 transition flex justify-between items-center text-slate-700 cursor-pointer"
              >
                <span>工場側管理者</span>
                <span className="text-xs text-indigo-600 font-medium">ID: factory1</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}