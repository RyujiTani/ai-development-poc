"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { login, logout } from "@/lib/auth";

const loginSchema = z.object({
  login_id: z.string().min(1, { message: "IDを入力してください" }),
  password: z.string().min(1, { message: "パスワードを入力してください" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login_id: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await login(data.login_id, data.password);
      if (result.success && result.user) {
        if (result.user.role === "FACTORY_ADMIN") {
          router.push("/dashboard");
        } else {
          // 工場側管理者ではないロールの場合はセッションをクリアしてエラー表示
          logout();
          setErrorMessage("工場側管理者アカウントではありません");
        }
      } else {
        setErrorMessage(result.error || "ログインに失敗しました");
      }
    } catch (e) {
      setErrorMessage("システムエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-50 min-h-screen">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-md border border-slate-200">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            外注作業員管理システム
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            工場側管理者 ログイン
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {errorMessage && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 font-medium" data-testid="error-message">
              {errorMessage}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="login_id"
                className="block text-sm font-semibold text-slate-700"
              >
                ログインID
              </label>
              <div className="mt-1">
                <input
                  id="login_id"
                  type="text"
                  autoComplete="username"
                  {...register("login_id")}
                  className={`block w-full rounded-lg border px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                    errors.login_id ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
                  }`}
                  placeholder="IDを入力してください"
                  disabled={isSubmitting}
                  style={{ minHeight: "44px" }}
                  data-testid="login-id-input"
                />
              </div>
              {errors.login_id && (
                <p className="mt-1.5 text-sm text-red-600 font-medium" data-testid="error-login-id">
                  {errors.login_id.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700"
              >
                パスワード
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                  className={`block w-full rounded-lg border px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                    errors.password ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
                  }`}
                  placeholder="パスワードを入力してください"
                  disabled={isSubmitting}
                  style={{ minHeight: "44px" }}
                  data-testid="password-input"
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600 font-medium" data-testid="error-password">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full justify-center items-center rounded-lg bg-blue-600 px-4 py-3.5 text-base font-bold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              style={{ minHeight: "48px" }}
              data-testid="submit-btn"
            >
              {isSubmitting ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>ログイン中...</span>
                </span>
              ) : (
                "ログイン"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}