'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/store';
import { usePunchStore } from '@/features/attendance/store/punchStore';

export default function PunchModePage() {
  const router = useRouter();
  const { user, isAuthenticated, initialize } = useAuthStore();
  const { setPunchMode } = usePunchStore();
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [isClient, setIsClient] = useState(false);

  // クライアントサイドでのハイドレーションと初期化
  useEffect(() => {
    setIsClient(true);
    initialize();
  }, [initialize]);

  // 未認証リダイレクト（CONTRACTOR_MANAGERロール確認含む）
  useEffect(() => {
    if (isClient) {
      if (!isAuthenticated || !user || user.role !== 'CONTRACTOR_MANAGER') {
        router.replace('/login');
      }
    }
  }, [isClient, isAuthenticated, user, router]);

  // 現在日時の表示更新
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentDateTime(`${year}年${month}月${date}日 ${hours}:${minutes}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectMode = (mode: 'CLOCK_IN' | 'CLOCK_OUT') => {
    setPunchMode(mode);
    router.push('/(contractor)/worker-select');
  };

  const handleBack = () => {
    router.push('/(contractor)/home');
  };

  if (!isClient || !user || user.role !== 'CONTRACTOR_MANAGER') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500 animate-pulse">読み込み中...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-between p-4 md:p-8">
      {/* ヘッダー情報表示 */}
      <header className="max-w-md w-full mx-auto bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500">ログインユーザー</p>
            <p className="text-sm font-bold text-gray-800">{user.display_name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">現在日時</p>
            <p className="text-sm font-bold text-blue-600" data-testid="current-datetime">
              {currentDateTime || '----年--月--日 --:--'}
            </p>
          </div>
        </div>
      </header>

      {/* モード選択領域 */}
      <section className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">打刻モード選択</h1>
          <p className="text-sm text-gray-600 mt-2">
            本日の作業状況に合わせて、いずれかのボタンをタップしてください。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 出勤（作業開始）ボタン */}
          <button
            onClick={() => handleSelectMode('CLOCK_IN')}
            className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all duration-150 h-48 focus:outline-none focus:ring-4 focus:ring-emerald-300 focus:ring-offset-2"
            aria-label="出勤"
          >
            <span className="text-4xl mb-2">🚀</span>
            <span className="text-xl font-black tracking-wider">出勤</span>
            <span className="text-xs opacity-90 mt-1">作業を開始します</span>
          </button>

          {/* 退勤（作業終了）ボタン */}
          <button
            onClick={() => handleSelectMode('CLOCK_OUT')}
            className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all duration-150 h-48 focus:outline-none focus:ring-4 focus:ring-amber-300 focus:ring-offset-2"
            aria-label="退勤"
          >
            <span className="text-4xl mb-2">🏡</span>
            <span className="text-xl font-black tracking-wider">退勤</span>
            <span className="text-xs opacity-90 mt-1">作業を終了します</span>
          </button>
        </div>
      </section>

      {/* フッター（戻る） */}
      <footer className="max-w-md w-full mx-auto mt-6">
        <button
          onClick={handleBack}
          className="w-full py-4 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-bold rounded-xl shadow-sm transition-colors text-center focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          ホーム画面へ戻る
        </button>
      </footer>
    </main>
  );
}