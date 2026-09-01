"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IndexedDBUserRepository } from "@/features/user/repository/userRepository";
import { hashPassword, initDB } from "@/lib/db/indexedDB";
import { saveSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger/logger";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ loginId?: string; password?: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    initDB().catch((err) => {
      logger.error("DB initialization failed on login mount", { error: String(err) });
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setErrorMessage(null);

    const newErrors: { loginId?: string; password?: string } = {};
    if (!loginId.trim()) {
      newErrors.loginId = "IDを入力してください";
    }
    if (!password.trim()) {
      newErrors.password = "パスワードを入力してください";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      logger.info("Login validation failed", { errors: Object.keys(newErrors) });
      return;
    }

    setIsSubmitting(true);
    logger.info("Login attempt", { login_id: loginId });

    try {
      const userRepository = new IndexedDBUserRepository();
      const user = await userRepository.findByLoginId(loginId);

      if (!user) {
        setErrorMessage("IDまたはパスワードが正しくありません");
        logger.info("Login failed: User not found", { login_id: loginId });
        setIsSubmitting(false);
        return;
      }

      if (user.status !== "ACTIVE") {
        setErrorMessage("IDまたはパスワードが正しくありません");
        logger.info("Login failed: User status is not ACTIVE", { login_id: loginId, status: user.status });
        setIsSubmitting(false);
        return;
      }

      const inputHash = hashPassword(password);
      if (user.password_hash !== inputHash) {
        setErrorMessage("IDまたはパスワードが正しくありません");
        logger.info("Login failed: Password mismatch", { login_id: loginId });
        setIsSubmitting(false);
        return;
      }

      saveSession(user.user_id, user.role, user.display_name);
      await userRepository.updateLastLogin(user.user_id);

      logger.info("Login succeeded", { user_id: user.user_id, role: user.role });

      if (user.role === "CONTRACTOR_MANAGER") {
        router.push("/contractor/home");
      } else if (user.role === "FACTORY_ADMIN") {
        router.push("/factory/dashboard");
      }
    } catch (err) {
      logger.error("Login process error", { error: String(err) });
      setErrorMessage("システムエラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            外注作業員管理システム
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            レグインして操作を開始してください
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4" role="alert">
            <div className="flex">
              <div className="text-sm font-medium text-red-800">{errorMessage}</div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin} noValidate>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="login-id" className="block text-sm font-medium text-gray-700">
                レグインID
              </label>
              <input
                id="login-id"
                name="loginId"
                type="text"
                autoComplete="username"
                className={`mt-1 block h-12 w-full rounded-md border px-3 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm ${
                  errors.loginId ? "border-red-300 ring-1 ring-red-300" : "border-gray-300"
                }`}
                placeholder="例: contractor_admin"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.loginId && (
                <p className="mt-1 text-sm text-red-600" id="login-id-error">
                  {errors.loginId}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className={`mt-1 block h-12 w-full rounded-md border px-3 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm ${
                  errors.password ? "border-red-300 ring-1 ring-red-300" : "border-gray-300"
                }`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600" id="password-error">
                  {errors.password}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex h-12 w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-400"
            >
              {isSubmitting ? (
                <span className="flex items-center space-x-2">
                  <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>認証中...</span>
                </span>
              ) : (
                "レグイン"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
"}, {