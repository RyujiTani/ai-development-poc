"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GetDashboardDataUseCase, DashboardData } from '@/features/report/usecase/getDashboardDataUseCase';
import { logger } from '@/lib/logger';

// Custom SVG Icons to avoid disallowed lucide-react dependency
const LayoutDashboard = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const FileSpreadsheet = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M8 13h8" />
    <path d="M8 17h8" />
    <path d="M10 9h4" />
  </svg>
);

const Building2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
);

const Users = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const AlertTriangle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const LogOut = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const Menu = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const X = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const Bell = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ user_id: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'FACTORY_ADMIN') {
        logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: '/dashboard' });
        router.replace('/login');
        return;
      }

      setCurrentUser({ user_id: userId, role });
      setIsAuthenticated(true);

      try {
        const useCase = new GetDashboardDataUseCase();
        const result = await useCase.execute();
        if (result.success) {
          setData(result.value);
        } else if ('error' in result) {
          setError(result.error.message);
        }
      } catch (err) {
        logger.error('FETCH_DASHBOARD_ERROR', err);
        setError('データの取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndFetch();
  }, [router]);

  const handleLogout = () => {
    logger.info('ADMIN_LOGOUT_EVENT', { user_id: currentUser?.user_id });
    sessionStorage.removeItem('user_id');
    sessionStorage.removeItem('role');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50" data-testid="loading">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !data) {
    return null;
  }

  const navItems = [
    { name: '総合ダッシュボード', path: '/dashboard', icon: LayoutDashboard },
    { name: '打刻履歴確認', path: '/attendance-history', icon: Bell },
    { name: '労働時間集計', path: '/labor-summary', icon: FileSpreadsheet },
    { name: '外注先企業登録', path: '/contractors', icon: Building2 },
    { name: '管理者ユーザー登録', path: '/admin-users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* モバイルヘッダー */}
      <header className="bg-indigo-950 text-white px-4 py-4 flex items-center justify-between md:hidden shadow-md">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-indigo-400" />
          <span className="font-bold text-lg tracking-wider">工場管理者ポータル</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1 rounded-md hover:bg-indigo-900 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="メニューを開閉"
          data-testid="mobile-menu-toggle"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* モバイルドロワーメニュー */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden" data-testid="mobile-sidebar">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-indigo-950 text-white pt-5 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-shrink-0 flex items-center px-4 mb-6">
              <LayoutDashboard className="h-8 w-8 text-indigo-400 mr-2" />
              <span className="font-bold text-xl tracking-wider">管理者メニュー</span>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    router.push(item.path);
                  }}
                  className={`group flex items-center px-4 py-3 text-base font-bold rounded-md w-full min-h-[44px] transition-colors ${
                    item.path === '/dashboard' ? 'bg-indigo-900 text-white' : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
                  }`}
                  data-testid={`mobile-nav-link-${item.path}`}
                >
                  <item.icon className="mr-4 h-6 w-6 text-indigo-300" />
                  {item.name}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="group flex items-center px-4 py-3 text-base font-bold rounded-md w-full min-h-[44px] text-red-300 hover:bg-red-950 hover:text-red-100 transition-colors mt-8"
                data-testid="mobile-logout-btn"
              >
                <LogOut className="mr-4 h-6 w-6 text-red-400" />
                ログアウト
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* デスクトップサイドバー */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-indigo-950 text-white min-h-screen p-4 flex-shrink-0 shadow-xl" data-testid="desktop-sidebar">
        <div className="flex items-center gap-2 mb-8 px-2 py-3 border-b border-indigo-900">
          <LayoutDashboard className="h-8 w-8 text-indigo-400" />
          <div>
            <h1 className="font-extrabold text-lg tracking-wider">工場管理者ポータル</h1>
            <p className="text-xs text-indigo-300 font-medium">勤怠・配置管理</p>
          </div>
        </div>
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              className={`flex items-center px-4 py-3 text-sm font-bold rounded-lg w-full transition-all duration-150 ${
                item.path === '/dashboard'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
              }`}
              data-testid={`desktop-nav-link-${item.path}`}
            >
              <item.icon className="mr-3 h-5 w-5 text-indigo-300" />
              {item.name}
            </button>
          ))}
        </nav>
        <div className="pt-4 border-t border-indigo-900 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-3 text-sm font-bold rounded-lg w-full text-red-300 hover:bg-red-950 hover:text-red-100 transition-all duration-150"
            data-testid="logout-btn"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-400" />
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ領域 */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {/* 上部ヘッダー */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 pb-5 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 md:text-3xl">ダッシュボード</h2>
            <p className="text-sm text-gray-500 mt-1">本日の工場の稼働状況とアラートです。</p>
          </div>
          <div className="text-right bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm self-stretch sm:self-auto flex sm:block justify-between items-center">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">管理者セッション</span>
            <span className="font-bold text-gray-800 text-sm block" data-testid="user-role-badge">FACTORY_ADMIN</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 shadow-sm" role="alert">
            {error}
          </div>
        )}

        {/* サマリーカード */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* 現在稼働中作業員 */}
          <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 transition-all duration-200 hover:shadow-md" data-testid="summary-card-active-workers">
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
                  <Users className="h-6 w-6" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-bold text-gray-500 truncate">稼働中作業員</dt>
                    <dd className="flex items-baseline">
                      <div className="text-3xl font-extrabold text-gray-900" data-testid="active-workers-count">
                        {data.summary.active_workers}
                      </div>
                      <span className="ml-2 text-sm font-semibold text-gray-500">名</span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* 全作業員数 */}
          <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 transition-all duration-200 hover:shadow-md" data-testid="summary-card-total-workers">
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
                  <Users className="h-6 w-6" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-bold text-gray-500 truncate">登録作業員総数</dt>
                    <dd className="flex items-baseline">
                      <div className="text-3xl font-extrabold text-gray-900" data-testid="total-workers-count">
                        {data.summary.total_workers}
                      </div>
                      <span className="ml-2 text-sm font-semibold text-gray-500">名</span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* 外注先企業数 */}
          <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 transition-all duration-200 hover:shadow-md sm:col-span-2 lg:col-span-1" data-testid="summary-card-total-contractors">
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-bold text-gray-500 truncate">外注先企業数</dt>
                    <dd className="flex items-baseline">
                      <div className="text-3xl font-extrabold text-gray-900" data-testid="total-contractors-count">
                        {data.summary.total_contractors}
                      </div>
                      <span className="ml-2 text-sm font-semibold text-gray-500">社</span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 直近アラート表示領域 */}
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-extrabold leading-6 text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>直近のアラート</span>
            </h3>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
              未処理：{data.alerts.length}件
            </span>
          </div>

          <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto" data-testid="alerts-list">
            {data.alerts.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-medium" data-testid="no-alerts-message">
                現在アラートはありません。
              </div>
            ) : (
              data.alerts.map((alert) => (
                <div key={alert.id} className="p-5 flex items-start hover:bg-gray-50 transition-colors" data-testid={`alert-item-${alert.id}`}>
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertTriangle className={`h-5 w-5 ${alert.type === 'PUNCH_MISSING' ? 'text-red-500' : 'text-amber-500'}`} />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-gray-900">{alert.message}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-mono">
                        発生日時: {new Date(alert.occurred_at).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 各管理画面への遷移メニュー */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* 打刻履歴確認 */}
          <button
            onClick={() => router.push('/attendance-history')}
            className="flex flex-col items-start p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-500 transition-all duration-150 text-left w-full group focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="link-attendance-history"
          >
            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 mb-4 group-hover:bg-indigo-100 transition-colors">
              <Bell className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-extrabold text-gray-900">打刻履歴確認</h4>
            <p className="text-sm text-gray-500 mt-1">作業員の打刻履歴や証拠写真を確認し、必要に応じて修正を行います。</p>
          </button>

          {/* 労働時間集計 */}
          <button
            onClick={() => router.push('/labor-summary')}
            className="flex flex-col items-start p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-500 transition-all duration-150 text-left w-full group focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="link-labor-summary"
          >
            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 mb-4 group-hover:bg-indigo-100 transition-colors">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-extrabold text-gray-900">労働時間集計</h4>
            <p className="text-sm text-gray-500 mt-1">指定期間の労働時間を日次・月次で集計し、CSV形式でエクスポートします。</p>
          </button>

          {/* 外注先企業登録 */}
          <button
            onClick={() => router.push('/contractors')}
            className="flex flex-col items-start p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-500 transition-all duration-150 text-left w-full group focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="link-contractors"
          >
            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 mb-4 group-hover:bg-indigo-100 transition-colors">
              <Building2 className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-extrabold text-gray-900">外注先企業登録</h4>
            <p className="text-sm text-gray-500 mt-1">新規外注先企業の登録や一覧の管理、編集・削除を行います。</p>
          </button>

          {/* 管理者ユーザー登録 */}
          <button
            onClick={() => router.push('/admin-users')}
            className="flex flex-col items-start p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-500 transition-all duration-150 text-left w-full group focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="link-admin-users"
          >
            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 mb-4 group-hover:bg-indigo-100 transition-colors">
              <Users className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-extrabold text-gray-900">管理者ユーザー登録</h4>
            <p className="text-sm text-gray-500 mt-1">工場側管理者や外注先管理者アカウントの新規発行、権限制御を行います。</p>
          </button>
        </div>
      </main>
    </div>
  );
}