'use client';

import React from 'react';
import { useAuth } from '../../../lib/auth/authContext';
import { useRouter } from 'next/navigation';

function ClockIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function UsersIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function LogOutIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
    </svg>
  );
}

export default function ContractorHomePage() {
  const { currentUser, isLoading, logout } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-bold tracking-wider">外注作業員管理</span>
            <span className="text-lg font-bold text-gray-800 truncate max-w-[200px] sm:max-w-xs">
              {currentUser.display_name} 様
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            aria-label="ログアウト"
          >
            <LogOutIcon className="h-4 w-4 text-gray-500" />
            <span className="hidden sm:inline">ログアウト</span>
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">外注先管理者メニュー</h1>
          <p className="mt-2 text-sm text-gray-600">
            現場での代行打刻、または所属する作業員情報の管理を行えます。
          </p>
        </div>

        {/* ２つの大きなメニューボタン */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* 打刻メニュー */}
          <button
            onClick={() => router.push('/punch-mode')}
            className="flex flex-col items-center justify-center p-8 bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 h-64 sm:h-80"
          >
            <div className="p-4 bg-blue-50 rounded-full text-blue-600 mb-6">
              <ClockIcon className="h-12 w-12 sm:h-16 sm:w-16" />
            </div>
            <span className="text-xl sm:text-2xl font-extrabold text-gray-950">打刻する</span>
            <span className="mt-3 text-sm text-gray-500 text-center max-w-[240px]">
              作業員の出勤・退勤の打刻を行います（写真撮影付き）
            </span>
          </button>

          {/* 作業員管理メニュー */}
          <button
            onClick={() => router.push('/workers')}
            className="flex flex-col items-center justify-center p-8 bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 h-64 sm:h-80"
          >
            <div className="p-4 bg-green-50 rounded-full text-green-600 mb-6">
              <UsersIcon className="h-12 w-12 sm:h-16 sm:w-16" />
            </div>
            <span className="text-xl sm:text-2xl font-extrabold text-gray-950">作業員管理</span>
            <span className="mt-3 text-sm text-gray-500 text-center max-w-[240px]">
              自社所属作業員の登録、資格情報の確認・編集を行います
            </span>
          </button>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gray-50 border-t border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-gray-500">
          © 2026 worker-attendance-system-frontend. All rights reserved.
        </div>
      </footer>
    </div>
  );
}