"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAttendanceStore } from '@/features/attendance/store/useAttendanceStore';
import { logger } from '@/lib/logger';

export default function PunchCompletePage() {
  const router = useRouter();
  const { punchType, selectedWorkerIds, clear } = useAttendanceStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // マウント時の打刻サマリー情報を保持
  const [savedPunchType] = useState(punchType);
  const [savedWorkerCount] = useState(selectedWorkerIds.length);

  useEffect(() => {
    const userId = sessionStorage.getItem('user_id');
    const role = sessionStorage.getItem('role');

    if (!userId || role !== 'CONTRACTOR_MANAGER') {
      router.replace('/login');
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  const handleBackToHome = () => {
    logger.info('COMPLETE_PAGE_BACK_TO_HOME');
    clear();
    router.push('/home');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-lg max-w-md w-full text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="3"
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4" data-testid="complete-title">
          打刻が完了しました
        </h1>

        {/* 送信成功情報のサマリー表示領域 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100 text-left">
          <div className="flex justify-between items-center py-2.5 border-b border-gray-200">
            <span className="text-gray-500 text-sm">打刻モード</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                savedPunchType === 'CLOCK_IN'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
              data-testid="complete-punch-type"
            >
              {savedPunchType === 'CLOCK_IN' ? '出勤' : savedPunchType === 'CLOCK_OUT' ? '退勤' : '未設定'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-gray-500 text-sm">対象人数</span>
            <span className="font-bold text-gray-900" data-testid="complete-worker-count">
              {savedWorkerCount} 名
            </span>
          </div>
        </div>

        <p className="text-gray-600 mb-8 text-sm">
          打刻データおよび証拠写真が正常に送信され、ローカルデータベースに保存されました。
        </p>
        <button
          onClick={handleBackToHome}
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[44px]"
          data-testid="complete-home-btn"
        >
          メニューへ戻る
        </button>
      </div>
    </div>
  );
}