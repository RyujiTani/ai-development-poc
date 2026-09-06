"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adminLoginUseCase } from "@/features/auth/usecase/adminLoginUseCase";
import { initializeDB } from "@/lib/db/indexedDB";

const loginSchema = z.object({
  loginId: z.string().min(1, { message: "IDを入力してください" }),
  password: z.string().min(1, { message: "パスワードを入力してください" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    initializeDB().catch((err) => {
      console.error("IndexedDB initialization error:", err);
    });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginId: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    if (loading) return;
    setLoading(true);
    setSubmitError(null);

    try {
      const result = await adminLoginUseCase({
        loginId: data.loginId,
        passwordPlain: data.password,
      });

      if (result.success) {
        sessionStorage.setItem("user_id", result.value.userId);
        sessionStorage.setItem("role", result.value.role);
        
        // 工場側管理者は総合ダッシュボード "/dashboard" へ遷移 (SCR-011)
        router.push("/dashboard");
      } else {
        if ("error" in result) {
          setSubmitError(result.error.message);
        } else {
          setSubmitError("IDまたはパスワードが正しくありません");
        }
      }
    } catch (error) {
      setSubmitError("ログイン処理中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md md:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            勤怠・配置管理システム
          </h1>
          <p className="mt-1 text-sm text-gray-500">工場側管理者 ログイン</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {submitError && (
            <div
              className="rounded bg-red-50 p-3 text-sm text-red-600"
              role="alert"
              data-testid="error-message"
            >
              {submitError}
            </div>
          )}

          <div>
            <label
              htmlFor="loginId"
              className="block text-sm font-medium text-gray-700"
            >
              ログインID
            </label>
            <input
              id="loginId"
              type="text"
              disabled={loading}
              {...register("loginId")}
              className={`mt-1 block w-full rounded border px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.loginId ? "border-red-500" : "border-gray-300"
              } h-12 md:h-10`}
              data-testid="login-id-input"
            />
            {errors.loginId && (
              <p className="mt-1 text-sm text-red-600" data-testid="login-id-error">
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
            <input
              id="password"
              type="password"
              disabled={loading}
              {...register("password")}
              className={`mt-1 block w-full rounded border px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? "border-red-500" : "border-gray-300"
              } h-12 md:h-10`}
              data-testid="password-input"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600" data-testid="password-error">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded bg-blue-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 h-14 md:h-12"
            data-testid="submit-button"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}