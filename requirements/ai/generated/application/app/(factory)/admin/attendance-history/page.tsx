'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { sessionManager, Session } from '../../../../lib/auth/session';
import { useToast } from '../../../../components/ui/toast';
import { logger } from '../../../../lib/logger/logger';
import { IndexedDBAttendanceRepository } from '../../../../features/attendance/repository/attendanceRepository';
import { IndexedDBWorkerRepository } from '../../../../features/worker/repository/workerRepository';
import { IndexedDBContractorRepository } from '../../../../features/contractor/repository/contractorRepository';
import { GetAttendanceHistoryUseCase, AttendanceHistoryItem } from '../../../../features/attendance/usecase/getAttendanceHistoryUseCase';
import { Contractor } from '../../../../features/contractor/domain/contractor';
import { AttendanceThumbnail } from '../../../../features/attendance/ui/AttendanceThumbnail';
import { PhotoModal } from '../../../../features/attendance/ui/PhotoModal';
import { CorrectionModal } from '../../../../features/attendance/ui/CorrectionModal';

export default function AttendanceHistoryPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [historyItems, setHistoryItems] = useState<AttendanceHistoryItem[]>([]);
  const [filters, setFilters] = useState({ date: '', contractorId: '' });
  const [loadingItems, setLoadingItems] = useState(false);

  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // モーダル管理用
  const [selectedPhotoObjectId, setSelectedPhotoObjectId] = useState<string | null>(null);
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<AttendanceHistoryItem | null>(null);

  // 1. 認証認可ガード
  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'FACTORY_ADMIN') {
      logger.warn('unauthorized_factory_admin_redirect_from_attendance_history', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.replace('/admin/login');
      return;
    }
    setSession(currentSession);
    setLoading(false);
    logger.info('attendance_history_page_loaded', { user_id: currentSession.user_id });
  }, [router]);

  // 2. 外注先プルダウンのデータ取得
  useEffect(() => {
    if (!session) return;
    const fetchContractors = async () => {
      try {
        const repo = new IndexedDBContractorRepository();
        const list = await repo.findAll();
        setContractors(list.filter((c) => c.status === 'ACTIVE'));
      } catch (err) {
        logger.error('failed_to_fetch_contractors_for_filter', err);
      }
    };
    fetchContractors();
  }, [session]);

  // 3. 打刻履歴の取得
  const fetchHistory = useCallback(async () => {
    setLoadingItems(true);
    try {
      const attendanceRepo = new IndexedDBAttendanceRepository();
      const workerRepo = new IndexedDBWorkerRepository();
      const contractorRepo = new IndexedDBContractorRepository();
      const useCase = new GetAttendanceHistoryUseCase(attendanceRepo, workerRepo, contractorRepo);
      const result = await useCase.execute(filters);

      if (result.success) {
        setHistoryItems(result.value);
        setCurrentPage(1); // フィルタ変更時は1ページ目に戻す
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      logger.error('failed_to_fetch_attendance_history', err);
      showToast('履歴データの取得に失敗しました。', 'error');
    } finally {
      setLoadingItems(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    if (session) {
      fetchHistory();
    }
  }, [session, fetchHistory]);

  const handleFilterChange = (field: 'date' | 'contractorId', value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      logger.info('attendance_history_filter_changed', next);
      return next;
    });
  };

  const handleLogout = () => {
    logger.info('factory_admin_logout_from_history', { user_id: session?.user_id });
    sessionManager.clearSession();
    showToast('ログアウトしました。', 'info');
    router.push('/admin/login');
  };

  const handleBackToDashboard = () => {
    router.push('/admin/dashboard');
  };

  const handleCorrectionSuccess = () => {
    showToast('打刻データを修正しました。', 'success');
    setSelectedRecordForCorrection(null);
    fetchHistory(); // 一覧を再取得
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(historyItems.length / itemsPerPage);
  const displayedItems = historyItems.slice(
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
              <span className="text-sm font-bold text-gray-900 sm:text-base">打刻履歴確認</span>
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

      {/* メイン */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* フィルタエリア */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-3">フィルタ条件</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 日付フィルタ */}
            <div>
              <label htmlFor="filter-date" className="block text-xs font-semibold text-gray-500 mb-1">
                日付選択
              </label>
              <input
                id="filter-date"
                type="date"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {/* 外注先フィルタ */}
            <div>
              <label htmlFor="filter-contractor" className="block text-xs font-semibold text-gray-500 mb-1">
                外注先企業
              </label>
              <select
                id="filter-contractor"
                value={filters.contractorId}
                onChange={(e) => handleFilterChange('contractorId', e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
              >
                <option value="">すべての外注先</option>
                {contractors.map((c) => (
                  <option key={c.contractor_id} value={c.contractor_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 履歴一覧テーブル */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[400px]">
          {loadingItems ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
              <svg className="animate-spin h-8 w-8 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-500 text-sm font-medium">データを読み込み中...</p>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-500">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6M12 9v6m-9 3H3a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2z" />
              </svg>
              <p className="font-bold text-sm">該当する打刻データがありません</p>
              <p className="text-xs text-gray-400 mt-1">別の条件で絞り込んでみてください。</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">作業員名</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">外注先名</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">打刻種別</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">打刻日時</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">写真</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedItems.map((item) => {
                    const typeLabel = item.punch_type === 'CLOCK_IN' ? '出勤' : '退勤';
                    const typeBadgeClass = item.punch_type === 'CLOCK_IN'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-orange-50 text-orange-700 border-orange-200';

                    return (
                      <tr key={item.attendance_id} className="hover:bg-gray-50/50 transition">
                        <td className="p-4 font-bold text-gray-900 text-sm">{item.worker_name}</td>
                        <td className="p-4 text-gray-600 text-sm">{item.contractor_name}</td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold border ${typeBadgeClass}`}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600 text-sm">
                          {new Date(item.clocked_at).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center">
                            <AttendanceThumbnail
                              photoObjectId={item.photo_object_id}
                              onClick={() => setSelectedPhotoObjectId(item.photo_object_id)}
                            />
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setSelectedRecordForCorrection(item)}
                            className="px-3 h-9 border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            修正
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ページネーション */}
          {!loadingItems && totalPages > 1 && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                全 {historyItems.length} 件中 {(currentPage - 1) * itemsPerPage + 1}〜
                {Math.min(historyItems.length, currentPage * itemsPerPage)} 件表示
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
        </div>
      </main>

      {/* 写真拡大モーダル */}
      {selectedPhotoObjectId && (
        <PhotoModal
          photoObjectId={selectedPhotoObjectId}
          onClose={() => setSelectedPhotoObjectId(null)}
        />
      )}

      {/* 打刻修正モーダル */}
      {selectedRecordForCorrection && (
        <CorrectionModal
          record={selectedRecordForCorrection}
          userId={session?.user_id || ''}
          onClose={() => setSelectedRecordForCorrection(null)}
          onSuccess={handleCorrectionSuccess}
        />
      )}

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400">
          &copy; 2026 勤怠・配置管理システム プロトタイプ版 (工場側管理者ポータル)
        </div>
      </footer>
    </div>
  );
}