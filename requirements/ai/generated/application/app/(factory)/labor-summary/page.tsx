"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GetLaborSummaryUseCase, LaborSummaryItem } from '@/features/report/usecase/getLaborSummaryUseCase';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';

// Custom SVG Icons
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

const Download = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export default function LaborSummaryPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // フィルタ状態
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [unit, setUnit] = useState<'daily' | 'monthly'>('daily');

  // バリデーションエラー
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // データ状態
  const [laborSummary, setLaborSummary] = useState<LaborSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 初期日付の設定 (当月1日〜今日)
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    setStartDate(`${yyyy}-${mm}-01`);
    setEndDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  // 認証チェック
  useEffect(() => {
    const userId = sessionStorage.getItem('user_id');
    const role = sessionStorage.getItem('role');

    if (!userId || role !== 'FACTORY_ADMIN') {
      logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: '/labor-summary' });
      router.replace('/login');
      return;
    }

    setIsAuthenticated(true);
  }, [router]);

  // 初回データ取得 (初期表示時のみ実行)
  useEffect(() => {
    if (isAuthenticated && startDate && endDate) {
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleCalculate = async () => {
    const errors: Record<string, string> = {};
    if (!startDate) {
      errors.startDate = '開始日を入力してください';
    }
    if (!endDate) {
      errors.endDate = '終了日を入力してください';
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      errors.endDate = '終了日は開始日以降の日付を入力してください';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setIsLoading(true);

    try {
      const useCase = new GetLaborSummaryUseCase();
      const result = await useCase.execute({
        startDate,
        endDate,
        unit,
      });

      if (result.success) {
        setLaborSummary(result.value);
        setCurrentPage(1);
      } else if ('error' in result) {
        toast.error(result.error.message);
      }
    } catch (err) {
      logger.error('CALCULATE_LABOR_SUMMARY_SYSTEM_ERROR', err);
      toast.error('集計処理中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVDownload = () => {
    if (laborSummary.length === 0) {
      toast.error('ダウンロードするデータがありません。');
      return;
    }

    try {
      const header = unit === 'daily' 
        ? '作業員名,外注先名,日付,労働時間(時間)\n' 
        : '作業員名,外注先名,年月,労働時間(時間)\n';

      const rows = laborSummary.map((item) => {
        const escapedName = item.worker_name.replace(/"/g, '""');
        const escapedContractor = item.contractor_name.replace(/"/g, '""');
        return `"${escapedName}","${escapedContractor}","${item.period}",${item.working_hours}`;
      }).join('\n');

      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // Excelでの文字化けを防ぐためのBOM
      const blob = new Blob([bom, header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.setAttribute('href', url);
      link.setAttribute('download', `labor_summary_${startDate}_to_${endDate}_${unit}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logger.info('CSV_DOWNLOAD_SUCCESS', { count: laborSummary.length });
      toast.success('CSVエクスポートが完了しました。');
    } catch (err) {
      logger.error('CSV_DOWNLOAD_ERROR', err);
      toast.error('CSVの生成中にエラーが発生しました。');
    }
  };

  const handleLogout = () => {
    logger.info('ADMIN_LOGOUT_EVENT', { user_id: sessionStorage.getItem('user_id') });
    sessionStorage.removeItem('user_id');
    sessionStorage.removeItem('role');
    router.push('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  // ページネーションの計算
  const totalPages = Math.ceil(laborSummary.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecords = laborSummary.slice(indexOfFirstItem, indexOfLastItem);

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
                    item.path === '/labor-summary' ? 'bg-indigo-900 text-white' : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
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
                item.path === '/labor-summary'
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 pb-5 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 md:text-3xl">労働時間集計</h2>
            <p className="text-sm text-gray-500 mt-1">指定期間の実労働時間を集計し、外部給与システム連携用CSVファイルを出力します。</p>
          </div>
          <button
            onClick={handleCSVDownload}
            disabled={laborSummary.length === 0 || isLoading}
            className="flex items-center justify-center gap-2 h-12 px-5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 min-h-[44px] disabled:bg-emerald-400 disabled:opacity-50"
            data-testid="csv-download-btn"
          >
            <Download className="h-5 w-5" />
            <span>CSVダウンロード</span>
          </button>
        </div>

        {/* フィルタ領域 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6 flex flex-col lg:flex-row gap-6 items-end">
          <div className="w-full lg:w-1/4">
            <label htmlFor="startDate" className="block text-sm font-bold text-gray-700 mb-2">
              開始日 <span className="text-red-500 font-normal">(必須)</span>
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px]"
              data-testid="start-date-input"
            />
            {validationErrors.startDate && (
              <p className="mt-1 text-sm text-red-600" data-testid="start-date-error">
                {validationErrors.startDate}
              </p>
            )}
          </div>

          <div className="w-full lg:w-1/4">
            <label htmlFor="endDate" className="block text-sm font-bold text-gray-700 mb-2">
              終了日 <span className="text-red-500 font-normal">(必須)</span>
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px]"
              data-testid="end-date-input"
            />
            {validationErrors.endDate && (
              <p className="mt-1 text-sm text-red-600" data-testid="end-date-error">
                {validationErrors.endDate}
              </p>
            )}
          </div>

          <div className="w-full lg:w-1/4">
            <label htmlFor="summaryUnit" className="block text-sm font-bold text-gray-700 mb-2">
              集計単位
            </label>
            <select
              id="summaryUnit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as 'daily' | 'monthly')}
              className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px] bg-white"
              data-testid="summary-unit-select"
            >
              <option value="daily">日次</option>
              <option value="monthly">月次</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleCalculate}
            disabled={isLoading}
            className="w-full lg:w-32 h-12 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center min-h-[44px]"
            data-testid="calculate-btn"
          >
            {isLoading ? '集計中...' : '集計'}
          </button>
        </div>

        {/* 集計結果一覧 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20" data-testid="loading-indicator">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">集計しています...</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {laborSummary.length === 0 ? (
              <div className="p-16 text-center text-gray-500 font-medium" data-testid="no-records-msg">
                指定された期間の労働時間データはありません。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">作業員名</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">外注先名</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {unit === 'daily' ? '日付' : '年月'}
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">実労働時間</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {currentRecords.map((item) => (
                      <tr key={`${item.worker_id}-${item.period}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {item.worker_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.contractor_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 font-mono">
                          {item.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-indigo-950">
                          {item.working_hours.toFixed(2)} 時間
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex h-10 px-4 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                  data-testid="prev-page-btn"
                >
                  前へ
                </button>
                <span className="text-sm text-gray-700 font-mono">
                  {currentPage} / {totalPages} ページ
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex h-10 px-4 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                  data-testid="next-page-btn"
                >
                  次へ
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}