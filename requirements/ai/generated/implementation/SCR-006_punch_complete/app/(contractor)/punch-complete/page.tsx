'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/authStore';
import { useAttendanceStore } from '@/features/attendance/store/attendanceStore';

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function PunchCompletePage() {
  const router = useRouter();
  const { user, initialize } = useAuthStore();
  const { lastPunchResult } = useAttendanceStore();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    initialize();
    setIsLoaded(true);
  }, [initialize]);

  useEffect(() => {
    if (isLoaded) {
      const storedUser = sessionStorage.getItem('auth_user');
      if (!storedUser) {
        router.push('/login');
        return;
      }
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role !== 'CONTRACTOR_MANAGER') {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    }
  }, [isLoaded, router]);

  if (!isLoaded || !user || user.role !== 'CONTRACTOR_MANAGER') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">読み込み中...</p>
      </div>
    );
  }

  const punchTypeText = lastPunchResult?.punchType === 'CLOCK_IN' ? '出勤' : lastPunchResult?.punchType === 'CLOCK_OUT' ? '退勤' : '打刻';
  const workerCount = lastPunchResult?.workerCount ?? 0;
  const formattedTime = lastPunchResult?.timestamp
    ? new Date(lastPunchResult.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  const handleGoHome = () => {
    router.push('/contractor/home');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* 簡易ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200 py-4 px-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 bg-gray-100 py-1 px-3 rounded-full">
          {user.display_name}
        </span>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
          {/* 完了アイコン */}
          <div className="flex justify-center mb-6">
            <CheckCircleIcon className="h-16 w-16 text-green-500 animate-bounce" />
          </div>

          {/* メイン完了文言 */}
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
            打刻の送信が完了しました
          </h1>
          <p className="text-gray-500 mb-8 text-sm md:text-base">
            打刻データは正常に保存されました。
          </p>

          {/* 送信完了詳細 (SCR-006-DT-001) */}
          <div className="bg-gray-50 rounded-xl p-5 mb-8 text-left border border-gray-100">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">送信内容サマリー</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-gray-400" /> 打刻種別
                </span>
                <span className={`text-base font-bold px-3 py-1 rounded-full ${
                  lastPunchResult?.punchType === 'CLOCK_IN' 
                    ? 'bg-blue-100 text-blue-800' 
                    : lastPunchResult?.punchType === 'CLOCK_OUT' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {punchTypeText}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm flex items-center gap-1.5">
                  <UsersIcon className="h-4 w-4 text-gray-400" /> 対象人数
                </span>
                <span className="text-lg font-bold text-gray-800">
                  {workerCount > 0 ? `${workerCount} 名` : '不明（直接アクセス）'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">打刻時刻</span>
                <span className="text-sm font-semibold text-gray-700">{formattedTime}</span>
              </div>
            </div>
          </div>

          {/* ホームへ戻るボタン (SCR-006-UI-002, SCR-006-FN-002) */}
          <button
            onClick={handleGoHome}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-4 px-6 rounded-xl transition duration-150 ease-in-out shadow-lg shadow-indigo-100 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <HomeIcon className="h-5 w-5" />
            ホームへ戻る
          </button>
        </div>
      </main>

      {/* 簡易フッター */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
        &copy; {new Date().getFullYear()} worker-attendance-system-frontend
      </footer>
    </div>
  );
}