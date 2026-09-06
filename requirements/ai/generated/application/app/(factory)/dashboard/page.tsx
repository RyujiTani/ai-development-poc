'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardData, DashboardData } from '@/features/dashboard/usecase/getDashboardData';
import { logoutMock } from '@/lib/auth/mockAuth';
import { logger } from '@/lib/logger';
import { initDB } from '@/lib/db/indexedDB';
import { User } from '@/features/attendance/domain/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 認証および管理者権限の検証
  useEffect(() => {
    async function checkAuthAndLoadData() {
      if (typeof window === 'undefined' || !window.sessionStorage) return;

      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      // 工場管理者以外のアクセスをリダイレクト (SCR-011-VL-001)
      if (!userId || role !== 'FACTORY_ADMIN') {
        logger.warn('UNAUTHORIZED_ACCESS_ATTEMPT', { userId, role });
        router.push('/admin-login');
        return;
      }

      try {
        const db = await initDB();
        const tx = db.transaction('users', 'readonly');
        const store = tx.objectStore('users');
        const user = (await store.get(userId)) as User | undefined;

        if (!user || user.role !== 'FACTORY_ADMIN' || user.status !== 'ACTIVE') {
          logger.warn('INVALID_USER_OR_ROLE', { userId });
          logoutMock();
          router.push('/admin-login');
          return;
        }

        setCurrentUser(user);
        logger.info('FETCH_USER_SUCCESS_ADMIN', { userId: user.user_id });

        // ダッシュボードに表示するサマリー・アラートデータを取得
        const data = await getDashboardData();
        setDashboardData(data);
        logger.info('FETCH_DASHBOARD_DATA_SUCCESS');
      } catch (err) {
        logger.error('LOAD_DASHBOARD_PAGE_FAILED', { error: String(err) });
        setError('データの読み込みに失敗しました。再試行してください。');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthAndLoadData();
  }, [router]);

  const handleLogout = () => {
    logoutMock();
    logger.info('LOGOUT_SUCCESS_ADMIN', { userId: currentUser?.user_id });
    router.push('/admin-login');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600 font-bold" data-testid="loading-text">
          読み込み中...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md text-center shadow" role="alert">
          <p className="font-bold text-base">{error}</p>
        </div>
      </div>
    );
  }

  const summary = dashboardData?.summary || {
    active_workers_count: 0,
    clocked_in_count: 0,
    clocked_out_count: 0,
  };

  const alerts = dashboardData?.alerts || [];

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">総合ダッシュボード</h1>
            {currentUser && (
              <p className="text-sm text-gray-600 mt-1">
                ログイン中: <span className="font-semibold">{currentUser.display_name}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 shadow-sm"
            style={{ minHeight: '44px' }}
            data-testid="logout-button"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* メインレイアウト */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左側：管理画面遷移メニュー (1/4カラム) */}
        <aside className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
            <h2 className="text-base font-extrabold border-b border-gray-100 pb-2.5 text-gray-700 mb-1">
              工場側管理メニュー
            </h2>

            <button
              onClick={() => router.push('/factory/attendance-history')}
              className="w-full text-left rounded-lg bg-gray-50 p-3.5 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all border border-gray-100"
              style={{ minHeight: '44px' }}
              data-testid="nav-history"
            >
              打刻履歴確認
            </button>

            <button
              onClick={() => router.push('/factory/labor-summary')}
              className="w-full text-left rounded-lg bg-gray-50 p-3.5 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all border border-gray-100"
              style={{ minHeight: '44px' }}
              data-testid="nav-summary"
            >
              労働時間集計
            </button>

            <button
              onClick={() => router.push('/factory/contractors')}
              className="w-full text-left rounded-lg bg-gray-50 p-3.5 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all border border-gray-100"
              style={{ minHeight: '44px' }}
              data-testid="nav-contractors"
            >
              外注先企業登録
            </button>

            <button
              onClick={() => router.push('/factory/users')}
              className="w-full text-left rounded-lg bg-gray-50 p-3.5 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all border border-gray-100"
              style={{ minHeight: '44px' }}
              data-testid="nav-users"
            >
              管理者ユーザー登録
            </button>
          </div>
        </aside>

        {/* 右側：集計および警告アラート (3/4カラム) */}
        <section className="lg:col-span-3 flex flex-col gap-6">
          {/* 本日の稼働人数サマリーカード表示 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* アクティブ登録作業員数 */}
            <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-between border-t-4 border-blue-500">
              <span className="text-sm font-bold text-gray-500">登録作業員（アクティブ）</span>
              <div className="flex items-baseline gap-1.5 mt-3">
                <span className="text-3xl font-extrabold tracking-tight text-gray-900" data-testid="summary-active-workers">
                  {summary.active_workers_count}
                </span>
                <span className="text-sm text-gray-500 font-bold">名</span>
              </div>
            </div>

            {/* 本日の出勤打刻数 */}
            <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-between border-t-4 border-green-500">
              <span className="text-sm font-bold text-gray-500">本日の出勤人数</span>
              <div className="flex items-baseline gap-1.5 mt-3">
                <span className="text-3xl font-extrabold tracking-tight text-green-600" data-testid="summary-clocked-in">
                  {summary.clocked_in_count}
                </span>
                <span className="text-sm text-gray-500 font-bold">名</span>
              </div>
            </div>

            {/* 本日の退勤打刻数 */}
            <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-between border-t-4 border-red-500">
              <span className="text-sm font-bold text-gray-500">本日の退勤人数</span>
              <div className="flex items-baseline gap-1.5 mt-3">
                <span className="text-3xl font-extrabold tracking-tight text-red-600" data-testid="summary-clocked-out">
                  {summary.clocked_out_count}
                </span>
                <span className="text-sm text-gray-500 font-bold">名</span>
              </div>
            </div>
          </div>

          {/* 直近アラート表示 */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-base font-extrabold border-b border-gray-100 pb-3 mb-4 text-gray-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              配置・打刻直近アラート
            </h2>

            <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">現在、検知されたアラートはありません。</p>
              ) : (
                alerts.map((alert) => {
                  let badgeClass = 'bg-gray-100 text-gray-800';
                  let borderClass = 'border-l-4 border-gray-300';

                  if (alert.level === 'HIGH') {
                    badgeClass = 'bg-red-100 text-red-800';
                    borderClass = 'border-l-4 border-red-500';
                  } else if (alert.level === 'MEDIUM') {
                    badgeClass = 'bg-amber-100 text-amber-800';
                    borderClass = 'border-l-4 border-amber-500';
                  } else if (alert.level === 'LOW') {
                    badgeClass = 'bg-blue-100 text-blue-800';
                    borderClass = 'border-l-4 border-blue-400';
                  }

                  return (
                    <div
                      key={alert.alert_id}
                      className={`p-4 flex flex-col justify-between gap-2 ${borderClass} bg-gray-50/50 mb-2.5 rounded-r-lg`}
                      data-testid={`alert-item-${alert.alert_id}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${badgeClass}`} data-testid="alert-level">
                          {alert.level}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {new Date(alert.occurred_at).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800" data-testid="alert-message">
                        {alert.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}