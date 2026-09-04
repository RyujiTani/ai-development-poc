'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sessionManager, Session } from '../../../../lib/auth/session';
import { useToast } from '../../../../components/ui/toast';
import { logger } from '../../../../lib/logger/logger';
import { useAttendanceStore } from '../../../../features/attendance/store/useAttendanceStore';

export default function PunchModeSelectPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const { setPunchType, clearAttendanceSession } = useAttendanceStore();

  // 認証チェック
  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'CONTRACTOR_MANAGER') {
      logger.warn('unauthorized_access_redirect', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.push('/login');
      return;
    }
    setSession(currentSession);
    setLoading(false);
    logger.info('punch_mode_select_loaded', { user_id: currentSession.user_id });
    
    // 画面遷移時に打刻セッションをクリア
    clearAttendanceSession();
  }, [router, clearAttendanceSession]);

  // 現在日時の更新（1秒毎）
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date | null) => {
    if (!date) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${yyyy}/${mm}/${dd} (${dayOfWeek}) ${hours}:${minutes}:${seconds}`;
  };

  const handleSelectMode = (type: 'CLOCK_IN' | 'CLOCK_OUT') => {
    logger.info('punch_mode_selected', { punch_type: type, user_id: session?.user_id });
    setPunchType(type);
    router.push('/contractor/worker-select');
  };

  const handleBack = () => {
    logger.info('punch_mode_back_to_home', { user_id: session?.user_id });
    router.push('/contractor');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
              aria-label="戻る"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-indigo-600 tracking-wider">勤怠・配置管理</span>
              <span className="text-sm font-bold text-gray-900 sm:text-base">打刻モード選択</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">{session?.display_name} 様</p>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        {/* 現在日時表示領域 */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-2 text-indigo-700 shadow-sm mb-4">
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span id="current-time-display" className="text-sm sm:text-base font-mono font-bold tracking-wider">
              {formatDateTime(currentTime)}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">
            打刻モードを選択してください
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            本日の作業開始（出勤）または作業終了（退勤）を選択します。
          </p>
        </div>

        {/* 2つの大きな選択ボタン */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full px-2">
          {/* 出勤ボタン */}
          <button
            id="punch-in-button"
            onClick={() => handleSelectMode('CLOCK_IN')}
            className="flex flex-col items-center justify-center bg-white p-8 sm:p-10 rounded-2xl shadow-md border-2 border-transparent hover:border-emerald-500 hover:shadow-xl active:bg-emerald-50/50 transition duration-200 ease-in-out text-center group min-h-[180px] sm:min-h-[220px] cursor-pointer"
          >
            <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition duration-150">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition">
              出勤（作業開始）
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              現場に入場し、作業を開始する際に選択します。
            </p>
          </button>

          {/* 退勤ボタン */}
          <button
            id="punch-out-button"
            onClick={() => handleSelectMode('CLOCK_OUT')}
            className="flex flex-col items-center justify-center bg-white p-8 sm:p-10 rounded-2xl shadow-md border-2 border-transparent hover:border-orange-500 hover:shadow-xl active:bg-orange-50/50 transition duration-200 ease-in-out text-center group min-h-[180px] sm:min-h-[220px] cursor-pointer"
          >
            <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-4 group-hover:bg-orange-100 transition duration-150">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition">
              退勤（作業終了）
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              現場の作業をすべて終了し、退場する際に選択します。
            </p>
          </button>
        </div>

        {/* 戻るフッター（モバイル配慮） */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleBack}
            className="px-6 h-12 rounded-xl text-gray-600 hover:text-gray-900 border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 shadow-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer w-full max-w-[200px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            メニューに戻る
          </button>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-gray-400">
          &copy; 2026 勤怠・配置管理システム プロトタイプ版
        </div>
      </footer>
    </div>
  );
}