'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/authStore';
import { useAttendanceStore } from '@/features/attendance/usecase/attendanceState';

export default function PunchModePage() {
  const router = useRouter();
  const { user, initialize, logout } = useAuthStore();
  const { setPunchType } = useAttendanceStore();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(true);

  // 認証の初期化
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 認証状態の確認とリダイレクト
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('auth_user') : null;
    if (!stored && !user) {
      router.replace('/login');
    } else {
      setIsRedirecting(false);
    }
  }, [user, router]);

  // 現在日時の自動更新
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isRedirecting || (!user && typeof window !== 'undefined' && !sessionStorage.getItem('auth_user'))) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 animate-pulse text-lg">読み込み中...</p>
      </div>
    );
  }

  const formatDateTime = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

    return `${yyyy}年${mm}月${dd}日 (${dayOfWeek}) ${hours}:${minutes}:${seconds}`;
  };

  const handleSelectMode = (type: 'CLOCK_IN' | 'CLOCK_OUT') => {
    setPunchType(type);
    router.push('/contractor/select-workers');
  };

  const handleBack = () => {
    router.push('/contractor/home');
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {/* ヘッダー領域 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="戻る"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-gray-700">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">打刻モード選択</h1>
            <p className="text-xs text-gray-500">{user?.display_name || '管理者'} (外注先管理者)</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-md transition-colors text-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span className="hidden sm:inline">ログアウト</span>
        </button>
      </header>

      {/* メインコンテンツ */}
      <div className="flex-1 max-w-md w-full mx-auto px-4 py-8 flex flex-col justify-center items-center space-y-8">
        {/* 現在日時表示領域 */}
        <div className="w-full bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-center">
          <div className="flex items-center justify-center space-x-2 text-gray-500 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-indigo-500">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span className="text-sm font-medium tracking-wider uppercase">現在時刻</span>
          </div>
          <div className="text-lg md:text-xl font-bold text-gray-800 tracking-tight min-h-[1.75rem]">
            {currentTime ? formatDateTime(currentTime) : '---年--月--日 (-) --:--:--'}
          </div>
        </div>

        {/* 出勤・退勤の２大選択ボタン */}
        <div className="w-full flex flex-col space-y-4">
          <button
            onClick={() => handleSelectMode('CLOCK_IN')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-8 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center space-y-3 border-2 border-emerald-500"
            style={{ minHeight: '160px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 stroke-[2]">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <div className="text-center">
              <span className="block text-2xl font-black tracking-widest mb-1">出勤</span>
              <span className="block text-sm text-emerald-100 font-medium">作業開始時にタップしてください</span>
            </div>
          </button>

          <button
            onClick={() => handleSelectMode('CLOCK_OUT')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-8 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center space-y-3 border-2 border-indigo-500"
            style={{ minHeight: '160px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 stroke-[2]">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <div className="text-center">
              <span className="block text-2xl font-black tracking-widest mb-1">退勤</span>
              <span className="block text-sm text-indigo-100 font-medium">作業終了時にタップしてください</span>
            </div>
          </button>
        </div>

        {/* 画面下部の戻るボタン */}
        <button
          onClick={handleBack}
          className="w-full border-2 border-gray-300 hover:bg-gray-100 active:scale-[0.99] text-gray-700 py-3 rounded-xl font-bold text-base transition-all flex items-center justify-center space-x-2 bg-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>ホーム画面へ戻る</span>
        </button>
      </div>

      {/* フッター */}
      <footer className="py-4 text-center bg-white border-t border-gray-100">
        <p className="text-xs text-gray-400">© 2026 worker-attendance-system-frontend</p>
      </footer>
    </main>
  );
}