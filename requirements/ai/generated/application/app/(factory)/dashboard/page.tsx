"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminDashboardUseCase, AdminDashboardResult } from "@/features/dashboard/usecase/getAdminDashboardUseCase";
import { logger } from "@/lib/logger/logger";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<AdminDashboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName] = useState<string>("管理者");

  useEffect(() => {
    const userId = sessionStorage.getItem("user_id");
    const role = sessionStorage.getItem("role");

    // 未認証・権限なしリダイレクト (SCR-011-VL-001 / ACC-SCR-011-009)
    if (!userId || !role || role !== "FACTORY_ADMIN") {
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("role");
      router.replace("/admin-login");
      return;
    }

    const loadDashboard = async () => {
      try {
        const result = await getAdminDashboardUseCase();
        if (result.success) {
          setDashboardData(result.value);
        } else {
          setError("error" in result ? result.error.message : "データの読み込み中にエラーが発生しました");
        }
      } catch (err) {
        setError("データの読み込み中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("role");
    logger.info("ADMIN_LOGOUT");
    router.push("/admin-login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100" data-testid="loading-state">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* ナビゲーションメニュー (サイドバー) (SCR-011-UI-003) */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-slate-950 text-slate-100 border-r border-slate-800">
        <div className="p-6">
          <h2 className="text-lg font-bold tracking-wider">工場側管理画面</h2>
          <p className="text-xs text-slate-400 mt-1">勤怠・配置管理</p>
        </div>
        <nav className="flex-1 px-4 space-y-1 py-4">
          <a
            href="/dashboard"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg bg-blue-600 text-white"
            data-testid="nav-dashboard"
          >
            📊 ダッシュボード
          </a>
          <a
            href="/attendance-history"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            data-testid="nav-attendance-history"
          >
            📅 打刻履歴確認
          </a>
          <a
            href="/labor-time-summary"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            data-testid="nav-labor-summary"
          >
            ⏱️ 労働時間集計
          </a>
          <a
            href="/contractors"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            data-testid="nav-contractors"
          >
            🏢 外注先企業登録
          </a>
          <a
            href="/users"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            data-testid="nav-users"
          >
            👤 管理者ユーザー登録
          </a>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white transition-colors border border-slate-800"
            data-testid="logout-button-sidebar"
          >
            🚪 ログアウト
          </button>
        </div>
      </aside>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-xl font-bold text-gray-900 md:hidden">総合ダッシュボード</h1>
            <h1 className="text-xl font-bold text-gray-900 hidden md:block">総合ダッシュボード</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700" data-testid="user-display-name">
                {userName} 様
              </span>
              <button
                onClick={handleLogout}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 md:hidden"
                data-testid="logout-button-header"
              >
                ログアウト
              </button>
              <button
                onClick={handleLogout}
                className="hidden md:block text-xs font-medium text-red-600 hover:text-red-700"
                data-testid="logout-button"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>

        {/* モバイル用簡易ナビゲーション (SCR-011-UI-004) */}
        <div className="md:hidden bg-slate-950 p-2 flex overflow-x-auto gap-2 border-b border-slate-800">
          <a
            href="/dashboard"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white"
          >
            📊 ダッシュボード
          </a>
          <a
            href="/attendance-history"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded text-slate-300 bg-slate-900 hover:text-white"
            data-testid="mobile-nav-attendance-history"
          >
            📅 履歴確認
          </a>
          <a
            href="/labor-time-summary"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded text-slate-300 bg-slate-900 hover:text-white"
            data-testid="mobile-nav-labor-summary"
          >
            ⏱️ 時間集計
          </a>
          <a
            href="/contractors"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded text-slate-300 bg-slate-900 hover:text-white"
            data-testid="mobile-nav-contractors"
          >
            🏢 企業登録
          </a>
          <a
            href="/users"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded text-slate-300 bg-slate-900 hover:text-white"
            data-testid="mobile-nav-users"
          >
            👤 ユーザー登録
          </a>
        </div>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded bg-red-50 p-4 text-sm text-red-600 border border-red-200 font-medium" role="alert" data-testid="error-message">
              ⚠️ {error}
            </div>
          )}

          {/* サマリー情報ウィジェット/カード (SCR-011-UI-001, SCR-011-FN-001) */}
          {dashboardData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="summary-widgets">
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">登録作業員</span>
                <span className="text-3xl font-bold text-gray-800 mt-2" data-testid="total-workers-count">
                  {dashboardData.summary.total_workers} <span className="text-sm font-medium text-gray-500">名</span>
                </span>
                <span className="text-[10px] text-gray-400 mt-1">現在のアクティブ作業員</span>
              </div>
              
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">本日出勤中</span>
                <span className="text-3xl font-bold text-blue-600 mt-2" data-testid="clocked-in-count">
                  {dashboardData.summary.clocked_in} <span className="text-sm font-medium text-gray-500">名</span>
                </span>
                <span className="text-[10px] text-gray-400 mt-1">打刻システム記録</span>
              </div>

              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">本日退勤済</span>
                <span className="text-3xl font-bold text-emerald-600 mt-2" data-testid="clocked-out-count">
                  {dashboardData.summary.clocked_out} <span className="text-sm font-medium text-gray-500">名</span>
                </span>
                <span className="text-[10px] text-gray-400 mt-1">本日の作業終了作業員</span>
              </div>

              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">未出勤</span>
                <span className="text-3xl font-bold text-gray-500 mt-2" data-testid="absent-count">
                  {dashboardData.summary.absent} <span className="text-sm font-medium text-gray-500">名</span>
                </span>
                <span className="text-[10px] text-gray-400 mt-1">打刻がまだ確認できない人数</span>
              </div>
            </div>
          )}

          {/* 直近アラートリスト (SCR-011-UI-002, SCR-011-FN-002) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">直近のシステムアラート</h3>
              <p className="text-xs text-gray-400 mt-0.5">打刻漏れや要確認事象を自動検知した結果です</p>
            </div>
            <div className="divide-y divide-gray-100" data-testid="alerts-list">
              {dashboardData && dashboardData.alerts.length > 0 ? (
                dashboardData.alerts.map((alert) => (
                  <div key={alert.id} className="p-4 flex items-start space-x-3 hover:bg-gray-50/50" data-testid={`alert-item-${alert.id}`}>
                    <span className="flex-shrink-0 text-amber-500 text-lg">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800" data-testid={`alert-message-${alert.id}`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        発生時刻: {new Date(alert.occurred_at).toLocaleString("ja-JP")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500" data-testid="no-alerts-state">
                  現在、検知されたアラートはありません。
                </div>
              )}
            </div>
          </div>

          {/* クイックリンクメニュー (SCR-011-FN-003) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-base font-bold text-gray-800">管理メニュー一覧</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="/attendance-history"
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-slate-50 transition-colors"
                data-testid="link-attendance-history"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📅</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-800">打刻履歴確認</p>
                    <p className="text-xs text-gray-400 mt-0.5">日別・外注先別の打刻履歴、証拠写真確認</p>
                  </div>
                </div>
                <span className="text-gray-400 font-bold">→</span>
              </a>

              <a
                href="/labor-time-summary"
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-slate-50 transition-colors"
                data-testid="link-labor-summary"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⏱️</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-800">労働時間集計</p>
                    <p className="text-xs text-gray-400 mt-0.5">労働時間の集計、丸め、CSVダウンロード</p>
                  </div>
                </div>
                <span className="text-gray-400 font-bold">→</span>
              </a>

              <a
                href="/contractors"
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-slate-50 transition-colors"
                data-testid="link-contractors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🏢</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-800">外注先企業登録</p>
                    <p className="text-xs text-gray-400 mt-0.5">外注先企業の新規登録・変更・削除</p>
                  </div>
                </div>
                <span className="text-gray-400 font-bold">→</span>
              </a>

              <a
                href="/users"
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-slate-50 transition-colors"
                data-testid="link-users"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">👤</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-800">管理者ユーザー登録</p>
                    <p className="text-xs text-gray-400 mt-0.5">工場側・外注先管理者のアカウント登録・無効化</p>
                  </div>
                </div>
                <span className="text-gray-400 font-bold">→</span>
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}