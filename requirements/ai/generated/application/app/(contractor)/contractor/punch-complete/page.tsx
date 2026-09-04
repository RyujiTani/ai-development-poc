'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../../components/ui/button';
import { sessionManager, Session } from '../../../../lib/auth/session';
import { logger } from '../../../../lib/logger/logger';
import { useAttendanceStore } from '../../../../features/attendance/store/useAttendanceStore';

export default function PunchCompletePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const { lastPunchSummary, setLastPunchSummary } = useAttendanceStore();

  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'CONTRACTOR_MANAGER') {
      logger.warn('unauthorized_access_redirect_from_punch_complete', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.push('/login');
      return;
    }
    setSession(currentSession);
    setLoading(false);
    logger.info('punch_complete_page_loaded', { user_id: currentSession.user_id });
  }, [router]);

  const handleHome = () => {
    logger.info('punch_complete_return_to_home', { user_id: session?.user_id });
    setLastPunchSummary(null);
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

  const punchTypeDisplay = lastPunchSummary?.punchType === 'CLOCK_IN' ? '出勤' : lastPunchSummary?.punchType === 'CLOCK_OUT' ? '退勤' : '打刻';
  const workerCountDisplay = lastPunchSummary?.workerCount ?? 0;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col justify-center items-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">送信完了</h1>
          <p className="mt-2 text-sm text-gray-500">
            打刻データと証拠写真が正常に送信され、データベースに保存されました。
          </p>
        </div>

        {/* 送信完了データ表示領域 */}
        <div className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl p-5 my-2 max-w-sm mx-auto shadow-inner">
          <p className="text-xs font-bold text-indigo-700 tracking-wider uppercase mb-3">送信内容サマリー</p>
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="text-center border-r border-indigo-100 pr-2">
              <span className="text-[10px] font-bold text-gray-400 block mb-1">打刻種別</span>
              <span id="punch-type-display" className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                lastPunchSummary?.punchType === 'CLOCK_IN' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : lastPunchSummary?.punchType === 'CLOCK_OUT'
                  ? 'bg-orange-100 text-orange-800 border border-orange-200'
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}>
                {punchTypeDisplay}
              </span>
            </div>
            <div className="text-center pl-2">
              <span className="text-[10px] font-bold text-gray-400 block mb-1">対象人数</span>
              <p className="text-gray-900">
                <span id="worker-count-display" className="text-2xl font-extrabold text-indigo-600">{workerCountDisplay}</span>
                <span className="text-xs font-bold text-gray-500 ml-1">名</span>
              </p>
            </div>
          </div>
        </div>

        <div className="w-full pt-4">
          <Button
            id="home-back-button"
            onClick={handleHome}
            className="h-14 font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-base rounded-xl transition duration-150 ease-in-out w-full shadow-md hover:shadow-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            ホームへ戻る
          </Button>
        </div>
      </div>
    </main>
  );
}