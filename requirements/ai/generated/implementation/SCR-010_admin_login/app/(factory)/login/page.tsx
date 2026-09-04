'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IndexedDBUserRepository } from '@/features/user/repository/userRepository';
import { LoginUseCase } from '@/features/auth/usecase/loginUseCase';
import { sessionStore } from '@/lib/auth/session';
import { seedDatabase } from '@/lib/db/idb';
import { logger } from '@/lib/logger/logger';
import { Toast } from '@/components/Toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ loginId?: string; password?: string; auth?: string }>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    async function initDb() {
      try {
        await seedDatabase();
        logger.info('Database initialized with seed data');
      } catch (err) {
        logger.error('Failed to seed database during setup', err);
      }
    }
    initDb();
  }, []);

  const handleResetDatabase = async () => {
    try {
      setLoading(true);
      if (typeof window !== 'undefined') {
        const dbs = await window.indexedDB.databases();
        dbs.forEach(db => {
          if (db.name) window.indexedDB.deleteDatabase(db.name);
        });
      }
      await seedDatabase();
      setToast({ message: 'データベースをリセットし、初期データを再投入しました。', type: 'success' });
      logger.info('Forced full reset on Database from administrator ui');
    } catch (err) {
      setToast({ message: 'データベースの初期化に失敗しました。', type: 'error' });
      logger.error('Failed to force clear and reseed DB', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: { loginId?: string; password?: string } = {};
    if (!loginId.trim()) {
      newErrors.loginId = 'ユーザーIDを入力してください。';
    }
    if (!password) {
      newErrors.password = 'パスワードを入力してください。';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      logger.warn('Login input validation error', { fields: Object.keys(newErrors) });
      return;
    }

    setLoading(true);
    logger.info('Starting login verification', { loginId });

    try {
      const userRepository = new IndexedDBUserRepository();
      const loginUseCase = new LoginUseCase(userRepository);
      
      const result = await loginUseCase.execute(loginId, password);

      if (result.success) {
        const { token, admin_info } = result.value;
        sessionStore.save({
          userId: admin_info.user_id,
          role: admin_info.role,
          displayName: admin_info.display_name,
          token
        });

        logger.info('Administrator login completed successfully', { userId: admin_info.user_id });
        setToast({ message: 'ログインに成功しました。ダッシュボードに遷移します。', type: 'success' });

        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 1000);
      } else {
        setErrors({ auth: result.error.message });
        setToast({ message: result.error.message, type: 'error' });
        logger.warn('Auth credentials invalid', { errorType: result.error.code });
      }
    } catch (err) {
      setErrors({ auth: 'システムエラーが発生しました。再度お試しください。' });
      setToast({ message: '通信に障害が発生しました。', type: 'error' });
      logger.error('Unexpected login process exception', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="hidden sm:block"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full mb-3 uppercase tracking-wider">
            FACTORY ADMIN
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            外注管理システム
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            工場管理者ログイン
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleLogin} noValidate>
            {errors.auth && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-start space-x-2">
                <svg className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errors.auth}</span>
              </div>
            )}

            <div>
              <label htmlFor="loginId" className="block text-sm font-medium text-gray-700">
                ユーザーID <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="loginId"
                  name="loginId"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={loading}
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className={`appearance-none block w-full px-4 py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.loginId ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="admin"
                />
              </div>
              {errors.loginId && (
                <p className="mt-2 text-sm text-red-600" id="loginId-error">
                  {errors.loginId}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`appearance-none block w-full px-4 py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600" id="password-error">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:scale-95 transition-transform ${
                  loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? (
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

          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-500 text-center mb-2">デモ検証用ログイン情報</p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginId('admin');
                  setPassword('admin123');
                }}
                className="w-full text-xs text-left bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded flex justify-between items-center"
              >
                <span>工場管理者: admin</span>
                <span className="text-gray-400">パスワード: admin123</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4 mt-8">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg inline-block text-left max-w-full">
          <p className="text-xs font-semibold text-yellow-800 mb-1">【動作検証・初期化ツール】</p>
          <p className="text-[11px] text-yellow-700 mb-2">
            IndexedDBのクリア及び工場管理者・外注先企業のテスト用データを最初期状態へリセット投入します。
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={handleResetDatabase}
            className="w-full inline-flex justify-center items-center px-3 py-1.5 border border-yellow-300 text-xs font-medium rounded text-yellow-700 bg-white hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            データベース初期化・シード再投入
          </button>
        </div>
        <p className="text-xs text-gray-400">
          &copy; 2026 worker-attendance-system-frontend. All rights reserved.
        </p>
      </div>
    </div>
  );
}