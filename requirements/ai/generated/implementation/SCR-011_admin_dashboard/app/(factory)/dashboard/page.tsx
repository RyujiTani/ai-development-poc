'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession, AuthSession } from '../../../lib/auth/session';
import { DashboardData } from '../../../features/dashboard/domain/dashboard';
import { IndexedDBDashboardRepository } from '../../../features/dashboard/repository/dashboardRepository';
import { GetDashboardDataUseCase } from '../../../features/dashboard/usecase/getDashboardDataUseCase';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize page, session validation and fetch data
  useEffect(() => {
    const currentSession = getSession();

    if (!currentSession || currentSession.role !== 'FACTORY_ADMIN') {
      router.push('/login');
      return;
    }

    setSession(currentSession);

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const repo = new IndexedDBDashboardRepository();
        const useCase = new GetDashboardDataUseCase(repo);
        const data = await useCase.execute();
        setDashboardData(data);
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage(err.message || 'データの読み込みに失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">ダッシュボードを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Prevents flashing content while redirecting
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-lg font-bold text-lg tracking-wide shadow-sm">
              M-Attendance
            </div>
            <h1 className="text-xl font-bold text-slate-800 hidden md:block">
              外注作業員 勤怠・配置管理システム
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="block text-xs text-slate-500 font-medium">工場側管理者</span>
              <span className="block text-sm font-semibold text-slate-800">{session.displayName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold px-4 py-2 rounded-lg text-sm border border-rose-200 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 min-h-[44px]"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-amber-800">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-2 border-b border-slate-200 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">総合ダッシュボード</h2>
            <p className="text-sm text-slate-500 mt-1">
              本日の工場内の稼働サマリーおよび配置アラートを確認できます。
            </p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 text-indigo-800 font-semibold text-sm">
            対象日: {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
        </div>

        {/* Section 1: Summary Widgets */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card: Total Active */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">本日の総稼働人数</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-5xl font-black text-slate-900 tracking-tight">
                  {dashboardData?.summary.total_active_workers ?? 0}
                </span>
                <span className="text-slate-500 font-semibold">名</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>打刻実績に基づく集計値</span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">稼働中</span>
            </div>
          </div>

          {/* Card: Breakdown Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:col-span-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">外注先企業別の稼働内訳</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dashboardData?.summary.contractor_breakdown.map((contractor) => {
                  const maxVal = Math.max(10, dashboardData.summary.total_active_workers);
                  const percentage = Math.min(100, (contractor.active_count / (maxVal || 1)) * 100);
                  
                  return (
                    <div key={contractor.contractor_id} className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-slate-700 truncate mr-2">{contractor.name}</span>
                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {contractor.active_count}名
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                {(!dashboardData || dashboardData.summary.contractor_breakdown.length === 0) && (
                  <p className="text-sm text-slate-400 col-span-2 py-4 text-center">稼働中の外注先はありません。</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Alerts & Quick Navigation Menu */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Alerts Area */}
          <section className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="border-b border-slate-200 bg-slate-55 px-6 py-4 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="font-bold text-slate-800">直近のアラート・異常検知</h3>
              </div>
              <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded-full">
                {dashboardData?.alerts.length ?? 0} 件
              </span>
            </div>

            <div className="p-6 flex-1 space-y-4 max-h-[400px] overflow-y-auto">
              {dashboardData?.alerts.map((alert) => {
                const isError = alert.level === 'error';
                const isWarning = alert.level === 'warning';
                
                const badgeColor = isError 
                  ? 'bg-rose-100 text-rose-800 border-rose-200' 
                  : isWarning 
                    ? 'bg-amber-100 text-amber-800 border-amber-200' 
                    : 'bg-blue-100 text-blue-800 border-blue-200';

                return (
                  <div 
                    key={alert.alert_id} 
                    className={`flex items-start space-x-3 p-4 rounded-lg border transition-all ${
                      isError 
                        ? 'bg-rose-50/50 border-rose-100 hover:bg-rose-50' 
                        : isWarning 
                          ? 'bg-amber-50/30 border-amber-100 hover:bg-amber-50/60' 
                          : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                    }`}
                  >
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${badgeColor} uppercase tracking-wider`}>
                      {alert.level === 'error' ? '重要警告' : alert.level === 'warning' ? '配置警告' : 'お知らせ'}
                    </span>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{alert.message}</p>
                      <span className="text-xs text-slate-400 block font-medium">
                        検知時刻: {new Date(alert.occurred_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {(!dashboardData || dashboardData.alerts.length === 0) && (
                <div className="text-center py-12 text-slate-400">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-semibold">現在、異常は検知されていません。</p>
                </div>
              )}
            </div>
          </section>

          {/* Quick Menu / Navigation Panel */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">管理メニュー一覧</h3>
              
              <div className="space-y-4">
                {/* 1. Attendance History Confirmation */}
                <button
                  onClick={() => navigateTo('/attendance-history')}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl group transition-all text-left min-h-[44px]"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-sm group-hover:text-indigo-900">打刻履歴確認</span>
                      <span className="text-slate-400 text-xs block group-hover:text-indigo-700">写真・配置・打刻状況</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 2. Labor Summary */}
                <button
                  onClick={() => navigateTo('/labor-summary')}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl group transition-all text-left min-h-[44px]"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-sm group-hover:text-indigo-900">労働時間集計</span>
                      <span className="text-slate-400 text-xs block group-hover:text-indigo-700">月次・日次・CSV出力</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 3. Contractor Registration */}
                <button
                  onClick={() => navigateTo('/contractors')}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl group transition-all text-left min-h-[44px]"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-sm group-hover:text-indigo-900">外注先企業登録</span>
                      <span className="text-slate-400 text-xs block group-hover:text-indigo-700">企業情報・新規追加</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 4. Admin User Registration */}
                <button
                  onClick={() => navigateTo('/users')}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl group transition-all text-left min-h-[44px]"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-sm group-hover:text-indigo-900">管理者ユーザー登録</span>
                      <span className="text-slate-400 text-xs block group-hover:text-indigo-700">管理者追加・アカウント設定</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-100 bg-slate-50 p-3 rounded-lg text-slate-400 text-center text-xs font-semibold">
              システムバージョン: v1.0.0
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-slate-800 text-slate-400 text-xs py-6 border-t border-slate-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 製造業向け 外注作業員 勤怠・配置管理システム. All rights reserved.</p>
          <p className="font-medium text-slate-500">デモプロトタイプ版 (クライアント内動作)</p>
        </div>
      </footer>
    </div>
  );
}