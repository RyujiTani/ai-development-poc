'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { sessionManager, Session } from '../../../../lib/auth/session';
import { useToast } from '../../../../components/ui/toast';
import { logger } from '../../../../lib/logger/logger';
import { IndexedDBWorkerRepository } from '../../../../features/worker/repository/workerRepository';
import { GetWorkersUseCase } from '../../../../features/worker/usecase/getWorkersUseCase';
import { DeleteWorkerUseCase } from '../../../../features/worker/usecase/deleteWorkerUseCase';
import { Worker } from '../../../../features/worker/domain/worker';

export default function WorkerListPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmWorkerId, setDeleteConfirmWorkerId] = useState<string | null>(null);
  const itemsPerPage = 10;

  // 作業員一覧の取得
  const fetchWorkers = useCallback(async (contractorId: string) => {
    try {
      const workerRepository = new IndexedDBWorkerRepository();
      const getWorkersUseCase = new GetWorkersUseCase(workerRepository);
      const result = await getWorkersUseCase.execute(contractorId);

      if (result.success) {
        setWorkers(result.value);
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      showToast('作業員データの取得中にエラーが発生しました。', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 認証チェック
  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'CONTRACTOR_MANAGER') {
      logger.warn('unauthorized_access_redirect_from_worker_list', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.push('/login');
      return;
    }
    setSession(currentSession);
    fetchWorkers(currentSession.contractor_id || '');
    logger.info('worker_list_page_loaded', { user_id: currentSession.user_id });
  }, [router, fetchWorkers]);

  const handleBack = () => {
    logger.info('worker_list_back_to_home', { user_id: session?.user_id });
    router.push('/contractor');
  };

  const handleAddNew = () => {
    logger.info('worker_list_navigate_to_add', { user_id: session?.user_id });
    router.push('/contractor/workers/add');
  };

  const handleEdit = (workerId: string) => {
    logger.info('worker_list_navigate_to_edit', { worker_id: workerId, user_id: session?.user_id });
    router.push(`/contractor/workers/edit?id=${workerId}`);
  };

  const handleDeleteClick = (workerId: string) => {
    setDeleteConfirmWorkerId(workerId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmWorkerId || !session) return;

    try {
      const workerRepository = new IndexedDBWorkerRepository();
      const deleteUseCase = new DeleteWorkerUseCase(workerRepository);
      const result = await deleteUseCase.execute(deleteConfirmWorkerId);

      if (result.success) {
        showToast('作業員データを削除しました。', 'success');
        setDeleteConfirmWorkerId(null);
        // 一覧を再取得
        setLoading(true);
        await fetchWorkers(session.contractor_id || '');
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      showToast('削除処理中にエラーが発生しました。', 'error');
      console.error(err);
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
          <p className="text-gray-500 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(workers.length / itemsPerPage);
  const displayedWorkers = workers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition h-10 w-10 flex items-center justify-center cursor-pointer"
              aria-label="戻る"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-indigo-600 tracking-wider">勤怠・配置管理</span>
              <span className="text-sm font-bold text-gray-900 sm:text-base">作業員一覧</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">{session?.display_name} 様</p>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col">
        {/* 上部操作エリア */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              自社作業員マスタ
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              登録されている作業員の確認、追加、変更、削除を行えます。
            </p>
          </div>
          <button
            id="add-worker-button"
            onClick={handleAddNew}
            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm self-start sm:self-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            新規追加
          </button>
        </div>

        {/* 作業員リスト */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          {workers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mb-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 font-bold text-base">登録されている作業員がいません。</p>
              <p className="text-gray-400 text-xs mt-2 max-w-[280px] mx-auto leading-relaxed">
                右上の「新規追加」ボタンから、新しく作業員マスタ情報を追加してください。
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-sm font-bold text-gray-700">氏名</th>
                    <th className="p-4 text-sm font-bold text-gray-700 hidden sm:table-cell">連絡先</th>
                    <th className="p-4 text-sm font-bold text-gray-700">資格 / 講習</th>
                    <th className="p-4 text-sm font-bold text-gray-700 text-center w-36">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedWorkers.map((worker) => (
                    <tr key={worker.worker_id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4">
                        <p className="text-base font-bold text-gray-900">{worker.name}</p>
                        <p className="text-xs text-gray-500 sm:hidden mt-0.5">{worker.contact || '連絡先なし'}</p>
                      </td>
                      <td className="p-4 text-sm text-gray-600 hidden sm:table-cell">
                        {worker.contact || '—'}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {worker.qualifications && worker.qualifications.length > 0 ? (
                            worker.qualifications.map((qCode) => (
                              <span
                                key={qCode}
                                className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                              >
                                {qCode}
                              </span>
                            ))
                          ) : null}
                          {worker.trainings && worker.trainings.length > 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-slate-50 text-gray-600 border border-slate-200">
                              講習済 ({worker.trainings.length})
                            </span>
                          ) : null}
                          {(!worker.qualifications || worker.qualifications.length === 0) &&
                          (!worker.trainings || worker.trainings.length === 0) ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 min-h-[44px]">
                          <button
                            onClick={() => handleEdit(worker.worker_id)}
                            className="h-10 px-3 border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer min-w-[56px] justify-center"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteClick(worker.worker_id)}
                            className="h-10 px-3 border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer min-w-[56px] justify-center"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between mt-auto">
              <span className="text-xs sm:text-sm text-gray-500 font-medium">
                全 {workers.length} 名中 {Math.min(workers.length, (currentPage - 1) * itemsPerPage + 1)}〜
                {Math.min(workers.length, currentPage * itemsPerPage)} 名表示
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 h-9 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition min-w-[44px] cursor-pointer"
                >
                  前へ
                </button>
                <span className="text-xs sm:text-sm text-gray-700 font-bold">
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

        {/* 戻るボタンフッター */}
        <div className="mt-6 flex justify-start">
          <button
            onClick={handleBack}
            className="px-6 h-12 rounded-xl text-gray-600 hover:text-gray-900 border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 shadow-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto sm:min-w-[140px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7 7-7" />
            </svg>
            メニューに戻る
          </button>
        </div>
      </main>

      {/* 削除確認ダイアログモーダル */}
      {deleteConfirmWorkerId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">作業員の削除確認</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                本当にこの作業員を削除しますか？この操作を実行すると、一覧に表示されなくなります。
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmWorkerId(null)}
                className="flex-1 h-11 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer"
              >
                キャンセル
              </button>
              <button
                id="delete-confirm-button"
                onClick={handleDeleteConfirm}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-gray-400">
          &copy; 2026 勤怠・配置管理システム プロトタイプ版
        </div>
      </footer>
    </div>
  );
}