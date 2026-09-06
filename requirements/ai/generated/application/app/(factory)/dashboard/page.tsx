"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

// SVGアイコン定義
const LayoutDashboardIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="10" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const ClipboardListIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </svg>
);

const CalendarDaysIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </svg>
);

const Building2Icon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M10 9h4" />
    <path d="M10 14h4" />
    <path d="M18 9h.01" />
    <path d="M18 14h.01" />
    <path d="M10 18h4" />
    <path d="M18 18h.01" />
  </svg>
);

const UserPlus2Icon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" x2="19" y1="8" y2="14" />
    <line x1="22" x2="16" y1="11" y2="11" />
  </svg>
);

const LogOutIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const MenuIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="6" y2="18" />
  </svg>
);

const AlertTriangleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" x2="12" y1="9" y2="13" />
    <line x1="12" x2="12.01" y1="17" y2="17" />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function DashboardPage() {
  const router = useRouter();
  const [userSession, setUserSession] = useState<{ userId: string; role: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage !== "undefined") {
      const storedId = sessionStorage.getItem("user_id");
      const storedRole = sessionStorage.getItem("role");

      if (!storedId || storedRole !== "FACTORY_ADMIN") {
        router.push("/admin-login");
      } else {
        setUserSession({ userId: storedId, role: storedRole });
        setIsAuthLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    if (userSession) {
      setLoading(true);
      fetch("/api/admin/dashboard")
        .then((res) => {
          if (!res.ok) throw new Error("ダッシュボードデータの取得に失敗しました");
          return res.json();
        })
        .then((json) => {
          setData(json);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [userSession]);

  const handleLogout = () => {
    logout();
    router.push("/admin-login");
  };

  if (isAuthLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
        <div className="flex items-center space-x-2 text-slate-600">
          <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-semibold text-lg">認証確認中...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: "総合ダッシュボード", href: "/dashboard", icon: LayoutDashboardIcon, active: true },
    { name: "打刻履歴確認", href: "/attendance-history", icon: ClipboardListIcon },
    { name: "労働時間集計", href: "/labor-summary", icon: CalendarDaysIcon },
    { name: "外注先企業登録", href: "/contractor-register", icon: Building2Icon },
    { name: "管理者ユーザー登録", href: "/admin-users", icon: UserPlus2Icon },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* モバイルヘッダー */}
      <header className="bg-slate-900 text-white px-4 py-4 flex items-center justify-between md:hidden shadow">
        <div className="flex items-center space-x-2">
          <LayoutDashboardIcon className="h-6 w-6 text-blue-400" />
          <span className="font-bold text-lg">管理者ダッシュボード</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="メニューを開く"
          data-testid="mobile-menu-btn"
        >
          {isSidebarOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </header>

      {/* サイドバー */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="sidebar"
      >
        <div className="h-full flex flex-col justify-between py-6 px-4">
          <div className="space-y-6">
            <div className="hidden md:flex items-center space-x-2 px-2">
              <LayoutDashboardIcon className="h-8 w-8 text-blue-400" />
              <span className="font-bold text-xl tracking-tight">工場側管理画面</span>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setIsSidebarOpen(false);
                      router.push(item.href);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors ${
                      item.active
                        ? "bg-blue-600 text-white shadow"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                    style={{ minHeight: "44px" }}
                    data-testid={`nav-item-${item.href}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-800 space-y-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-semibold text-slate-400 hover:bg-red-900/40 hover:text-red-200 transition-colors"
              style={{ minHeight: "44px" }}
              data-testid="logout-btn"
            >
              <LogOutIcon className="h-5 w-5" />
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      </aside>

      {/* モバイル用オーバーレイ */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl tracking-tight">
              総合ダッシュボード
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              本日の稼働状況および未読のアラートを一覧で確認できます。
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-bold flex items-center space-x-2" data-testid="error-message">
            <AlertTriangleIcon className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-6" data-testid="loading-skeleton">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-white h-32 rounded-2xl border border-slate-200" />
              ))}
            </div>
            <div className="animate-pulse bg-white h-64 rounded-2xl border border-slate-200" />
          </div>
        ) : (
          data && (
            <div className="space-y-8">
              {/* サマリーカード */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {/* 稼働中作業員 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow flex items-center justify-between">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-500 tracking-wider block">本日の稼働中作業員</span>
                    <span className="text-3xl font-extrabold text-slate-900" data-testid="working-workers-count">
                      {data.summary.working_workers_count}
                    </span>
                    <span className="text-sm text-slate-500 ml-1">名</span>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <UsersIcon className="h-8 w-8" />
                  </div>
                </div>

                {/* 稼働中外注企業 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow flex items-center justify-between">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-500 tracking-wider block">稼働中外注企業</span>
                    <span className="text-3xl font-extrabold text-slate-900" data-testid="active-contractors-count">
                      {data.summary.active_contractors_count}
                    </span>
                    <span className="text-sm text-slate-500 ml-1">社</span>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Building2Icon className="h-8 w-8" />
                  </div>
                </div>

                {/* 登録作業員総数 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow flex items-center justify-between">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-500 tracking-wider block">登録作業員総数</span>
                    <span className="text-3xl font-extrabold text-slate-900" data-testid="total-workers-registered">
                      {data.summary.total_workers_registered}
                    </span>
                    <span className="text-sm text-slate-500 ml-1">名</span>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <UsersIcon className="h-8 w-8" />
                  </div>
                </div>
              </div>

              {/* アラート情報 */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
                    <h2 className="text-lg font-bold text-slate-900">
                      直近のアラート情報
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-bold shadow-sm">
                    要確認 {data.alerts.length} 件
                  </span>
                </div>

                <div className="divide-y divide-slate-100" data-testid="alert-list">
                  {data.alerts.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-medium">
                      現在、異常や警告等のアラートはありません。
                    </div>
                  ) : (
                    data.alerts.map((alert: any) => (
                      <div
                        key={alert.alert_id}
                        className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                        data-testid={`alert-item-${alert.alert_id}`}
                      >
                        <div className="flex items-start space-x-3">
                          <span
                            className={`mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              alert.severity === "DANGER"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                            data-testid={`alert-severity-${alert.alert_id}`}
                          >
                            {alert.severity === "DANGER" ? "異常" : "警告"}
                          </span>
                          <div className="space-y-1">
                            <p className="text-base font-bold text-slate-900" data-testid={`alert-message-${alert.alert_id}`}>
                              {alert.message}
                            </p>
                            <span className="text-xs text-slate-400 block font-medium">
                              発生時刻: {new Date(alert.occurred_at).toLocaleString("ja-JP")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}