"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IndexedDBUserRepository } from '@/features/user/repository/indexedDBUserRepository';
import { IndexedDBWorkerRepository } from '@/features/worker/repository/indexedDBWorkerRepository';
import { GetWorkersUseCase } from '@/features/worker/usecase/getWorkersUseCase';
import { DeleteWorkerUseCase } from '@/features/worker/usecase/deleteWorkerUseCase';
import { Worker } from '@/features/worker/domain/types';
import { User } from '@/features/user/domain/types';
import { logger } from '@/lib/logger';

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default function WorkerListPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchWorkers = async (contractorId: string) => {
    try {
      const workerRepository = new IndexedDBWorkerRepository();
      const getWorkersUseCase = new GetWorkersUseCase(workerRepository);
      const result = await getWorkersUseCase.execute(contractorId);

      if (result.success) {
        setWorkers(result.value);
      } else if ('error' in result) {
        setErrorMessage(result.error.message);
      }
    } catch (error) {
      logger.error('FETCH_WORKERS_ERROR', error);
      setErrorMessage('システムエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkAuthAndInit = async () => {
      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'CONTRACTOR_MANAGER') {
        logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: '/workers' });
        router.replace('/login');
        return;
      }

      try {
        const userRepository = new IndexedDBUserRepository();
        const user = await userRepository.findById(userId);
        if (!user || user.status !== 'ACTIVE' || !user.contractor_id) {
          logger.info('USER_OR_CONTRACTOR_NOT_FOUND', { userId });
          sessionStorage.clear();
          router.replace('/login');
          return;
        }

        setCurrentUser(user);
        setIsAuthenticated(true);
        await fetchWorkers(user.contractor_id);
      } catch (error) {
        logger.error('AUTH_INIT_ERROR', error);
        router.replace('/login');
      }
    };

    checkAuthAndInit();
  }, [router]);

  const handleBack = () => {
    logger.info('NAVIGATE_BACK_TO_HOME');
    router.push('/home');
  };

  const handleAddWorker = () => {
    logger.info('NAVIGATE_TO_ADD_WORKER');
    router.push('/workers/new');
  };

  const handleEditWorker = (workerId: string) => {
    logger.info('NAVIGATE_TO_EDIT_WORKER', { workerId });
    router.push(`/workers/${workerId}`);
  };

  const handleDeleteWorker = async (workerId: string) => {
    const confirmed = window.confirm('本当に削除しますか？');
    if (!confirmed) {
      logger.info('DELETE_WORKER_CANCELLED', { workerId });
      return;
    }

    try {
      const workerRepository = new IndexedDBWorkerRepository();
      const deleteWorkerUseCase = new DeleteWorkerUseCase(workerRepository);
      const result = await deleteWorkerUseCase.execute(workerId);

      if (result.success) {
        logger.info('DELETE_WORKER_SUCCESS_UI', { workerId });
        if (currentUser?.contractor_id) {
          await fetchWorkers(currentUser.contractor_id);
        }
      } else if ('error' in result) {
        setErrorMessage(result.error.message);
      }
    } catch (error) {
      logger.error('DELETE_WORKER_SYSTEM_ERROR', error);
      setErrorMessage('削除処理中にエラーが発生しました。');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  // ページネーション計算
  const totalPages = Math.ceil(workers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentWorkers = workers.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー領域 */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center justify-center h-10 w-10 rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="戻る"
              data-testid="back-btn"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
              作業員一覧
            </h1>
          </div>
          <span className="text-sm font-medium text-gray-500">
            {currentUser?.display_name}
          </span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {errorMessage && (
          <div
            className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200"
            role="alert"
            data-testid="error-message"
          >
            {errorMessage}
          </div>
        )}

        {/* 新規追加ボタン配置 */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={handleAddWorker}
            className="flex items-center justify-center gap-2 h-12 px-5 rounded-md bg-indigo-600 text-white font-bold shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[44px]"
            data-testid="add-worker-btn"
          >
            <PlusIcon className="h-5 w-5" />
            <span>新規追加</span>
          </button>
          <span className="text-sm text-gray-500 font-mono">
            登録数: {workers.length} 名
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12" data-testid="loading">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* 作業員リスト */}
            {workers.length === 0 ? (
              <div className="p-12 text-center text-gray-500" data-testid="no-workers">
                登録されている作業員がいません。
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* スマホ用カード型・PC用テーブル型のハイブリッド */}
                <div className="block sm:hidden">
                  <ul className="divide-y divide-gray-200">
                    {currentWorkers.map((worker) => (
                      <li key={worker.worker_id} className="p-4 flex flex-col gap-3">
                        <div>
                          <p className="text-lg font-bold text-gray-900">{worker.name}</p>
                          <p className="text-sm text-gray-500 mt-0.5">連絡先: {worker.contact || '未登録'}</p>
                        </div>
                        
                        {/* 資格情報 */}
                        <div className="flex flex-wrap gap-1">
                          {worker.qualifications && worker.qualifications.length > 0 ? (
                            worker.qualifications.map((qual) => (
                              <span
                                key={qual}
                                className="inline-flex items-center rounded bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700"
                              >
                                {qual}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">資格なし</span>
                          )}
                        </div>

                        {/* 操作ボタン */}
                        <div className="flex gap-3 mt-1">
                          <button
                            onClick={() => handleEditWorker(worker.worker_id)}
                            className="flex-1 h-11 rounded border border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center min-h-[44px]"
                            data-testid={`edit-btn-mobile-${worker.worker_id}`}
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteWorker(worker.worker_id)}
                            className="flex-1 h-11 rounded border border-red-200 bg-red-50 text-sm font-bold text-red-600 hover:bg-red-100 flex items-center justify-center min-h-[44px]"
                            data-testid={`delete-btn-mobile-${worker.worker_id}`}
                          >
                            削除
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <table className="hidden sm:table min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-sm font-bold text-gray-700">氏名</th>
                      <th className="px-6 py-3.5 text-left text-sm font-bold text-gray-700">連絡先</th>
                      <th className="px-6 py-3.5 text-left text-sm font-bold text-gray-700">保有資格</th>
                      <th className="px-6 py-3.5 text-right text-sm font-bold text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {currentWorkers.map((worker) => (
                      <tr key={worker.worker_id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-gray-900">{worker.name}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{worker.contact || '未登録'}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {worker.qualifications && worker.qualifications.length > 0 ? (
                              worker.qualifications.map((qual) => (
                                <span
                                  key={qual}
                                  className="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700"
                                >
                                  {qual}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">資格なし</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => handleEditWorker(worker.worker_id)}
                              className="text-indigo-600 hover:text-indigo-900 font-bold px-3 py-1.5 rounded hover:bg-indigo-50 min-h-[36px]"
                              data-testid={`edit-btn-${worker.worker_id}`}
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteWorker(worker.worker_id)}
                              className="text-red-600 hover:text-red-900 font-bold px-3 py-1.5 rounded hover:bg-red-50 min-h-[36px]"
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
            )}

            {/* ページネーションUI */}
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