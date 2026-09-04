'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sessionManager, Session } from '../../../../lib/auth/session';
import { useToast } from '../../../../components/ui/toast';
import { logger } from '../../../../lib/logger/logger';
import { IndexedDBAttendanceRepository } from '../../../../features/attendance/repository/attendanceRepository';
import { IndexedDBWorkerRepository } from '../../../../features/worker/repository/workerRepository';
import { IndexedDBContractorRepository } from '../../../../features/contractor/repository/contractorRepository';
import { GetAdminDashboardUseCase, DashboardSummary } from '../../../../features/report/usecase/getAdminDashboardUseCase';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);

  // 1. 認証認可チェック ＆ 初期表示
  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'FACTORY_ADMIN') {
      logger.warn('unauthorized_factory_admin_redirect', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.push('/admin/login');
      return;
    }
    setSession(currentSession);

    const loadDashboardData = async () => {
      try {
        const attendanceRepo = new IndexedDBAttendanceRepository();
        const workerRepo = new IndexedDBWorkerRepository();
        const contractorRepo = new IndexedDBContractorRepository();
        const useCase = new GetAdminDashboardUseCase(attendanceRepo, workerRepo, contractorRepo);

        const result = await useCase.execute();
        if (result.success) {
          setDashboardData(result.value);
        } else {
          showToast(result.error.message, 'error');
        }
      } catch (err) {
        logger.error('failed_to_load_dashboard', err);
        showToast('データの読み込み中にエラーが発生しました。', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    logger.info('factory_admin_dashboard_loaded', { user_id: currentSession.user_id });
  }, [router, showToast]);

  // ログアウト処理
  const handleLogout = () => {
    logger.info('factory_admin_logout', { user_id: session?.user_id });
    sessionManager.clearSession();
    showToast('ログアウトしました。', 'info');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 font-medium">ダッシュボード初期化中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* ナビゲーションヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-indigo-600 tracking-wider">勤怠・配置管理システム</span>
            <span className="text-sm font-bold text-gray-900 sm:text-base">総合管理ダッシュボード</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-gray-800">{session?.display_name} 様</p>
              <p className="text-xs text-gray-500">工場管理者</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 active:bg-red-100 transition duration-150 ease-in-out h-9 flex items-center justify-center cursor-pointer"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* サマリーカードセクション */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">本日の稼働状況サマリー</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* 1. 外注先企業数 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-gray-500 font-bold">稼働中外注先</span>
                <p className="text-3xl font-extrabold text-indigo-600">{dashboardData?.activeContractorsCount ?? 0}</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>

            {/* 2. 登録作業員総数 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-gray-500 font-bold">登録作業員総数</span>
                <p className="text-3xl font-extrabold text-indigo-600">{dashboardData?.totalWorkersCount ?? 0}</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* 3. 本日入場人数 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-gray-500 font-bold">本日入場(出勤)</span>
                <p className="text-3xl font-extrabold text-emerald-600">{dashboardData?.todayClockedInCount ?? 0}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>

            {/* 4. 本日退勤人数 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-gray-500 font-bold">本日退勤済</span>
                <p className="text-3xl font-extrabold text-orange-600">{dashboardData?.todayClockedOutCount ?? 0}</p>
              </div>
              <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>

          </div>
        </section>

        {/* 2カラムレイアウト: 左アラート・右管理導線 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 左: 直近のアラート */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">リアルタイム配置・打刻アラート</h2>
              <span className="px-2.5 py-1 text-xs font-bold bg-indigo-100 text-indigo-800 rounded-full">
                直近 {dashboardData?.alerts.length ?? 0} 件
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
              {!dashboardData?.alerts || dashboardData.alerts.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-semibold">現在、異常なアラートはありません</p>
                  <p className="text-xs text-gray-400 mt-1">本日の入場・資格・安全講習状況は良好です。</p>
                </div>
              ) : (
                dashboardData.alerts.map((alert) => {
                  const severityStyles = 
                    alert.severity === 'high' 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : alert.severity === 'medium'
                      ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200';

                  const badgeLabel = 
                    alert.type === 'PUNCH_MISSING' 
                      ? '打刻漏れ' 
                      : alert.type === 'QUALIFICATION_ALERT'
                      ? '配置要確認'
                      : 'システム';

                  return (
                    <div key={alert.id} className={`p-4 border-l-4 flex gap-4 ${severityStyles} transition hover:bg-gray-50/50`}>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            alert.severity === 'high' 
                              ? 'bg-red-100 border-red-300 text-red-900' 
                              : alert.severity === 'medium'
                              ? 'bg-yellow-100 border-yellow-300 text-yellow-900'
                              : 'bg-blue-100 border-blue-300 text-blue-900'
                          }`}>
                            {badgeLabel}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(alert.occurredAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 leading-relaxed">{alert.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 右: 管理メニュー（導線） */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">管理者メニュー</h2>
            <div className="grid grid-cols-1 gap-4">
              
              {/* 1. 打刻履歴確認 */}
              <button
                onClick={() => {
                  logger.info('admin_navigate_to_history', { user_id: session?.user_id });
                  router.push('/admin/attendance-history');
                }}
                className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-500 shadow-sm transition hover:shadow-md cursor-pointer text-left group"
              >
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600">打刻履歴確認 (SCR-012)</h3>
                  <p className="text-xs text-gray-500 mt-0.5">写真付き打刻状況の検索・確認および修正を行います。</p>
                </div>
              </button>

              {/* 2. 労働時間集計 */}
              <button
                onClick={() => {
                  logger.info('admin_navigate_to_labor_summary', { user_id: session?.user_id });
                  router.push('/admin/labor-summary');
                }}
                className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-500 shadow-sm transition hover:shadow-md cursor-pointer text-left group"
              >
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2a4 4 0 00-4-4H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v8m-6 0h6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600">労働時間集計 (SCR-013)</h3>
                  <p className="text-xs text-gray-500 mt-0.5">指定期間内における各作業員の就業時間を集計・CSV出力します。</p>
                </div>
              </button>

              {/* 3. 外注先企業登録 */}
              <button
                onClick={() => {
                  logger.info('admin_navigate_to_contractors', { user_id: session?.user_id });
                  router.push('/admin/contractors');
                }}
                className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-500 shadow-sm transition hover:shadow-md cursor-pointer text-left group"
              >
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600">外注先企業登録 (SCR-014)</h3>
                  <p className="text-xs text-gray-500 mt-0.5">連携外注先企業マスタの追加・編集・論理削除を行います。</p>
                </div>
              </button>

              {/* 4. 管理者ユーザー登録 */}
              <button
                onClick={() => {
                  logger.info('admin_navigate_to_users', { user_id: session?.user_id });
                  router.push('/admin-user-register');
                }}
                className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-500 shadow-sm transition hover:shadow-md cursor-pointer text-left group"
              >
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600">管理者ユーザー登録 (SCR-015)</h3>
                  <p className="text-xs text-gray-500 mt-0.5">工場・外注先管理者アカウントを新規発行・管理します。</p>
                </div>
              </button>

            </div>
          </div>

        </div>

      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400">
          &copy; 2026 勤怠・配置管理システム プロトタイプ版 (工場側管理者ポータル)
        </div>
      </footer>
    </div>
  );
}