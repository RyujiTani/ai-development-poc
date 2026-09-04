'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IndexedDBUserRepository } from '@/features/user/repository/userRepository';
import { LoginUseCase } from '@/features/user/usecase/loginUseCase';
import { mockHashPassword } from '@/lib/auth/hash';
import { sessionStore } from '@/lib/auth/session';
import { initDB } from '@/lib/db/indexedDb';

export default function AdminLoginPage() {
  const router = useRouter();

  // フォームステート
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  
  // 送信・ローディング・エラー状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ loginId?: string; password?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);

  // 初回ロード時にIndexedDBを初期化・シード投入
  useEffect(() => {
    initDB().catch((err) => {
      console.error('Failed to initialize database', err);
    });
  }, []);

  // インラインリアルタイムバリデーション
  const validateForm = (): boolean => {
    const errors: { loginId?: string; password?: string } = {};
    let isValid = true;

    if (!loginId.trim()) {
      errors.loginId = 'IDを入力してください。';
      isValid = false;
    }

    if (!password.trim()) {
      errors.password = 'パスワードを入力してください。';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const userRepository = new IndexedDBUserRepository();
      const loginUseCase = new LoginUseCase(userRepository);

      // セキュリティポリシーに則り、パスワードは簡易ハッシュ化して送信
      const pwHash = mockHashPassword(password);
      const result = await loginUseCase.execute(loginId, pwHash);

      if (result.success) {
        // セッション永続化 (sessionStorage)
        sessionStore.save({
          userId: result.value.admin_info.user_id,
          displayName: result.value.admin_info.display_name,
          role: result.value.admin_info.role,
          token: result.value.token,
        });

        // 成功イベント: 総合ダッシュボードへ遷移
        router.push('/admin/dashboard');
      } else {
        // エラーハンドリングポリシーに則り画面にエラーを表示
        setAuthError(result.error.message);
      }
    } catch (err) {
      setAuthError('予期せぬエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        <div>
          {/* 外注作業員 勤怠・配置管理システム ヘッダー */}
          <div className="flex justify-center">
            <span className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-lg shadow-md text-white font-bold text-xl tracking-wider">
              WAS
            </span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            工場側管理者ログイン
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            外注作業員 勤怠・配置管理システム
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          {/* API認証エラー・ロックエラー表示 */}
          {authError && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded text-sm text-red-700" role="alert">
              <span className="font-semibold">認証エラー: </span>
              {authError}
            </div>
          )}

          <div className="space-y-4">
            {/* ログインID */}
            <div>
              <label htmlFor="login-id" className="block text-sm font-medium text-slate-700">
                管理者ID
              </label>
              <div className="mt-1">
                <input
                  id="login-id"
                  name="loginId"
                  type="text"
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => {
                    setLoginId(e.target.value);
                    if (formErrors.loginId) {
                      setFormErrors((prev) => ({ ...prev, loginId: undefined }));
                    }
                  }}
                  disabled={isSubmitting}
                  placeholder="admin"
                  className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base ${
                    formErrors.loginId ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300'
                  }`}
                />
              </div>
              {formErrors.loginId && (
                <p className="mt-1.5 text-sm text-red-600 font-medium" id="login-id-error">
                  {formErrors.loginId}
                </p>
              )}
            </div>

            {/* パスワード */}
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
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formErrors.password) {
                      setFormErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  disabled={isSubmitting}
                  placeholder="••••••••"
                  className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base ${
                    formErrors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300'
                  }`}
                />
              </div>
              {formErrors.password && (
                <p className="mt-1.5 text-sm text-red-600 font-medium" id="password-error">
                  {formErrors.password}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center space-x-2">
                  {/* スピナー */}
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

        {/* 開発環境向けモックリセットツール */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-500 space-y-2">
            <div className="font-semibold text-slate-700">プロトタイプ確認用モック情報:</div>
            <div>管理者ID: <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">admin</span></div>
            <div>パスワード: <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">password123</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}