'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/authStore';

export default function ContractorHomePage() {
  const router = useRouter();
  const { session, isLoading, initialize, logout } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    } else if (!isLoading && session && session.role !== 'CONTRACTOR_MANAGER') {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navigateToPunch = () => {
    router.push('/punch/mode');
  };

  const navigateToWorkers = () => {
    router.push('/workers');
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 animate-pulse text-lg font-medium">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase">外注先ポータル</span>
            <h1 className="text-lg font-bold text-gray-800 truncate animate-fade-in" data-testid="user-display-name">
              {session.display_name} 様
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md border border-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* 打刻メニューボタン */}
          <button
            onClick={navigateToPunch}
            className="flex flex-col items-center justify-center p-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-blue-300 min-h-[220px]"
            aria-label="打刻画面へ進む"
          >
            <div className="p-4 bg-white/10 rounded-full mb-4">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-wide">打刻</span>
            <span className="text-sm text-blue-100 mt-2 text-center">作業員の出勤・退勤を記録します</span>
          </button>

          {/* 作業員管理メニューボタン */}
          <button
            onClick={navigateToWorkers}
            className="flex flex-col items-center justify-center p-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-emerald-300 min-h-[220px]"
            aria-label="作業員管理画面へ進む"
          >
            <div className="p-4 bg-white/10 rounded-full mb-4">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-wide">作業員管理</span>
            <span className="text-sm text-emerald-100 mt-2 text-center">作業員の登録・資格・講習を管理します</span>
          </button>
        </div>
      </main>

      {/* フッター */}
      <footer className="py-6 text-center text-xs text-gray-400 bg-white border-t border-gray-100">
        &copy; 2026 外注作業員 勤怠・配置管理システム
      </footer>
    </div>
  );
}