"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAttendanceStore } from "@/features/attendance/store/useAttendanceStore";

const ArrowLeftIcon = ({ className }: { className?: string }) => (
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
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const SunIcon = ({ className }: { className?: string }) => (
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
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = ({ className }: { className?: string }) => (
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
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export default function PunchModeSelectPage() {
  const router = useRouter();
  const { setPunchMode } = useAttendanceStore();
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // 初回レンダリング後に現在日時を設定（SSRとのハイドレーションミスマッチ防止）
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function checkAuth() {
      if (typeof sessionStorage === "undefined") {
        setIsLoading(false);
        return;
      }

      const storedId = sessionStorage.getItem("user_id");
      const storedRole = sessionStorage.getItem("role");

      // 未認証リダイレクト（sessionStorageに有効なセッションが存在しない場合）
      if (!storedId || storedRole !== "CONTRACTOR_MANAGER") {
        router.push("/login");
        return;
      }
      setIsLoading(false);
    }

    checkAuth();
  }, [router]);

  const handleSelectMode = (mode: "CLOCK_IN" | "CLOCK_OUT") => {
    setPunchMode(mode);
    router.push("/worker-select");
  };

  const handleBack = () => {
    router.push("/home");
  };

  const formatDate = (date: Date) => {
    // 実行環境（JST以外）でも常に日本時間で表示されるようにIntl.DateTimeFormatを使用する
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    
    const parts = formatter.formatToParts(date);
    const partMap = new Map(parts.map((p) => [p.type, p.value]));
    
    const y = partMap.get("year") || "";
    const m = partMap.get("month") || "";
    const d = partMap.get("day") || "";
    const hours = partMap.get("hour") || "";
    const minutes = partMap.get("minute") || "";
    const seconds = partMap.get("second") || "";
    
    const weekdayFormatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      weekday: "short",
    });
    const day = weekdayFormatter.format(date);

    return `${y}年${m}月${d}日(${day}) ${hours}:${minutes}:${seconds}`;
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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center space-x-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ minHeight: "44px" }}
            aria-label="戻る"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>戻る</span>
          </button>
          <h1 className="text-lg font-bold text-slate-900">
            打刻モード選択
          </h1>
          <div className="w-[76px]" /> {/* 左右のバランスを保つためのスペーサー */}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
        {/* 現在日時表示領域 */}
        <div className="text-center mb-8 bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm w-full max-w-md">
          <span className="text-xs font-semibold text-slate-500 tracking-wider block mb-1">現在の打刻対象日時</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight" data-testid="current-time">
            {currentTime ? formatDate(currentTime) : "---"}
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            打刻モードを選択してください
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            屋外作業時や手袋着用時でもタップしやすい大型ボタンです。出勤か退勤かを選択してください。
          </p>
        </div>

        {/* 出勤・退勤の大型選択ボタン */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 w-full max-w-2xl">
          {/* 出勤ボタン */}
          <button
            onClick={() => handleSelectMode("CLOCK_IN")}
            className="flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500 active:border-blue-600 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ minHeight: "200px" }}
            data-testid="clock-in-btn"
          >
            <div className="p-4 bg-blue-50 text-blue-600 rounded-full group-hover:bg-blue-100 transition-colors">
              <SunIcon className="h-12 w-12" />
            </div>
            <span className="mt-4 text-2xl font-extrabold text-slate-950">
              出勤
            </span>
            <span className="mt-2 text-sm text-slate-500 text-center font-medium">
              本日の作業を開始します
            </span>
          </button>

          {/* 退勤ボタン */}
          <button
            onClick={() => handleSelectMode("CLOCK_OUT")}
            className="flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-orange-500 active:border-orange-600 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            style={{ minHeight: "200px" }}
            data-testid="clock-out-btn"
          >
            <div className="p-4 bg-orange-50 text-orange-600 rounded-full group-hover:bg-orange-100 transition-colors">
              <MoonIcon className="h-12 w-12" />
            </div>
            <span className="mt-4 text-2xl font-extrabold text-slate-950">
              退勤
            </span>
            <span className="mt-2 text-sm text-slate-500 text-center font-medium">
              本日の作業を終了します
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}