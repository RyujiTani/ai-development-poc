'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { sessionManager, Session } from '../../../../lib/auth/session';
import { useToast } from '../../../../components/ui/toast';
import { logger } from '../../../../lib/logger/logger';
import { IndexedDBAttendanceRepository } from '../../../../features/attendance/repository/attendanceRepository';
import { IndexedDBWorkerRepository } from '../../../../features/worker/repository/workerRepository';
import { IndexedDBContractorRepository } from '../../../../features/contractor/repository/contractorRepository';
import { GetLaborSummaryUseCase, LaborSummaryItem } from '../../../../features/report/usecase/getLaborSummaryUseCase';

export default function LaborSummaryPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 集計条件と状態
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [unit, setUnit] = useState<'daily' | 'monthly'>('daily');
  const [summaryData, setSummaryData] = useState<LaborSummaryItem[]>([]);
  const [searching, setSearching] = useState(false);

  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 1. 認証認可ガード
  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'FACTORY_ADMIN') {
      logger.warn('unauthorized_factory_admin_redirect_from_labor_summary', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.replace('/admin/login');
      return;
    }
    setSession(currentSession);

    // デフォルト期間（今月の1日〜本日）を設定
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    setStartDate(`${yyyy}-${mm}-01`);
    setEndDate(`${yyyy}-${mm}-${dd}`);

    setLoading(false);
    logger.info('labor_summary_page_loaded', { user_id: currentSession.user_id });
  }, [router]);

  // 2. 集計実行
  const handleCalculate = useCallback(async () => {
    if (!startDate) {
      showToast('開始日は必須項目です。', 'error');
      return;
    }
    if (!endDate) {
      showToast('終了日は必須項目です。', 'error');
      return;
    }

    setSearching(true);
    try {
      const attendanceRepo = new IndexedDBAttendanceRepository();
      const workerRepo = new IndexedDBWorkerRepository();
      const contractorRepo = new IndexedDBContractorRepository();
      const useCase = new GetLaborSummaryUseCase(attendanceRepo, workerRepo, contractorRepo);

      const result = await useCase.execute({
        startDate,
        endDate,
        unit,
      });

      if (result.success) {
        setSummaryData(result.value);
        setCurrentPage(1); // 新規集計時は1ページ目に戻す
        showToast('労働時間を集計しました。', 'success');
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      logger.error('failed_to_calculate_labor_summary', err);
      showToast('集計計算中にエラーが発生しました。', 'error');
    } finally {
      setSearching(false);
    }
  }, [startDate, endDate, unit, showToast]);

  // 初期化完了時、集計を一度自動で走らせる
  useEffect(() => {
    if (session && startDate && endDate) {
      handleCalculate();
    }
  }, [session, startDate, endDate, handleCalculate]);

  const handleLogout = () => {
    logger.info('factory_admin_logout_from_labor_summary', { user_id: session?.user_id });
    sessionManager.clearSession();
    showToast('ログアウトしました。', 'info');
    router.push('/admin/login');
  };

  const handleBackToDashboard = () => {
    router.push('/admin/dashboard');
  };

  // CSVダウンロード（papaparse 相当の自前CSVパース処理）
  const handleDownloadCSV = () => {
    if (summaryData.length === 0) {
      showToast('CSV出力する集計データがありません。', 'error');
      return;
    }

    try {
      logger.info('labor_summary_csv_download_start', { count: summaryData.length });

      const headers = ['作業員名', '外注先企業名', '期間/日付', '実労働時間(時間)'];
      const rows = summaryData.map((item) => [
        item.worker_name,
        item.contractor_name,
        item.period,
        item.total_working_hours.toString(),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((val) => {
              const escaped = val.replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(',')
        ),
      ].join('\n');

      // BOM付き UTF-8 でExcelの文字化けを防ぐ
      const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
        type: 'text/csv;charset=utf-8;',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `labor_summary_${unit}_${startDate}_${endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logger.info('labor_summary_csv_download_success');
      showToast('CSVファイルをダウンロードしました。', 'success');
    } catch (err) {
      logger.error('failed_to_download_labor_summary_csv', err);
      showToast('CSVファイルの作成に失敗しました。', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 font-medium">集計画面を初期化中...</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(summaryData.length / itemsPerPage);
  const displayedItems = summaryData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToDashboard}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition h-10 w-10 flex items-center justify-center cursor-pointer"
              aria-label="戻る"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-indigo-600 tracking-wider">勤怠・配置管理システム</span>
              <span className="text-sm font-bold text-gray-900 sm:text-base">労働時間集計</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-gray-800">{session?.display_name} 様</p>
              <p className="text-xs text-gray-500">工場管理者</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 active:bg-red-100 transition h-9 flex items-center justify-center cursor-pointer"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインエリア */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* フィルタおよび条件入力エリア */}
        <section className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-700">期間および集計単位選択</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* 開始日 */}
            <div>
              <label htmlFor="start-date" className="block text-xs font-semibold text-gray-500 mb-1">
                開始日 <span className="text-red-500 text-[10px] font-normal">(必須)</span>
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {/* 終了日 */}
            <div>
              <label htmlFor="end-date" className="block text-xs font-semibold text-gray-500 mb-1">
                終了日 <span className="text-red-500 text-[10px] font-normal">(必須)</span>
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {/* 集計単位 */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">集計単位</label>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg h-11">
                <button
                  type="button"
                  onClick={() => setUnit('daily')}
                  className={`flex-1 text-xs font-bold rounded-md transition ${
                    unit === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  日次
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('monthly')}
                  className={`flex-1 text-xs font-bold rounded-md transition ${
                    unit === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  月次
                </button>
              </div>
            </div>

            {/* 集計ボタン */}
            <div>
              <button
                id="calculate-button"
                onClick={handleCalculate}
                disabled={searching}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:bg-gray-400"
              >
                {searching ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    集計中...
                  </>
                ) : (
                  '集計'
                )}
              </button>
            </div>
          </div>
        </section>

        {/* 集計結果テーブル */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[360px]">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">集計結果一覧</h2>
              <p className="text-xs text-gray-500 mt-1">集計範囲：{startDate || '—'} 〜 {endDate || '—'}</p>
            </div>
            <button
              id="csv-download-button"
              onClick={handleDownloadCSV}
              disabled={summaryData.length === 0}
              className="h-11 px-5 border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSVダウンロード
            </button>
          </div>

          {searching ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
              <svg className="animate-spin h-8 w-8 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-500 text-sm font-medium">データを集計計算中...</p>
            </div>
          ) : summaryData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-500">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2a4 4 0 00-4-4H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v8m-6 0h6" />
              </svg>
              <p className="font-bold text-sm">表示するデータがありません</p>
              <p className="text-xs text-gray-400 mt-1">日付の選択範囲を変更し集計を実行してください。</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">作業員名</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">外注先企業名</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">日付/期間</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right pr-6">実労働時間</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 font-bold text-gray-900 text-sm">{item.worker_name}</td>
                      <td className="p-4 text-gray-600 text-sm">{item.contractor_name}</td>
                      <td className="p-4 text-gray-600 text-sm">
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">
                          {item.period}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6 font-mono font-bold text-indigo-600 text-sm">
                        {item.total_working_hours.toFixed(2)} 時間
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ページネーションエリア */}
          {!searching && totalPages > 1 && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium font-sans">
                全 {summaryData.length} 件中 {(currentPage - 1) * itemsPerPage + 1}〜
                {Math.min(summaryData.length, currentPage * itemsPerPage)} 件表示
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 h-9 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition min-w-[44px] cursor-pointer"
                >
                  前へ
                </button>
                <span className="text-xs text-gray-700 font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 h-9 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition min-w-[44px] cursor-pointer"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </section>
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