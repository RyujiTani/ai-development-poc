'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAttendanceStore } from '@/features/attendance/store/attendanceStore';
import { initDB } from '@/lib/db/indexedDB';
import { User } from '@/features/attendance/domain/types';
import { logger } from '@/lib/logger';
import { logoutMock } from '@/lib/auth/mockAuth';

export default function PunchModeSelectPage() {
  const router = useRouter();
  const { setPunchType, reset } = useAttendanceStore();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);

  // 認証および権限チェック
  useEffect(() => {
    async function checkAuth() {
      if (typeof window === 'undefined' || !window.sessionStorage) return;

      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'CONTRACTOR_MANAGER') {
        logger.warn('UNAUTHORIZED_ACCESS_ATTEMPT', { userId, role });
        router.push('/login');
        return;
      }

      try {
        const db = await initDB();
        const tx = db.transaction('users', 'readonly');
        const store = tx.objectStore('users');
        const user = (await store.get(userId)) as User | undefined;

        if (!user || user.role !== 'CONTRACTOR_MANAGER' || user.status !== 'ACTIVE') {
          logger.warn('INVALID_USER_OR_ROLE', { userId });
          logoutMock();
          router.push('/login');
          return;
        }

        setCurrentUser(user);
        logger.info('FETCH_USER_SUCCESS', { userId: user.user_id });
      } catch (error) {
        logger.error('FETCH_USER_FAILED', { error: String(error) });
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  // 現在日時のリアルタイム自動更新
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectMode = (type: 'CLOCK_IN' | 'CLOCK_OUT') => {
    setPunchType(type);
    logger.info('PUNCH_MODE_SELECTED', { punchType: type, userId: currentUser?.user_id });
    router.push('/contractor/worker-select');
  };

  const handleBack = () => {
    reset();
    logger.info('PUNCH_MODE_SELECT_CANCELLED', { userId: currentUser?.user_id });
    router.push('/contractor/home');
  };

  const formatDateTime = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${y}年${m}月${d}日(${dayOfWeek}) ${h}:${min}:${s}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">打刻モード選択</h1>
            {currentUser && (
              <p className="text-sm text-gray-600 mt-1">
                ログイン中: <span className="font-semibold">{currentUser.display_name}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleBack}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-505 transition-colors"
            style={{ minHeight: '44px' }}
          >
            戻る
          </button>
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 mx-auto max-w-md w-full px-4 py-8 flex flex-col justify-center space-y-6">
        {/* 現在日時表示領域 */}
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <p className="text-sm font-medium text-gray-500 mb-1">現在の日時</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-600 tracking-wider font-mono">
            {now ? formatDateTime(now) : '読み込み中...'}
          </p>
        </div>

        {/* 出勤・退勤の大きなタップボタン */}
        <div className="flex flex-col gap-6">
          <button
            onClick={() => handleSelectMode('CLOCK_IN')}
            className="flex h-36 w-full flex-col items-center justify-center rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-colors border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ minHeight: '48px' }}
          >
            <span className="text-3xl font-extrabold tracking-wide">出勤</span>
            <span className="text-sm mt-2 font-medium">作業開始の打刻を行います</span>
          </button>

          <button
            onClick={() => handleSelectMode('CLOCK_OUT')}
            className="flex h-36 w-full flex-col items-center justify-center rounded-xl bg-red-600 text-white shadow-md hover:bg-red-500 transition-colors border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            style={{ minHeight: '48px' }}
          >
            <span className="text-3xl font-extrabold tracking-wide">退勤</span>
            <span className="text-sm mt-2 font-medium">作業終了の打刻を行います</span>
          </button>
        </div>

        {/* 戻るリンク */}
        <div className="text-center pt-4">
          <button
            onClick={handleBack}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 underline focus:outline-none py-2 px-4"
            style={{ minHeight: '44px' }}
          >
            ホーム画面に戻る
          </button>
        </div>
      </main>
    </div>
  );
}