'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LaborSummaryRecord } from '@/features/report/domain/laborSummary';
import { LaborSummaryRepositoryImpl } from '@/features/report/repository/laborSummaryRepositoryImpl';
import { GetLaborSummaryUseCase } from '@/features/report/usecase/getLaborSummaryUseCase';
import { exportLaborSummaryToCSV } from '@/lib/csv/csvExporter';
import { getSession, setSession, clearSession } from '@/lib/auth/authStore';
import { initSeedData } from '@/lib/db/seedData';

export default function LaborSummaryPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  const [startDate, setStartDate] = useState<string>('2026-04-13');
  const [endDate, setEndDate] = useState<string>('2026-04-14');
  const [unit, setUnit] = useState<'daily' | 'monthly'>('daily');

  const [summaryData, setSummaryData] = useState<LaborSummaryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const checkAuthAndInit = async () => {
      try {
        await initSeedData();
      } catch (err) {
        console.error('Failed to initialize seed data', err);
      }

      const session = getSession();
      if (!session || session.role !== 'FACTORY_ADMIN') {
        router.replace('/login');
      } else {
        setIsAuthenticated(true);
        setUserRole(session.role);
        setUserName(session.display_name);
      }
    };
    checkAuthAndInit();
  }, [router]);

  const handleDebugLogin = () => {
    setSession('u1', 'FACTORY_ADMIN', '工場管理者A');
    setIsAuthenticated(true);
    setUserRole('FACTORY_ADMIN');
    setUserName('工場管理者A');
    setErrors({});
    showToast('デバッグ用管理者としてログインしました');
  };

  const handleLogout = () => {
    clearSession();
    setIsAuthenticated(false);
    setUserRole(null);
    router.replace('/login');
  };

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const repository = new LaborSummaryRepositoryImpl();
      const useCase = new GetLaborSummaryUseCase(repository);
      const results = await useCase.execute(startDate, endDate, unit);
      
      setSummaryData(results);
      setCurrentPage(1);
      showToast('労働時間を集計しました');
    } catch (err: any) {
      setErrors({ form: err.message || '集計に失敗しました' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVDownload = () => {
    if (summaryData.length === 0) {
      setErrors({ form: 'ダウンロードする集計データがありません。先に集計を実行してください。' });
      return;
    }
    try {
      exportLaborSummaryToCSV(summaryData, unit);
      showToast('CSVファイルをダウンロードしました');
    } catch (err: any) {
      setErrors({ form: 'CSVエクスポートに失敗しました' });
    }
  };

  const handleResetData = async () => {
    if (confirm('IndexedDBの全データを初期シードで再上書きします。よろしいですか？')) {
      try {
        await initSeedData(true);
        setSummaryData([]);
        showToast('データベースを完全にリセットしました');
      } catch (err) {
        setErrors({ form: 'リセットに失敗しました' });
      }
    }
  };

  const totalPages = Math.ceil(summaryData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = summaryData.slice(indexOfFirstItem, indexOfLastItem);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">管理者権限（FACTORY_ADMIN）が必要です</h2>
          <p className="text-gray-600 mb-6">ログイン画面へ自動リダイレクト中、または未ログインです。</p>
          <div className="space-y-3">
            <button
              onClick={handleDebugLogin}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-indigo-700 transition"
            >
              [プロトタイプ検証用] 管理者として強制ログイン
            </button>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md font-semibold hover:bg-gray-300 transition"
            >
              ログイン画面へ進む
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <header className="bg-indigo-950 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-extrabold tracking-wider">勤怠・配置管理</span>
            <span className="bg-indigo-800 text-xs px-2 py-1 rounded text-indigo-200">工場管理者ポータル</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">{userName}</span>
            <button
              onClick={handleLogout}
              className="bg-indigo-900 hover:bg-indigo-800 text-xs py-1.5 px-3 rounded border border-indigo-700 transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-wrap justify-between items-center gap-3">
          <div className="text-amber-800 text-sm font-medium">
            💡 <span className="font-bold">プロトタイプ検証ツール:</span> IndexedDBとシードデータで完全ローカル動作中。
          </div>
          <button
            onClick={handleResetData}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs py-1.5 px-3 rounded font-bold transition shadow-sm"
          >
            データ完全リセット (初期シード再投入)
          </button>
        </div>

        {successMessage && (
          <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg shadow-sm font-semibold text-sm">
            ✓ {successMessage}
          </div>
        )}

        <section className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">労働時間集計条件設定</h2>
          <form onSubmit={handleCalculate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  開始日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  終了日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                  required
                />
              </div>

              <div>
                <span className="block text-sm font-bold text-gray-700 mb-2">集計単位</span>
                <div className="flex bg-gray-100 rounded-lg p-1 space-x-1">
                  <button
                    type="button"
                    onClick={() => setUnit('daily')}
                    className={`flex-1 py-2 px-3 text-sm font-bold rounded-md transition ${
                      unit === 'daily'
                        ? 'bg-white text-indigo-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    日次集計
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit('monthly')}
                    className={`flex-1 py-2 px-3 text-sm font-bold rounded-md transition ${
                      unit === 'monthly'
                        ? 'bg-white text-indigo-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    月次集計
                  </button>
                </div>
              </div>
            </div>

            {errors.form && (
              <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-sm font-semibold">
                ⚠ {errors.form}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 w-full md:w-auto"
              >
                {isLoading ? (
                  <>
                    <span className="animate-pulse">集計中...</span>
                  </>
                ) : (
                  <span>集計を実行する</span>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-4 pb-2 border-b">
            <h2 className="text-lg font-bold text-gray-800">
              集計結果一覧 ({summaryData.length} 件)
            </h2>
            {summaryData.length > 0 && (
              <button
                onClick={handleCSVDownload}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm hover:shadow transition flex items-center space-x-2 text-sm"
              >
                <span>CSVダウンロード</span>
              </button>
            )}
          </div>

          {summaryData.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium">
              条件を指定して「集計を実行する」を押下してください。
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        対象期間 ({unit === 'daily' ? '日付' : '年月'})
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        外注先企業
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        作業員名
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                        労働時間 (時間)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((item, index) => (
                      <tr key={`${item.worker_id}-${item.period}-${index}`} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {item.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.contractor_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                          {item.worker_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right text-indigo-600">
                          {item.total_hours.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition"
                  >
                    前へ
                  </button>
                  <span className="text-sm font-medium text-gray-600">
                    ページ {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition"
                  >
                    次へ
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="bg-gray-200 text-center py-4 text-xs text-gray-500 border-t">
        © 2026 外注作業員 勤怠・配置管理システム (テストプロジェクト版 フロントエンドプロトタイプ)
      </footer>
    </div>
  );
}
"
    },
    {