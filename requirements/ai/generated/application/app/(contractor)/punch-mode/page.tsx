"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserMeUseCase, UserMeResult } from "@/features/user/usecase/getUserMeUseCase";
import { useAttendanceStore } from "@/features/attendance/store/attendanceStore";

export default function PunchModeSelectPage() {
  const router = useRouter();
  const store = useAttendanceStore();
  const [user, setUser] = useState<UserMeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // 未認証アクセス制御 (SCR-003-VL-001)
  useEffect(() => {
    const userId = sessionStorage.getItem("user_id");
    const role = sessionStorage.getItem("role");

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
          const errorMessage = "error" in result ? result.error.message : "ユーザー情報の取得に失敗しました";
          setError(errorMessage);
        }
      } catch (err) {
        setError("ユーザー情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  // 現在日時の更新 (SCR-003-UI-003)
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
  };

  const handleSelectMode = (type: "CLOCK_IN" | "CLOCK_OUT") => {
    store.setPunchType(type);
    router.push("/worker-select");
  };

  const handleBack = () => {
    router.push("/");
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
            onClick={() => {
              sessionStorage.removeItem("user_id");
              sessionStorage.removeItem("role");
              sessionStorage.removeItem("contractor_id");
              router.push("/login");
            }}
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
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="back-button"
          >
            ← 戻る
          </button>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">打刻モード選択</span>
            <span className="text-sm font-bold text-gray-800" data-testid="user-display-name">
              {user?.displayName} 様
            </span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-lg space-y-6">
          {/* 現在日時表示領域 (SCR-003-UI-003) */}
          <div className="rounded-lg bg-white p-4 shadow-sm text-center">
            <span className="text-xs font-medium text-gray-500 block mb-1">現在の打刻日時（確認用）</span>
            <span className="text-2xl font-mono font-bold text-gray-800" data-testid="current-time">
              {currentTime ? formatDateTime(currentTime) : "----/--/-- --:--"}
            </span>
          </div>

          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900">打刻モードを選択してください</h1>
            <p className="text-xs text-gray-500 mt-1">出勤か退勤か、行う操作をタップしてください</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* 出勤ボタン (SCR-003-FN-001 / SCR-003-UI-001) */}
            <button
              onClick={() => handleSelectMode("CLOCK_IN")}
              className="flex w-full flex-col items-center justify-center rounded-xl bg-blue-600 py-8 px-6 text-white shadow-md transition-transform active:scale-95 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
              data-testid="clock-in-button"
            >
              <div className="mb-2 text-4xl">🌅</div>
              <span className="text-xl font-bold">出勤（作業開始）</span>
              <span className="mt-1 text-xs text-blue-100">本日の作業を開始します</span>
            </button>

            {/* 退勤ボタン (SCR-003-FN-002 / SCR-003-UI-001) */}
            <button
              onClick={() => handleSelectMode("CLOCK_OUT")}
              className="flex w-full flex-col items-center justify-center rounded-xl bg-amber-600 py-8 px-6 text-white shadow-md transition-transform active:scale-95 hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-300"
              data-testid="clock-out-button"
            >
              <div className="mb-2 text-4xl">🌃</div>
              <span className="text-xl font-bold">退勤（作業終了）</span>
              <span className="mt-1 text-xs text-amber-100">本日の作業を終了します</span>
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