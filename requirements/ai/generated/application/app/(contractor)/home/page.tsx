"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { User } from "@/features/user/domain/types";

// SVGアイコンコンポーネント（lucide-react等の外部パッケージ依存を排除するため）
const LogOutIcon = ({ className }: { className?: string }) => (
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
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const CalendarClockIcon = ({ className }: { className?: string }) => (
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
    <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h5" />
    <path d="M17.5 17.5 16 16.25V14" />
    <circle cx="16" cy="16" r="6" />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
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
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
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
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

export default function ContractorHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuthAndLoadUser() {
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

      try {
        const db = await getDB();
        const tx = db.transaction("users", "readonly");
        const userData: User | undefined = await tx.objectStore("users").get(storedId);
        await tx.done;

        if (userData) {
          setUser(userData);
        } else {
          // ユーザーデータが見つからない場合はセッションを破棄してログイン画面へ
          logout();
          router.push("/login");
        }
      } catch (error) {
        console.error("Failed to load user info", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthAndLoadUser();
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
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

  // 認証が通っていない場合は何も表示しない（リダイレクト待ち）
  if (!user) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      {/* ヘッダー領域 */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">外注作業員管理システム</span>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">
              {user.display_name} 様
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ minHeight: "44px" }}
            aria-label="ログアウト"
          >
            <LogOutIcon className="h-4 w-4" />
            <span className="hidden sm:inline">ログアウト</span>
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-center">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            メニュー選択
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            ご希望の操作を選択してください。屋外や手袋着用時でもタップしやすい大型のカードボタンです。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* 打刻メニューボタン */}
          <button
            onClick={() => router.push("/punch-mode")}
            className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ minHeight: "160px" }}
          >
            <div className="p-4 bg-blue-50 text-blue-600 rounded-full group-hover:bg-blue-100 transition-colors">
              <CalendarClockIcon className="h-10 w-10" />
            </div>
            <span className="mt-4 text-xl font-bold text-slate-900">
              打刻
            </span>
            <span className="mt-1.5 text-xs text-slate-500 text-center">
              作業員の出勤・退勤の打刻を行います（写真撮影込）
            </span>
          </button>

          {/* 打刻修正・手動登録メニューボタン */}
          <button
            onClick={() => router.push("/punch-correction")}
            className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ minHeight: "160px" }}
            data-testid="punch-correction-menu-btn"
          >
            <div className="p-4 bg-amber-50 text-amber-600 rounded-full group-hover:bg-amber-100 transition-colors">
              <EditIcon className="h-10 w-10" />
            </div>
            <span className="mt-4 text-xl font-bold text-slate-900">
              打刻修正・登録
            </span>
            <span className="mt-1.5 text-xs text-slate-500 text-center">
              打刻漏れの手動登録や、誤った打刻記録の修正を行います
            </span>
          </button>

          {/* 作業員管理メニューボタン */}
          <button
            onClick={() => router.push("/workers")}
            className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ minHeight: "160px" }}
          >
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full group-hover:bg-emerald-100 transition-colors">
              <UsersIcon className="h-10 w-10" />
            </div>
            <span className="mt-4 text-xl font-bold text-slate-900">
              作業員管理
            </span>
            <span className="mt-1.5 text-xs text-slate-500 text-center">
              自社の作業員一覧の確認・新規追加・編集を行います
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}