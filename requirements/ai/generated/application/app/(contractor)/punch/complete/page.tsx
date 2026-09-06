'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function PunchCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const type = searchParams.get('type');
  const countStr = searchParams.get('count');
  const count = countStr ? parseInt(countStr, 10) : 0;

  // 認証チェック
  useEffect(() => {
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    const userId = sessionStorage.getItem('user_id');
    const role = sessionStorage.getItem('role');

    if (!userId || role !== 'CONTRACTOR_MANAGER') {
      logger.warn('UNAUTHORIZED_ACCESS_ATTEMPT', { userId, role });
      router.push('/login');
    } else {
      setIsAuthenticated(true);
      setIsLoading(false);
    }
  }, [router]);

  const handleGoHome = () => {
    logger.info('PUNCH_COMPLETE_GO_HOME_TRIGGERED');
    router.push('/contractor/home');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  // 表示文言の決定
  const modeText = type === 'CLOCK_IN' ? '出勤' : type === 'CLOCK_OUT' ? '退勤' : null;
  const message = modeText 
    ? `${modeText}打刻を完了しました（対象: ${count}名）`
    : '打刻送信が完了しました';

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">打刻送信完了</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 mx-auto max-w-md w-full px-4 py-12 flex flex-col justify-center items-center space-y-8">
        <div className="bg-white rounded-xl shadow p-8 w-full text-center space-y-6">
          {/* 完了を表す大きな緑のアイコン */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">送信完了</h2>
            <p className="text-base text-gray-600" data-testid="complete-message">
              {message}
            </p>
          </div>
        </div>

        {/* 大きくタップしやすい「ホームへ戻る」ボタン（高さ56px / タップに十分なサイズ） */}
        <button
          onClick={handleGoHome}
          className="w-full rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors shadow-md flex items-center justify-center text-base"
          style={{ minHeight: '56px' }}
          data-testid="go-home-button"
        >
          ホームへ戻る
        </button>
      </main>
    </div>
  );
}