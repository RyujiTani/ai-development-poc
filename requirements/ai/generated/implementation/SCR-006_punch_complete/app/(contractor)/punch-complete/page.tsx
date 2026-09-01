'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { CheckCircle2, Home } from 'lucide-react';

function PunchCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState(false);

  const mode = searchParams.get('mode') || 'CLOCK_IN';
  const countStr = searchParams.get('count') || '1';
  const count = parseInt(countStr, 10) || 1;

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'CONTRACTOR_MANAGER') {
      router.push('/login');
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500 font-medium animate-pulse">認証情報を確認中...</p>
      </div>
    );
  }

  const modeText = mode === 'CLOCK_OUT' ? '退勤' : '出勤';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md text-center border border-gray-100">
        {/* アイコン表示領域 */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-50 p-4 text-green-500">
            <CheckCircle2 className="h-16 w-16" data-testid="complete-icon" />
          </div>
        </div>

        {/* メッセージ領域 */}
        <h1 className="mb-2 text-2xl font-bold text-gray-900 tracking-tight">
          打刻データの送信が完了しました
        </h1>
        <p className="mb-6 text-sm text-gray-500 leading-relaxed">
          登録された打刻実績はシステムへ正常に保存されました。
        </p>

        {/* 打刻詳細表示 */}
        <div className="mb-8 rounded-xl bg-gray-50 p-5 text-left border border-gray-100">
          <div className="flex justify-between py-3 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-500">打刻種別</span>
            <span className="text-sm font-bold text-gray-800" data-testid="punch-type">
              {modeText}
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-sm font-medium text-gray-500">対象人数</span>
            <span className="text-sm font-bold text-gray-800" data-testid="punch-count">
              {count}名
            </span>
          </div>
        </div>

        {/* ナビゲーションボタン */}
        <button
          onClick={() => router.push('/contractor/home')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 px-4 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 active:bg-indigo-700 transition-colors"
          data-testid="home-button"
        >
          <Home className="h-5 w-5" />
          ホームへ戻る
        </button>
      </div>
    </div>
  );
}

export default function PunchCompletePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    }>
      <PunchCompleteContent />
    </Suspense>
  );
}
"
    },
    {