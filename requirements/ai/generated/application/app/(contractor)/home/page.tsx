'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initDB } from '@/lib/db/indexedDB';
import { User } from '@/features/attendance/domain/types';
import { logoutMock } from '@/lib/auth/mockAuth';
import { logger } from '@/lib/logger';

export default function ContractorHomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuthAndFetchUser() {
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

    checkAuthAndFetchUser();
  }, [router]);

  const handleLogout = () => {
    logoutMock();
    logger.info('LOGOUT_SUCCESS', { userId: currentUser?.user_id });
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">外注先ホーム</h1>
            {currentUser && (
              <p className="text-sm text-gray-600 mt-1">
                ログイン中: <span className="font-semibold">{currentUser.display_name}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            style={{ minHeight: '44px' }}
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 mx-auto max-w-md w-full px-4 py-12 flex flex-col justify-center space-y-6">
        <button
          onClick={() => router.push('/contractor/punch-mode')}
          className="flex h-36 w-full flex-col items-center justify-center rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-505 transition-colors"
          style={{ minHeight: '44px' }}
        >
          <span className="text-2xl font-bold">打刻</span>
          <span className="text-sm mt-2">出勤・退勤の打刻を行います</span>
        </button>

        <button
          onClick={() => router.push('/contractor/punch-correction')}
          className="flex h-36 w-full flex-col items-center justify-center rounded-xl bg-orange-600 text-white shadow-md hover:bg-orange-500 transition-colors"
          style={{ minHeight: '44px' }}
        >
          <span className="text-2xl font-bold">打刻データ登録・修正</span>
          <span className="text-sm mt-2">手動打刻登録や既存打刻の修正を行います</span>
        </button>

        <button
          onClick={() => router.push('/contractor/workers')}
          className="flex h-36 w-full flex-col items-center justify-center rounded-xl bg-green-600 text-white shadow-md hover:bg-green-500 transition-colors"
          style={{ minHeight: '44px' }}
        >
          <span className="text-2xl font-bold">作業員管理</span>
          <span className="text-sm mt-2">作業員の登録・編集・削除を行います</span>
        </button>
      </main>
    </div>
  );
}