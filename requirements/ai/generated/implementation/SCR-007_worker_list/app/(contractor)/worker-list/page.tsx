'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Worker, QUALIFICATIONS_MAP, TRAININGS_MAP, User } from '@/features/worker/domain/types';
import { WorkerRepository } from '@/features/worker/repository/workerRepository';
import { WorkerUseCase } from '@/features/worker/usecase/workerUseCase';
import { getSession, isAuthenticated, isContractorManager } from '@/lib/auth/mockAuth';

const ITEMS_PER_PAGE = 5;

export default function WorkerListPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Dialog State
  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null);
  
  // Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const repository = useMemo(() => new WorkerRepository(), []);
  const useCase = useMemo(() => new WorkerUseCase(repository), [repository]);

  // Authentication check and data fetch
  useEffect(() => {
    if (!isAuthenticated() || !isContractorManager()) {
      router.push('/login');
      return;
    }

    const sessionUser = getSession();
    if (sessionUser && sessionUser.contractor_id) {
      setCurrentUser(sessionUser);
      loadWorkers(sessionUser.contractor_id);
    } else {
      router.push('/login');
    }
  }, [router, useCase]);

  const loadWorkers = async (contractorId: string) => {
    setLoading(true);
    setErrorMsg(null);
    const result = await useCase.getWorkers(contractorId);
    if (result.success) {
      setWorkers(result.data);
    } else {
      setErrorMsg(result.error.message);
      showToast(result.error.message, 'error');
    }
    setLoading(false);
  };

  // Pagination calculation
  const totalPages = Math.ceil(workers.length / ITEMS_PER_PAGE) || 1;
  const paginatedWorkers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return workers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [workers, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Actions
  const handleBack = () => {
    router.push('/contractor-home');
  };

  const handleAddNew = () => {
    router.push('/worker-edit');
  };

  const handleEdit = (workerId: string) => {
    router.push(`/worker-edit?id=${workerId}`);
  };

  const openDeleteDialog = (worker: Worker) => {
    setDeleteTarget(worker);
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !currentUser?.contractor_id) return;

    const result = await useCase.deleteWorker(deleteTarget.worker_id, currentUser.contractor_id);
    if (result.success) {
      showToast('作業員を削除しました。');
      // Reset page if the last item on the page was deleted
      const updatedWorkers = workers.filter((w) => w.worker_id !== deleteTarget.worker_id);
      setWorkers(updatedWorkers);
      const newTotalPages = Math.ceil(updatedWorkers.length / ITEMS_PER_PAGE) || 1;
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      }
    } else {
      showToast(result.error.message, 'error');
    }
    closeDeleteDialog();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          data-testid="toast-notification"
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded shadow-lg text-white font-medium transition-opacity duration-300 ${
            toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="戻る"
              data-testid="back-btn"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">作業員一覧</h1>
          </div>
          <div className="text-sm text-gray-600 font-medium">
            {currentUser?.display_name || 'ログイン中'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 mt-6">
        {/* Actions Area */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-600">
            登録数: <span className="font-semibold text-gray-900">{workers.length}</span> 名
          </p>
          <button
            onClick={handleAddNew}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:shadow transition flex items-center justify-center min-w-[120px] min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            data-testid="add-worker-btn"
          >
            <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            新規追加
          </button>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <span className="mt-4 text-gray-500 text-sm">作業員情報を取得中...</span>
          </div>
        ) : errorMsg ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-6 rounded-xl text-center">
            <p className="font-semibold mb-2">データの読み込みに失敗しました</p>
            <p className="text-sm">{errorMsg}</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-900 mb-1">作業員が登録されていません</h3>
            <p className="text-gray-500 text-sm mb-6">「新規追加」ボタンから最初の作業員を追加してください。</p>
            <button
              onClick={handleAddNew}
              className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg text-sm shadow-sm transition"
            >
              作業員を登録する
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      氏名
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      連絡先
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      保有資格
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      講習受講履歴
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedWorkers.map((worker) => (
                    <tr key={worker.worker_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-950">{worker.name}</div>
                        <div className="text-xs text-gray-400">ID: {worker.worker_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{worker.contact || '未登録'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {worker.qualifications && worker.qualifications.length > 0 ? (
                            worker.qualifications.map((qCode) => (
                              <span
                                key={qCode}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                              >
                                {QUALIFICATIONS_MAP[qCode] || qCode}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">なし</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {worker.trainings && worker.trainings.length > 0 ? (
                            worker.trainings.map((t, idx) => (
                              <div key={idx} className="text-xs text-gray-600 flex items-center">
                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                                <span className="font-medium mr-1.5">{TRAININGS_MAP[t.code] || t.code}</span>
                                <span className="text-gray-400">({t.taken_at})</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">履歴なし</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => handleEdit(worker.worker_id)}
                            className="text-indigo-600 hover:text-indigo-900 px-3 py-1.5 rounded hover:bg-indigo-50 transition"
                            data-testid={`edit-btn-${worker.worker_id}`}
                          >
                            編集
                          </button>
                          <button
                            onClick={() => openDeleteDialog(worker)}
                            className="text-red-600 hover:text-red-900 px-3 py-1.5 rounded hover:bg-red-50 transition"
                            data-testid={`delete-btn-${worker.worker_id}`}
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

            {/* Mobile Cards View */}
            <div className="block md:hidden space-y-4">
              {paginatedWorkers.map((worker) => (
                <div
                  key={worker.worker_id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">{worker.name}</h4>
                      <p className="text-xs text-gray-400">ID: {worker.worker_id}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">
                      アクティブ
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm pt-1 border-t border-gray-100">
                    <div>
                      <span className="text-xs text-gray-400 block">連絡先</span>
                      <span className="text-gray-700 font-medium">{worker.contact || '未登録'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-gray-400 block mb-1">資格情報</span>
                    <div className="flex flex-wrap gap-1">
                      {worker.qualifications && worker.qualifications.length > 0 ? (
                        worker.qualifications.map((qCode) => (
                          <span
                            key={qCode}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                          >
                            {QUALIFICATIONS_MAP[qCode] || qCode}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">なし</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-gray-400 block mb-1">受講履歴</span>
                    <div className="space-y-1">
                      {worker.trainings && worker.trainings.length > 0 ? (
                        worker.trainings.map((t, idx) => (
                          <div key={idx} className="text-xs text-gray-600 flex items-center">
                            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                            <span className="font-medium mr-1">{TRAININGS_MAP[t.code] || t.code}</span>
                            <span className="text-gray-400">({t.taken_at})</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">履歴なし</span>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(worker.worker_id)}
                      className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold py-2.5 px-4 rounded-lg border border-gray-200 text-center text-sm transition min-h-[44px] flex items-center justify-center"
                      data-testid={`mobile-edit-btn-${worker.worker_id}`}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => openDeleteDialog(worker)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2.5 px-4 rounded-lg border border-red-100 text-center text-sm transition min-h-[44px] flex items-center justify-center"
                      data-testid={`mobile-delete-btn-${worker.worker_id}`}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-transparent px-4 py-6 mt-4">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 min-h-[44px] min-w-[80px] ${
                      currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                    }`}
                    data-testid="prev-page-mobile"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`ml-3 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 min-h-[44px] min-w-[80px] ${
                      currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                    }`}
                    data-testid="next-page-mobile"
                  >
                    次へ
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      全 <span className="font-semibold">{workers.length}</span> 件中{' '}
                      <span className="font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> から{' '}
                      <span className="font-semibold">
                        {Math.min(currentPage * ITEMS_PER_PAGE, workers.length)}
                      </span>{' '}
                      件を表示
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="ページネーション">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`inline-flex items-center rounded-l-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 min-h-[44px] min-w-[44px] justify-center ${
                          currentPage === 1 ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                        data-testid="prev-page-btn"
                      >
                        <span className="sr-only">前へ</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            aria-current={currentPage === pageNum ? 'page' : undefined}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 min-h-[44px] min-w-[44px] justify-center ${
                              currentPage === pageNum
                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                            }`}
                            data-testid={`page-btn-${pageNum}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`inline-flex items-center rounded-r-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 min-h-[44px] min-w-[44px] justify-center ${
                          currentPage === totalPages ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                        data-testid="next-page-btn"
                      >
                        <span className="sr-only">次へ</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto" 
          aria-labelledby="modal-title" 
          role="dialog" 
          aria-modal="true"
          data-testid="delete-confirm-dialog"
        >
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background Overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              aria-hidden="true"
              onClick={closeDeleteDialog}
            ></div>

            {/* Modal Box Alignment */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
                      作業員情報の削除
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        作業員 <span className="font-semibold text-gray-950">「{deleteTarget.name}」</span> の登録を完全に削除します。
                        この操作は取り消せません。本当によろしいですか？
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="inline-flex w-full justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition sm:ml-3 sm:w-auto min-h-[44px] items-center"
                  data-testid="dialog-confirm-btn"
                >
                  削除する
                </button>
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  className="mt-3 inline-flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition sm:mt-0 sm:w-auto min-h-[44px] items-center"
                  data-testid="dialog-cancel-btn"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}