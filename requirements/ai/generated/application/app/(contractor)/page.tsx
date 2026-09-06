"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserMeUseCase, UserMeResult } from "@/features/user/usecase/getUserMeUseCase";

export default function ContractorHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserMeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = sessionStorage.getItem("user_id");
    const role = sessionStorage.getItem("role");

    // 未認証アクセス制御 (SCR-002-VL-001)
    if (!userId || !role || role !== "CONTRACTOR_MANAGER") {
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("contractor_id");
      router.replace("/login");
      return;
    }

    const loadUser = async () => {
      try {
        const result = await getUserMeUseCase(userId);
        if (result.success) {
          setUser(result.value);
        } else {
          const errorMessage = "error" in result ? result.error.message : "ログインユーザー情報の取得に失敗しました";
          setError(errorMessage);
        }
      } catch (err) {
        setError("ログインユーザー情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("contractor_id");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100" data-testid="loading-state">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">エラーが発生しました</h2>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleLogout}
            className="w-full rounded bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none"
          >
            ログイン画面へ戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* ヘッダー領域 (SCR-002-UI-003) */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">外注先管理者ホーム</span>
            <span className="text-sm font-bold text-gray-800" data-testid="user-display-name">
              {user?.displayName || "管理者"} 様
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="logout-button"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900">メニューを選択してください</h1>
            <p className="text-xs text-gray-500 mt-1">屋外でも操作しやすい大サイズボタンです</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* 打刻メニューボタン (SCR-002-UI-001 / SCR-002-FN-001) */}
            <button
              onClick={() => router.push("/punch-mode")}
              className="flex w-full flex-col items-center justify-center rounded-xl bg-blue-600 p-8 text-white shadow-md transition-transform active:scale-95 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
              data-testid="punch-menu-button"
            >
              <div className="mb-2 text-4xl">⏰</div>
              <span className="text-xl font-bold">打刻を行う</span>
              <span className="mt-1 text-xs text-blue-100">出勤・退勤の打刻を行います</span>
            </button>

            {/* 打刻修正メニューボタン (SCR-009-AMB-002 対応) */}
            <button
              onClick={() => router.push("/punch-correction")}
              className="flex w-full flex-col items-center justify-center rounded-xl bg-amber-500 p-8 text-white shadow-md transition-transform active:scale-95 hover:bg-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-200"
              data-testid="punch-correction-menu-button"
            >
              <div className="mb-2 text-4xl">📝</div>
              <span className="text-xl font-bold">打刻の修正・手動登録</span>
              <span className="mt-1 text-xs text-amber-100">打刻漏れの登録や誤った打刻の修正を行います</span>
            </button>

            {/* 作業員管理メニューボタン (SCR-002-UI-001 / SCR-002-FN-002) */}
            <button
              onClick={() => router.push("/workers")}
              className="flex w-full flex-col items-center justify-center rounded-xl bg-emerald-600 p-8 text-white shadow-md transition-transform active:scale-95 hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300"
              data-testid="workers-menu-button"
            >
              <div className="mb-2 text-4xl">👥</div>
              <span className="text-xl font-bold">作業員管理</span>
              <span className="mt-1 text-xs text-emerald-100">作業員の追加、編集、一覧確認</span>
            </button>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="py-4 text-center text-xs text-gray-400">
        © 2026 勤怠・配置管理システム
      </footer>
    </div>
  );
}