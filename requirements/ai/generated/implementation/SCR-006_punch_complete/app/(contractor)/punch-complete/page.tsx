'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PunchCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const punchType = searchParams.get('type'); // 'CLOCK_IN' | 'CLOCK_OUT'
  const countStr = searchParams.get('count');
  const count = countStr ? parseInt(countStr, 10) : null;

  useEffect(() => {
    // 認証状態の検証 (SCR-006-VL-001)
    try {
      const sessionStr = sessionStorage.getItem('session');
      if (!sessionStr) {
        router.push('/login');
        return;
      }
      const session = JSON.parse(sessionStr);
      if (session.role !== 'CONTRACTOR_MANAGER') {
        router.push('/login');
        return;
      }
      setIsAuthenticated(true);
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 前画面からのパラメータをもとに動的メッセージを補完 (SCR-006-DT-001, SCR-006-ST-002)
  let subMessage = '打刻データの送信が完了しました。';
  if (punchType && count !== null && !isNaN(count)) {
    const typeText = punchType === 'CLOCK_IN' ? '出勤' : '退勤';
    subMessage = `${typeText}打刻を ${count} 名分送信しました。`;
  }

  const handleGoHome = () => {
    // 外注先ホーム画面（SCR-002）へのクライアントサイドルーティング (SCR-006-EV-001)
    router.push('/home');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      {/* 画面中央に大きく目立つように配置 (SCR-006-UI-001, SCR-006-UI-003) */}
      <div className="w-full max-w-md flex flex-col justify-center items-center text-center space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col items-center">
          {/* 送信成功を示すビジュアルアイコン */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>

          {/* 送信完了メッセージ (SCR-006-FN-001) */}
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            送信完了
          </h1>
          <p className="mt-4 text-base text-gray-600 font-medium leading-relaxed">
            {subMessage}
          </p>
        </div>

        {/* タッチミスを防ぐ十分なサイズ（最小高さ48px / h-12）のボタン (SCR-006-FN-002, SCR-006-UI-002) */}
        <div className="w-full pt-4">
          <button
            type="button"
            onClick={handleGoHome}
            className="flex w-full items-center justify-center rounded-xl bg-blue-600 h-12 px-4 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-blue-700 transition duration-150 ease-in-out"
          >
            ホームへ戻る
          </button>
        </div>
      </div>
    </main>
  );
}