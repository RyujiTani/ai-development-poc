"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAttendanceStore } from '@/features/attendance/store/useAttendanceStore';
import { logger } from '@/lib/logger';

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default function PunchModePage() {
  const router = useRouter();
  const { setPunchType } = useAttendanceStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    const userId = sessionStorage.getItem('user_id');
    const role = sessionStorage.getItem('role');

    if (!userId || role !== 'CONTRACTOR_MANAGER') {
      logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: '/punch-mode' });
      router.replace('/login');
      return;
    }

    setIsAuthenticated(true);
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleSelectMode = (type: 'CLOCK_IN' | 'CLOCK_OUT') => {
    logger.info('PUNCH_MODE_SELECTED', { punch_type: type });
    setPunchType(type);
    router.push('/workers-select');
  };

  const handleBack = () => {
    logger.info('NAVIGATE_BACK_TO_HOME');
    router.push('/home');
  };

  if (!isAuthenticated) {
    return null;
  }

  const formatDateTime = (date: Date | null) => {
    if (!date) return '';
    try {
      const formatter = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tokyo',
      });
      const parts = formatter.formatToParts(date);
      const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
      return `${partMap.year}/${partMap.month}/${partMap.day} ${partMap.hour}:${partMap.minute}:${partMap.second}`;
    } catch (e) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      const ss = String(date.getSeconds()).padStart(2, '0');
      return `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー領域 */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-6 w-6 text-indigo-600" />
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
              打刻モード選択
            </h1>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 h-10 px-4 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <span>戻る</span>
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
        {/* 現在日時表示領域 */}
        <div className="text-center mb-10 bg-indigo-50 border border-indigo-100 rounded-xl p-4 w-full max-w-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            現在日時
          </p>
          <p className="text-2xl font-mono font-bold text-indigo-900" data-testid="current-time">
            {formatDateTime(currentTime)}
          </p>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            打刻の種類を選択してください
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 w-full max-w-2xl">
          {/* 出勤ボタン */}
          <button
            onClick={() => handleSelectMode('CLOCK_IN')}
            className="flex flex-col items-center justify-center p-8 bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-600 transition-all duration-200 group h-52 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            data-testid="clock-in-btn"
          >
            <div className="flex h-16 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <span className="text-2xl font-bold">出</span>
            </div>
            <h3 className="mt-4 text-2xl font-extrabold text-gray-900">
              出勤（作業開始）
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              本日の作業を開始する作業員を選択します
            </p>
          </button>

          {/* 退勤ボタン */}
          <button
            onClick={() => handleSelectMode('CLOCK_OUT')}
            className="flex flex-col items-center justify-center p-8 bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-600 transition-all duration-200 group h-52 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            data-testid="clock-out-btn"
          >
            <div className="flex h-16 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
              <span className="text-2xl font-bold">退</span>
            </div>
            <h3 className="mt-4 text-2xl font-extrabold text-gray-900">
              退勤（作業終了）
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              本日の作業を終了する作業員を選択します
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}