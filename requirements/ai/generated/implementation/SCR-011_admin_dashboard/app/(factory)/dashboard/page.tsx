'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardData, DashboardData } from '../../../features/report/usecase/getDashboardData';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth enforcement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = sessionStorage.getItem('role');
      const userId = sessionStorage.getItem('userId');
      const name = sessionStorage.getItem('display_name');

      if (!userId || role !== 'FACTORY_ADMIN') {
        // Redirection to Login (SCR-010 equivalent mock login router)
        router.push('/login');
      } else {
        setDisplayName(name || '管理者');
        setAuthChecked(true);
      }
    }
  }, [router]);

  // Load dashboard data
  useEffect(() => {
    if (!authChecked) return;

    let isMounted = true;
    setLoading(true);

    getDashboardData()
      .then((data) => {
        if (isMounted) {
          setDashboardData(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError('ダッシュボードデータの取得に失敗しました。');
          console.error(err);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authChecked]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('role');
      sessionStorage.removeItem('display_name');
    }
    router.push('/login');
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">認証状態を確認中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              外注作業員 勤怠・配置管理システム
            </h1>
            <p className="text-xs sm:text-sm text-blue-200">工場側管理者ダッシュボード</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline-block text-sm text-blue-100 bg-blue-800 px-3 py-1 rounded-full">
              ログイン中: {displayName}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium text-sm px-4 py-2 rounded shadow transition-colors min-h-[44px] flex items-center"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation / Menu Sidebar */}
        <nav className="space-y-4 lg:col-span-1" aria-label="管理メニュー">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">管理メニュー</h2>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/attendance-history')}
                className="w-full text-left bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 font-medium px-4 py-3 rounded-lg border border-gray-200 transition-colors flex items-center justify-between min-h-[48px]"
              >
                <span>打刻履歴確認</span>
                <span className="text-gray-400 font-mono">→</span>
              </button>

              <button
                onClick={() => router.push('/labor-summary')}
                className="w-full text-left bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 font-medium px-4 py-3 rounded-lg border border-gray-200 transition-colors flex items-center justify-between min-h-[48px]"
              >
                <span>労働時間集計</span>
                <span className="text-gray-400 font-mono">→</span>
              </button>

              <button
                onClick={() => router.push('/contractors')}
                className="w-full text-left bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 font-medium px-4 py-3 rounded-lg border border-gray-200 transition-colors flex items-center justify-between min-h-[48px]"
              >
                <span>外注先企業登録</span>
                <span className="text-gray-400 font-mono">→</span>
              </button>

              <button
                onClick={() => router.push('/users')}
                className="w-full text-left bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 font-medium px-4 py-3 rounded-lg border border-gray-200 transition-colors flex items-center justify-between min-h-[48px]"
              >
                <span>管理者ユーザー登録</span>
                <span className="text-gray-400 font-mono">→</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Dashboard Panels */}
        <main className="lg:col-span-3 space-y-8">
          
          {/* Summary Cards */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">本日の稼働状況サマリー</h2>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow p-6 h-32 animate-pulse flex flex-col justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="bg-white rounded-lg shadow p-6 h-32 animate-pulse flex flex-col justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Active Workers Card */}
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    本日の稼働作業員数
                  </p>
                  <p className="mt-2 flex items-baseline">
                    <span className="text-4xl font-extrabold text-blue-950" data-testid="active-workers-count">
                      {dashboardData?.summary.total_active_workers ?? 0}
                    </span>
                    <span className="ml-2 text-sm font-medium text-gray-500">名</span>
                  </p>
                </div>

                {/* Working Contractors Card */}
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-600">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    稼働中の外注先企業数
                  </p>
                  <p className="mt-2 flex items-baseline">
                    <span className="text-4xl font-extrabold text-teal-950" data-testid="working-contractors-count">
                      {dashboardData?.summary.working_contractors_count ?? 0}
                    </span>
                    <span className="ml-2 text-sm font-medium text-gray-500">社</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Alerts Panel */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">直近のアラート・警告情報</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  システム検知ログ (直近)
                </h3>
              </div>
              
              {loading ? (
                <div className="divide-y divide-gray-100">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-6 animate-pulse flex space-x-4">
                      <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-6 text-center text-gray-500">
                  データをロードできませんでした。
                </div>
              ) : !dashboardData?.alerts || dashboardData.alerts.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  現在、特記事項または警告アラートはありません。
                </div>
              ) : (
                <ul className="divide-y divide-gray-200" data-testid="alert-list">
                  {dashboardData.alerts.map((alert) => (
                    <li
                      key={alert.alert_id}
                      className={`p-6 transition-colors ${
                        alert.type === 'ERROR'
                          ? 'bg-red-50 hover:bg-red-100/50'
                          : alert.type === 'WARNING'
                          ? 'bg-amber-50 hover:bg-amber-100/50'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {alert.type === 'ERROR' ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                              極
                            </span>
                          ) : alert.type === 'WARNING' ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                              警
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                              情
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {alert.message}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            検知日時: {new Date(alert.occurred_at).toLocaleString('ja-JP')}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 text-xs text-center py-6 border-t border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 工場配置管理システム (テストプロジェクト版) All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}