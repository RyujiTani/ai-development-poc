"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { IndexedDBDashboardRepository, DashboardData } from '@/features/dashboard/repository/dashboardRepository';
import { GetDashboardDataUseCase } from '@/features/dashboard/usecase/getDashboardData';
import { clearAllData, seedDatabase } from '@/lib/db/indexedDB';
import { logger } from '@/lib/logger/logger';

export default function DashboardPage() {
  const { userId, role, displayName, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    setErrorMsg(null);
    logger.info('Fetching dashboard data', { userId });
    
    const repository = new IndexedDBDashboardRepository();
    const useCase = new GetDashboardDataUseCase(repository);
    const result = await useCase.execute();

    if (result.success) {
      setDashboardData(result.data);
      logger.info('Dashboard data loaded successfully', {
        todayWorkingCount: result.data.summary.todayWorkingCount,
        alertCount: result.data.alerts.length
      });
    } else {
      setErrorMsg(result.error.message);
      logger.error('Failed to load dashboard data', { error: result.error });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      if (!userId || role !== 'FACTORY_ADMIN') {
        logger.warn('Unauthorized dashboard access attempt', { userId, role });
        router.push('/login');
      } else {
        loadDashboardData();
      }
    }
  }, [userId, role, authLoading, router]);

  const handleResetData = async () => {
    if (!confirm('全てのデータが初期化されます。よろしいですか？')) return;
    setIsResetting(true);
    try {
      await clearAllData();
      await seedDatabase();
      await loadDashboardData();
      alert('モックデータを初期化しました。');
    } catch (e) {
      alert('初期化に失敗しました。');
    } finally {
      setIsResetting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!userId || role !== 'FACTORY_ADMIN') {
    return null;
  }

  const { summary, alerts } = dashboardData || {
    summary: { todayWorkingCount: 0, todayTotalPunchedCount: 0, activeContractorCount: 0, totalWorkerCount: 0 },
    alerts: []
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-800 text-white flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-wider">外注管理システム</h1>
          <p className="text-xs text-slate-400 mt-1">工場側管理者ダッシュボード</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full text-left px-4 py-3 rounded-lg bg-blue-600 font-medium transition"
          >
            総合ダッシュボード
          </button>
          <button
            onClick={() => router.push('/attendance-history')}
            data-testid="nav-history"
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-700 text-slate-300 font-medium transition"
          >
            打刻履歴確認
          </button>
          <button
            onClick={() => router.push('/labor-summary')}
            data-testid="nav-labor"
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-700 text-slate-300 font-medium transition"
          >
            労働時間集計
          </button>
          <button
            onClick={() => router.push('/contractors')}
            data-testid="nav-contractors"
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-700 text-slate-300 font-medium transition"
          >
            外注先企業登録
          </button>
          <button
            onClick={() => router.push('/users')}
            data-testid="nav-users"
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-700 text-slate-300 font-medium transition"
          >
            管理者ユーザー登録
          </button>
        </nav>
        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <div className="text-sm font-medium truncate">{displayName}</div>
          <div className="text-xs text-slate-400 mt-0.5">工場側管理者</div>
          <button
            onClick={logout}
            data-testid="logout-button"
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ログアウト
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-6 md:p-8 space-y-6 overflow-y-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">総合ダッシュボード</h2>
            <p className="text-sm text-gray-500 mt-0.5">本日の稼働サマリーとシステムアラートを確認できます。</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.213 6H16" />
              </svg>
              同期
            </button>
            <button
              onClick={handleResetData}
              disabled={isResetting}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
            >
              データ初期化
            </button>
          </div>
        </header>

        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Summary Statistics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">リアルタイム稼働中</span>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1" data-testid="working-count">
                {summary.todayWorkingCount} <span className="text-lg font-medium text-gray-500">名</span>
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-4">現在、工場内に滞在している作業員数</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-600 tracking-wider uppercase">本日の総打刻人数</span>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
                {summary.todayTotalPunchedCount} <span className="text-lg font-medium text-gray-500">名</span>
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-4">本日、出退勤を含む打刻を1回以上行った作業員数</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-purple-600 tracking-wider uppercase">提携外注先企業</span>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
                {summary.activeContractorCount} <span className="text-lg font-medium text-gray-500">社</span>
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-4">現在有効化されている外注先企業の総数</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-indigo-600 tracking-wider uppercase">登録作業員総数</span>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
                {summary.totalWorkerCount} <span className="text-lg font-medium text-gray-500">名</span>
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-4">マスタに登録されている有効な作業員の総数</p>
          </div>
        </section>

        {/* Alerts & Shortcuts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts Area */}
          <section className="bg-white border rounded-2xl shadow-sm p-6 lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b">
              <h4 className="font-bold text-gray-800 text-lg">直近のアラート</h4>
              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                {alerts.length} 件の警告
              </span>
            </div>
            <div className="flex-1 overflow-y-auto mt-4 space-y-3 max-h-[350px]" data-testid="alert-list">
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">現在、異常や警告は検知されていません。</div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.alert_id} className={`flex gap-3 p-4 border rounded-xl ${
                    alert.type === 'ERROR' ? 'bg-red-50/50 border-red-100' :
                    alert.type === 'WARNING' ? 'bg-amber-50/50 border-amber-100' :
                    'bg-sky-50/50 border-sky-100'
                  }`}>
                    <div className="mt-0.5 flex-shrink-0">
                      {alert.type === 'ERROR' ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-sm">!</span>
                      ) : alert.type === 'WARNING' ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold text-sm">!</span>
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-600 font-bold text-sm">i</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          alert.type === 'ERROR' ? 'bg-red-100 text-red-800' :
                          alert.type === 'WARNING' ? 'bg-amber-100 text-amber-800' :
                          'bg-sky-100 text-sky-800'
                        }`}>
                          {alert.target_name}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(alert.occurred_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mt-1.5">{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Quick Actions Shortcuts */}
          <section className="bg-white border rounded-2xl shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-gray-800 text-lg pb-4 border-b">管理クイックアクセス</h4>
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => router.push('/attendance-history')}
                  className="w-full flex items-center justify-between p-3 border border-gray-100 hover:border-blue-100 hover:bg-blue-50/20 rounded-xl transition text-left group"
                >
                  <div>
                    <div className="font-semibold text-sm text-gray-800 group-hover:text-blue-600 transition">打刻履歴・写真確認</div>
                    <div className="text-xs text-gray-400 mt-0.5">本日の写真付き打刻や修正を確認</div>
                  </div>
                  <span className="text-gray-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-1">→</span>
                </button>

                <button
                  onClick={() => router.push('/labor-summary')}
                  className="w-full flex items-center justify-between p-3 border border-gray-100 hover:border-blue-100 hover:bg-blue-50/20 rounded-xl transition text-left group"
                >
                  <div>
                    <div className="font-semibold text-sm text-gray-800 group-hover:text-blue-600 transition">労働時間集計 / CSV</div>
                    <div className="text-xs text-gray-400 mt-0.5">月次・日次の労働時間集計データ出力</div>
                  </div>
                  <span className="text-gray-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-1">→</span>
                </button>

                <button
                  onClick={() => router.push('/contractors')}
                  className="w-full flex items-center justify-between p-3 border border-gray-100 hover:border-blue-100 hover:bg-blue-50/20 rounded-xl transition text-left group"
                >
                  <div>
                    <div className="font-semibold text-sm text-gray-800 group-hover:text-blue-600 transition">外注先企業管理</div>
                    <div className="text-xs text-gray-400 mt-0.5">外注先の新規登録、ステータス変更</div>
                  </div>
                  <span className="text-gray-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-1">→</span>
                </button>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-6">
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">勤怠・配置管理システム</h5>
              <p className="text-xs text-slate-400 mt-1">
                本システムはNext.jsフロントエンド検証用のプロトタイプです。データはブラウザ内にのみ保持されます。
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
"
    },
    {