'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, hasRole } from '../../../lib/auth/mockAuth';
import { initSeedData } from '../../../lib/db/idb';
import { IndexedDBAttendanceRepository } from '../../../features/attendance/repository/attendanceRepository';
import { LaborSummaryUseCase } from '../../../features/attendance/usecase/laborSummaryUseCase';
import { LaborSummary } from '../../../features/attendance/domain/types';
import { exportLaborSummaryToCSV } from '../../../lib/csv/csvExporter';

const ITEMS_PER_PAGE = 10;

export default function LaborTimeSummaryPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // フォーム状態
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-04-30');
  const [unit, setUnit] = useState<'daily' | 'monthly'>('daily');

  // エラー、ローディング、データ
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [laborSummaries, setLaborSummaries] = useState<LaborSummary[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // ページネーション
  const [currentPage, setCurrentPage] = useState(1);

  // 認証・初期データのロード
  useEffect(() => {
    const verifyAuth = async () => {
      const isOk = hasRole('FACTORY_ADMIN');
      if (!isOk) {
        setIsAuthorized(false);
        router.push('/login');
        return;
      }
      setIsAuthorized(true);

      // モックデータベースの初期化
      try {
        await initSeedData();
      } catch (err) {
        console.error('Database initialization failed:', err);
      }
    };
    verifyAuth();
  }, [router]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!startDate) {
      newErrors.startDate = '開始日は必須です';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      newErrors.startDate = '正しい日付形式（YYYY-MM-DD）で入力してください';
    }

    if (!endDate) {
      newErrors.endDate = '終了日は必須です';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      newErrors.endDate = '正しい日付形式（YYYY-MM-DD）で入力してください';
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        newErrors.endDate = '終了日は開始日以降の日付を指定してください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const repository = new IndexedDBAttendanceRepository();
      const usecase = new LaborSummaryUseCase(repository);
      const result = await usecase.execute({ startDate, endDate, unit });
      setLaborSummaries(result);
      setIsDataLoaded(true);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setErrors({ global: '集計データの取得中にエラーが発生しました。' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVDownload = () => {
    if (laborSummaries.length === 0) return;
    exportLaborSummaryToCSV(
      laborSummaries,
      `labor_summary_${unit}_${startDate}_to_${endDate}.csv`
    );
  };

  const handleLogout = () => {
    sessionStorage.removeItem('worker_attendance_user_session');
    router.push('/login');
  };

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-600 animate-pulse text-lg font-medium">認証確認中...</div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return null;
  }

  // ページネーションロジック
  const totalPages = Math.ceil(laborSummaries.length / ITEMS_PER_PAGE);
  const paginatedSummaries = laborSummaries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ヘッダー領域 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                外注勤怠・配置管理システム
              </span>
              <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">
                工場管理者
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600 font-medium hidden sm:inline-block">
                {getSession()?.display_name || '管理者'}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              労働時間集計
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              作業員ごとの実労働時間を期間指定で集計・確認できます。
            </p>
          </div>
        </div>

        {/* 検索・集計条件フォーム */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-8">
          <form onSubmit={handleCalculate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 開始日 */}
              <div>
                <label htmlFor="startDate" className="block text-sm font-semibold text-slate-700 mb-2">
                  開始日 <span className="text-red-500 text-xs">*</span>
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-200 text-base ${
                    errors.startDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300'
                  }`}
                />
                {errors.startDate && (
                  <p className="mt-2 text-sm text-red-600" id="startDate-error">{errors.startDate}</p>
                )}
              </div>

              {/* 終了日 */}
              <div>
                <label htmlFor="endDate" className="block text-sm font-semibold text-slate-700 mb-2">
                  終了日 <span className="text-red-500 text-xs">*</span>
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-200 text-base ${
                    errors.endDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300'
                  }`}
                />
                {errors.endDate && (
                  <p className="mt-2 text-sm text-red-600" id="endDate-error">{errors.endDate}</p>
                )}
              </div>

              {/* 集計単位 */}
              <div>
                <span className="block text-sm font-semibold text-slate-700 mb-2">
                  集計単位 <span className="text-red-500 text-xs">*</span>
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center justify-center border border-slate-300 rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition duration-200">
                    <input
                      type="radio"
                      name="unit"
                      value="daily"
                      checked={unit === 'daily'}
                      onChange={() => setUnit('daily')}
                      className="sr-only"
                    />
                    <span className={`text-base font-semibold ${unit === 'daily' ? 'text-blue-600' : 'text-slate-600'}`}>
                      日次
                    </span>
                    {unit === 'daily' && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full ml-2"></span>}
                  </label>
                  <label className="flex items-center justify-center border border-slate-300 rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition duration-200">
                    <input
                      type="radio"
                      name="unit"
                      value="monthly"
                      checked={unit === 'monthly'}
                      onChange={() => setUnit('monthly')}
                      className="sr-only"
                    />
                    <span className={`text-base font-semibold ${unit === 'monthly' ? 'text-blue-600' : 'text-slate-600'}`}>
                      月次
                    </span>
                    {unit === 'monthly' && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full ml-2"></span>}
                  </label>
                </div>
              </div>
            </div>

            {errors.global && (
              <p className="text-sm text-red-600 font-medium" id="global-error">{errors.global}</p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-blue-300 shadow-sm flex items-center justify-center space-x-2 text-base"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>集計中...</span>
                  </>
                ) : (
                  <span>集計する</span>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* 集計結果テーブル */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900">集計結果一覧</h2>
            {isDataLoaded && laborSummaries.length > 0 && (
              <button
                onClick={handleCSVDownload}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm shadow-sm flex items-center justify-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>CSVダウンロード</span>
              </button>
            )}
          </div>

          {!isDataLoaded ? (
            <div className="py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 text-base font-medium">
                集計条件を入力して、「集計する」ボタンを押してください。
              </p>
            </div>
          ) : laborSummaries.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-slate-500 text-base font-medium">該当期間内に有効な稼働データが見つかりませんでした。</p>
            </div>
          ) : (
            <>
              {/* レスポンシブな横スクロール可能テーブル */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                        集計対象期間
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                        外注先名
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                        作業員名
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                        合計実労働時間
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {paginatedSummaries.map((summary, idx) => (
                      <tr key={`${summary.worker_id}-${summary.period}-${idx}`} className="hover:bg-slate-50/50 transition duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-950">
                          {summary.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                          {summary.contractor_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">
                          {summary.worker_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-right text-slate-950">
                          {summary.total_hours.toFixed(2)}{' '}
                          <span className="text-xs font-medium text-slate-500">時間</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ページネーションコントロール */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      前へ
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                    >
                      次へ
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-700">
                        全 <span className="font-semibold">{laborSummaries.length}</span> 件中{' '}
                        <span className="font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>〜
                        <span className="font-semibold">
                          {Math.min(currentPage * ITEMS_PER_PAGE, laborSummaries.length)}
                        </span>
                        件を表示
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <span className="sr-only">前へ</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === i + 1
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <span className="sr-only">次へ</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}