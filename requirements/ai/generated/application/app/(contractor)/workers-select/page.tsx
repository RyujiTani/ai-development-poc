"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAttendanceStore } from '@/features/attendance/store/useAttendanceStore';
import { IndexedDBUserRepository } from '@/features/user/repository/indexedDBUserRepository';
import { IndexedDBWorkerRepository } from '@/features/worker/repository/indexedDBWorkerRepository';
import { GetWorkersUseCase } from '@/features/worker/usecase/getWorkersUseCase';
import { Worker } from '@/features/worker/domain/types';
import { logger } from '@/lib/logger';

export default function WorkerSelectPage() {
  const router = useRouter();
  const { punchType, setSelectedWorkerIds } = useAttendanceStore();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const checkAuthAndFetchWorkers = async () => {
      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'CONTRACTOR_MANAGER') {
        logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: '/workers-select' });
        router.replace('/login');
        return;
      }

      setIsAuthenticated(true);

      try {
        const userRepository = new IndexedDBUserRepository();
        const user = await userRepository.findById(userId);

        if (!user || !user.contractor_id) {
          logger.info('USER_OR_CONTRACTOR_NOT_FOUND', { userId });
          router.replace('/login');
          return;
        }

        const workerRepository = new IndexedDBWorkerRepository();
        const getWorkersUseCase = new GetWorkersUseCase(workerRepository);
        const result = await getWorkersUseCase.execute(user.contractor_id);

        if (result.success) {
          setWorkers(result.value);
        } else if ('error' in result) {
          setErrorMessage(result.error.message);
        }
      } catch (error) {
        logger.error('FETCH_WORKERS_SYSTEM_ERROR', error);
        setErrorMessage('システムエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndFetchWorkers();
  }, [router]);

  if (!isAuthenticated) {
    return null;
  }

  // ページネーション計算
  const totalPages = Math.ceil(workers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentWorkers = workers.slice(indexOfFirstItem, indexOfLastItem);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = workers.map((w) => w.worker_id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectWorker = (workerId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, workerId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== workerId));
    }
  };

  const handleNext = () => {
    if (selectedIds.length === 0) {
      setErrorMessage('作業員を1名以上選択してください。');
      return;
    }

    setErrorMessage(null);
    setSelectedWorkerIds(selectedIds);
    logger.info('WORKERS_SELECTED_NEXT', { selectedCount: selectedIds.length });
    
    // 撮影・送信画面（SCR-005）へ遷移
    router.push('/punch-camera');
  };

  const handleBack = () => {
    logger.info('NAVIGATE_BACK_TO_PUNCH_MODE');
    router.push('/punch-mode');
  };

  const isAllSelected = workers.length > 0 && selectedIds.length === workers.length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー領域 */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
              作業員選択
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-gray-500">現在の打刻モード:</span>
              <span
                data-testid="punch-mode-badge"
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  punchType === 'CLOCK_IN'
                    ? 'bg-emerald-100 text-emerald-800'
                    : punchType === 'CLOCK_OUT'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {punchType === 'CLOCK_IN' ? '出勤モード' : punchType === 'CLOCK_OUT' ? '退勤モード' : '未設定'}
              </span>
            </div>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center justify-center h-10 px-4 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            戻る
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {errorMessage && (
          <div
            className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12" data-testid="loading">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* 一括選択領域 */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer min-h-[44px] px-2 rounded hover:bg-gray-100 select-none">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-6 w-6 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  data-testid="select-all-checkbox"
                />
                <span className="text-sm font-bold text-gray-700">
                  全作業員を一括選択 / 解除
                </span>
              </label>
              <span className="text-sm text-gray-500 font-mono">
                選択中: {selectedIds.length} / {workers.length} 名
              </span>
            </div>

            {/* 作業員リスト */}
            {workers.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                登録されているアクティブな作業員がいません。
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {currentWorkers.map((worker) => {
                  const isChecked = selectedIds.includes(worker.worker_id);
                  return (
                    <li key={worker.worker_id}>
                      <label className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer min-h-[64px] w-full select-none">
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleSelectWorker(worker.worker_id, e.target.checked)}
                            className="h-6 w-6 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            data-testid={`worker-checkbox-${worker.worker_id}`}
                          />
                          <div className="flex flex-col">
                            <span className="text-base font-bold text-gray-900">
                              {worker.name}
                            </span>
                            {worker.qualifications && worker.qualifications.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {worker.qualifications.map((qual) => (
                                  <span
                                    key={qual}
                                    className="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700"
                                  >
                                    {qual}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* ページネーションUI */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex h-10 px-4 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
                  className="flex h-10 px-4 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  data-testid="next-page-btn"
                >
                  次へ
                </button>
              </div>
            )}
          </div>
        )}

        {/* アクションボタン */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="flex h-12 w-full sm:w-48 items-center justify-center rounded-md bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
            data-testid="next-btn"
          >
            次へ
          </button>
        </div>
      </main>
    </div>
  );
}