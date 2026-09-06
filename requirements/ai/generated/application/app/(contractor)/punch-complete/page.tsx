"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAttendanceStore } from "@/features/attendance/store/useAttendanceStore";

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

function PunchCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { punchMode, selectedWorkerIds, setPunchMode, setSelectedWorkerIds } = useAttendanceStore();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    function checkAuth() {
      if (typeof sessionStorage === "undefined") {
        setIsLoading(false);
        return;
      }

      const storedId = sessionStorage.getItem("user_id");
      const storedRole = sessionStorage.getItem("role");

      // 未認証状態でのログイン画面（SCR-001）へのリダイレクトガード
      if (!storedId || storedRole !== "CONTRACTOR_MANAGER") {
        router.push("/login");
        return;
      }

      setIsLoading(false);
    }

    checkAuth();
  }, [router]);

  // 前画面から引き継いだ送信完了情報を取得する
  const queryMode = searchParams ? searchParams.get("mode") : null;
  const queryCount = searchParams ? searchParams.get("count") : null;

  const displayMode = queryMode || punchMode;
  const displayCount = queryCount ? parseInt(queryCount, 10) : selectedWorkerIds.length;

  const handleGoHome = () => {
    // 次回の打刻に備えてコンテキスト状態をクリアする
    setPunchMode(null);
    setSelectedWorkerIds([]);
    router.push("/home");
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
        <div className="flex items-center space-x-2 text-slate-600">
          <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-semibold text-lg">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <h1 className="text-lg font-bold text-slate-900">
            打刻完了
          </h1>
        </div>
      </header>

      {/* メイン：メッセージ領域を中央に寄せる */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-12 flex flex-col justify-center items-center text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm w-full space-y-6">
          {/* 完了アイコン */}
          <div className="flex justify-center">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full">
              <CheckCircleIcon className="h-16 w-16" />
            </div>
          </div>

          {/* メッセージ */}
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900" data-testid="complete-title">
              打刻データを送信しました
            </h2>
            <p className="text-slate-500 text-sm">
              打刻情報の登録が正常に完了しました。
            </p>
          </div>

          {/* 送信成功情報の表示 */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 text-left space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-500">打刻種別</span>
              <span className="text-base font-extrabold text-blue-600" data-testid="display-mode">
                {displayMode === "CLOCK_IN" ? "出勤" : displayMode === "CLOCK_OUT" ? "退勤" : "未設定"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-500">対象人数</span>
              <span className="text-base font-extrabold text-slate-800" data-testid="display-count">
                {displayCount}名
              </span>
            </div>
          </div>

          {/* ホームへ戻るボタン：屋外でも操作しやすい大型サイズ */}
          <div className="pt-2">
            <button
              onClick={handleGoHome}
              className="w-full bg-blue-600 text-white rounded-xl py-4 text-base font-bold shadow hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
              style={{ minHeight: "56px" }}
              data-testid="back-to-home-btn"
            >
              <HomeIcon className="h-5 w-5" />
              <span>ホームへ戻る</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PunchCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
          <div className="flex items-center space-x-2 text-slate-600">
            <span className="font-semibold text-lg">読み込み中...</span>
          </div>
        </div>
      }
    >
      <PunchCompleteContent />
    </Suspense>
  );
}