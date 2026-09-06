'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getLaborSummary, LaborSummaryRecord } from '@/features/report/usecase/getLaborSummary';
import { downloadCSV } from '@/lib/csv/csvDownload';
import { logger } from '@/lib/logger';

const summaryFilterSchema = z.object({
  startDate: z.string().min(1, { message: '開始日を入力してください' }),
  endDate: z.string().min(1, { message: '終了日を入力してください' }),
  unit: z.enum(['daily', 'monthly']),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: '終了日は開始日以降の日付を指定してください',
  path: ['endDate'],
});

type SummaryFilterValues = z.infer<typeof summaryFilterSchema>;

export default function LaborSummaryPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [summaryRecords, setSummaryRecords] = useState<LaborSummaryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ページネーション
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SummaryFilterValues>({
    resolver: zodResolver(summaryFilterSchema),
    defaultValues: {
      startDate: '',
      endDate: '',
      unit: 'daily',
    },
  });

  const selectedUnit = watch('unit');

  // 認証チェック
  useEffect(() => {
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    const userId = sessionStorage.getItem('user_id');
    const role = sessionStorage.getItem('role');

    if (!userId || role !== 'FACTORY_ADMIN') {
      logger.warn('UNAUTHORIZED_ACCESS_ATTEMPT_LABOR_SUMMARY', { userId, role });
      router.push('/admin-login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // 集計単位が切り替わったら日付入力をリセッティング
  useEffect(() => {
    setValue('startDate', '');
    setValue('endDate', '');
    setSummaryRecords([]);
    setHasSearched(false);
    setCurrentPage(1);
  }, [selectedUnit, setValue]);

  const onSubmit = async (data: SummaryFilterValues) => {
    setIsLoading(true);
    try {
      logger.info('GET_LABOR_SUMMARY_START', { ...data });
      const records = await getLaborSummary({
        startDate: data.startDate,
        endDate: data.endDate,
        unit: data.unit,
      });
      setSummaryRecords(records);
      setHasSearched(true);
      setCurrentPage(1);
      logger.info('GET_LABOR_SUMMARY_SUCCESS', { count: records.length });
    } catch (err) {
      logger.error('GET_LABOR_SUMMARY_FAILED', { error: String(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVDownload = () => {
    if (summaryRecords.length === 0) return;

    const header = ['作業員名', '外注先企業名', selectedUnit === 'daily' ? '日付' : '対象月', '労働時間(時間)'];
    const rows = summaryRecords.map((r) => [
      r.worker_name,
      r.contractor_name,
      r.date,
      r.hours.toFixed(2),
    ]);

    const filename = `labor_summary_${selectedUnit}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(filename, header, rows);
    logger.info('LABOR_SUMMARY_CSV_DOWNLOAD_SUCCESS', { filename, count: summaryRecords.length });
  };

  // ページネーション計算
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecords = summaryRecords.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(summaryRecords.length / itemsPerPage);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">労働時間集計</h1>
            <p className="text-sm text-gray-600 mt-1">工場側管理者用実労働時間集計</p>
          </div>
          <button
            onClick={() => router.push('/factory/dashboard')}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-500 transition-colors"
            style={{ minHeight: '44px' }}
          >
            ダッシュボードへ
          </button>
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6 md:py-8 flex flex-col space-y-6">
        {/* フィルタエリア */}
        <div className="bg-white rounded-xl shadow p-4 md:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* 集計単位 */}
              <div>
                <span className="block text-sm font-bold text-gray-700 mb-2">集計単位</span>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer min-h-[44px]">
                    <input
                      type="radio"
                      value="daily"
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                      {...register('unit')}
                    />
                    <span className="ml-2 text-sm font-semibold">日次</span>
                  </label>
                  <label className="flex items-center cursor-pointer min-h-[44px]">
                    <input
                      type="radio"
                      value="monthly"
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                      {...register('unit')}
                    />
                    <span className="ml-2 text-sm font-semibold">月次</span>
                  </label>
                </div>
              </div>

              {/* 開始日/開始月 */}
              <div>
                <label htmlFor="startDate" className="block text-sm font-bold text-gray-700 mb-1">
                  開始{selectedUnit === 'daily' ? '日' : '月'}
                </label>
                <input
                  id="startDate"
                  type={selectedUnit === 'daily' ? 'date' : 'month'}
                  className={`block w-full rounded-md border py-3 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px] bg-white ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  {...register('startDate')}
                />
              </div>

              {/* 終了日/終了月 */}
              <div>
                <label htmlFor="endDate" className="block text-sm font-bold text-gray-700 mb-1">
                  終了{selectedUnit === 'daily' ? '日' : '月'}
                </label>
                <input
                  id="endDate"
                  type={selectedUnit === 'daily' ? 'date' : 'month'}
                  className={`block w-full rounded-md border py-3 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px] bg-white ${
                    errors.endDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  {...register('endDate')}
                />
              </div>

              {/* ボタン */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-lg bg-blue-600 py-3 text-center text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-sm disabled:bg-blue-400"
                  style={{ minHeight: '44px' }}
                >
                  {isLoading ? '集計中...' : '集計'}
                </button>
              </div>
            </div>

            {/* バリデーションエラーメッセージ */}
            {(errors.startDate || errors.endDate) && (
              <div className="bg-red-50 text-red-700 p-3 rounded text-sm font-bold border border-red-200">
                {errors.startDate && <p data-testid="start-date-error">{errors.startDate.message}</p>}
                {errors.endDate && <p data-testid="end-date-error">{errors.endDate.message}</p>}
              </div>
            )}
          </form>
        </div>

        {/* 集計結果テーブル */}
        <div className="bg-white rounded-xl shadow overflow-hidden flex-1 flex flex-col">
          {/* 上部アクション（CSVダウンロードボタン） */}
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center flex-wrap gap-2">
            <span className="text-sm font-bold text-gray-600" data-testid="summary-count">
              集計結果: {summaryRecords.length} 件
            </span>
            <button
              onClick={handleCSVDownload}
              disabled={summaryRecords.length === 0 || isLoading}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-500 transition-colors disabled:opacity-50 disabled:bg-gray-400 shadow-sm flex items-center gap-1"
              style={{ minHeight: '44px' }}
              data-testid="csv-download-btn"
            >
              CSVダウンロード
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-500 font-bold" data-testid="loading-text">集計データを読み込み中...</div>
          ) : (
            <>
              {/* PC向けテーブル表示 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">作業員名</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">外注先企業名</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {selectedUnit === 'daily' ? '日付' : '対象月'}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">労働時間 (時間)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200" data-testid="summary-tbody">
                    {currentRecords.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                          {hasSearched ? '該当する労働時間データがありません。' : '条件を指定して『集計』ボタンを押してください。'}
                        </td>
                      </tr>
                    ) : (
                      currentRecords.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50" data-testid="summary-row">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{record.worker_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.contractor_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-950">{record.hours.toFixed(2)} 時間</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* モバイル向けカード表示 */}
              <div className="md:hidden divide-y divide-gray-200" data-testid="summary-cards">
                {currentRecords.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {hasSearched ? '該当する労働時間データがありません。' : '条件を指定して『集計』ボタンを押してください。'}
                  </div>
                ) : (
                  currentRecords.map((record, index) => (
                    <div key={index} className="p-4 space-y-2" data-testid="summary-card">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{record.worker_name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{record.contractor_name}</p>
                        </div>
                        <span className="text-xs text-gray-500 font-bold">{record.date}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-505 font-medium">労働時間:</span>
                        <span className="font-extrabold text-gray-950 text-base">{record.hours.toFixed(2)} 時間</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                    style={{ minHeight: '44px' }}
                    data-testid="pagination-prev"
                  >
                    前へ
                  </button>
                  <span className="text-sm text-gray-700" data-testid="pagination-info">
                    {currentPage} / {totalPages} ページ
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                    style={{ minHeight: '44px' }}
                    data-testid="pagination-next"
                  >
                    次へ
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}