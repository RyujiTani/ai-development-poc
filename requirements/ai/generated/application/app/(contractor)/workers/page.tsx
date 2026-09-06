'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Worker } from '@/features/attendance/domain/types';
import { workerRepository } from '@/features/worker/repository/workerRepository';
import { initDB } from '@/lib/db/indexedDB';
import { logger } from '@/lib/logger';
import { logoutMock } from '@/lib/auth/mockAuth';

export default function WorkerListPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function checkAuthAndFetchWorkers() {
      if (typeof window === 'undefined' || !window.sessionStorage) return;

      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');
      const contractorId = sessionStorage.getItem('contractor_id');

      if (!userId || role !== 'CONTRACTOR_MANAGER' || !contractorId) {
        logger.warn('UNAUTHORIZED_ACCESS_ATTEMPT', { userId, role });
        router.push('/login');
        return;
      }

      try {
        const db = await initDB();
        
        // ユーザー情報の検証
        const userTx = db.transaction('users', 'readonly');
        const userStore = userTx.objectStore('users');
        const user = (await userStore.get(userId)) as User | undefined;

        if (!user || user.role !== 'CONTRACTOR_MANAGER' || user.status !== 'ACTIVE') {
          logger.warn('INVALID_USER_OR_ROLE', { userId });
          logoutMock();
          router.push('/login');
          return;
        }

        setCurrentUser(user);
        await fetchWorkers(contractorId);
      } catch (error) {
        logger.error('FETCH_WORKERS_FAILED', { error: String(error) });
        setErrorMessage('データの取得に失敗しました');
        setIsLoading(false);
      }
    }

    checkAuthAndFetchWorkers();
  }, [router]);

  const fetchWorkers = async (contractorId: string) => {
    try {
      setIsLoading(true);
      const list = await workerRepository.getWorkersByContractor(contractorId);
      
      // ステータスが ACTIVE な作業員のみを抽出し、氏名でソート
      const activeWorkers = list
        .filter((w) => w.status === 'ACTIVE')
        .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

      setWorkers(activeWorkers);
      logger.info('FETCH_WORKERS_SUCCESS', { contractorId, count: activeWorkers.length });
    } catch (error) {
      logger.error('FETCH_WORKERS_FAILED', { error: String(error) });
      setErrorMessage('作業員データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (workerId: string, workerName: string) => {
    const confirmed = window.confirm(`${workerName} さんを削除してもよろしいですか？`);
    if (!confirmed) {
      logger.info('WORKER_DELETE_CANCELLED', { workerId });
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    logger.info('WORKER_DELETE_START', { workerId });

    try {
      const result = await workerRepository.deleteWorker(workerId);
      if (result.success) {
        logger.info('WORKER_DELETE_SUCCESS', { workerId });
        const contractorId = sessionStorage.getItem('contractor_id') || '';
        await fetchWorkers(contractorId);
      } else {
        throw new Error('削除処理に失敗しました');
      }
    } catch (error) {
      logger.error('WORKER_DELETE_FAILED', { workerId, error: String(error) });
      setErrorMessage('削除に失敗しました。再試行してください。');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    logger.info('BACK_TO_HOME_TRIGGERED');
    router.push('/contractor/home');
  };

  // ページネーション計算
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentWorkers = workers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(workers.length / itemsPerPage);

  if (isLoading && workers.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">作業員一覧</h1>
            {currentUser && (
              <p className="text-sm text-gray-600 mt-1">
                ログイン中: <span className="font-semibold">{currentUser.display_name}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleBack}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-500 transition-colors"
            style={{ minHeight: '44px' }}
          >
            戻る
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-6 flex flex-col space-y-4">
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
            <span className="block sm:inline text-sm font-bold">{errorMessage}</span>
          </div>
        )}

        {/* 新規追加ボタンと件数表示 */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow">
          <span className="text-sm font-medium text-gray-505">
            登録作業員: <span className="font-bold text-gray-900">{workers.length}名</span>
          </span>
          <button
            onClick={() => router.push('/contractor/workers/new')}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors flex items-center gap-1 shadow-sm"
            style={{ minHeight: '44px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新規追加
          </button>
        </div>

        {/* 作業員リスト */}
        <div className="bg-white rounded-xl shadow overflow-hidden flex-1 flex flex-col">
          {/* PC向けテーブル表示 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氏名</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">連絡先</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">資格</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">講習受講履歴</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">アクション</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                      登録されている作業員がいません。
                    </td>
                  </tr>
                ) : (
                  currentWorkers.map((worker) => (
                    <tr key={worker.worker_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{worker.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{worker.contact || '未登録'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {worker.qualifications && worker.qualifications.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {worker.qualifications.map((q, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {q}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">なし</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {worker.trainings && worker.trainings.length > 0 ? (
                          <ul className="list-disc list-inside space-y-0.5">
                            {worker.trainings.map((t, idx) => (
                              <li key={idx} className="text-xs">
                                {t.code} ({t.taken_at})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-400">なし</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => router.push(`/contractor/workers/${worker.worker_id}`)}
                            className="text-blue-600 hover:text-blue-900 font-semibold px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
                            style={{ minHeight: '44px', minWidth: '44px' }}
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(worker.worker_id, worker.name)}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-900 font-semibold px-3 py-1.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                            style={{ minHeight: '44px', minWidth: '44px' }}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* モバイル向けカード表示 */}
          <div className="md:hidden divide-y divide-gray-200">
            {currentWorkers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                登録されている作業員がいません。
              </div>
            ) : (
              currentWorkers.map((worker) => (
                <div key={worker.worker_id} className="p-4 flex flex-col space-y-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{worker.name}</h3>
                      <p className="text-sm text-gray-505 mt-0.5">連絡先: {worker.contact || '未登録'}</p>
                    </div>
                  </div>

                  {/* 資格 */}
                  <div>
                    <span className="text-xs font-semibold text-gray-500 block mb-1">資格</span>
                    {worker.qualifications && worker.qualifications.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {worker.qualifications.map((q, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {q}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">なし</span>
                    )}
                  </div>

                  {/* 講習受講履歴 */}
                  <div>
                    <span className="text-xs font-semibold text-gray-505 block mb-1">講習受講履歴</span>
                    {worker.trainings && worker.trainings.length > 0 ? (
                      <ul className="list-disc list-inside space-y-0.5">
                        {worker.trainings.map((t, idx) => (
                          <li key={idx} className="text-xs text-gray-600">
                            {t.code} ({t.taken_at})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-gray-400">なし</span>
                    )}
                  </div>

                  {/* モバイル用アクションボタン */}
                  <div className="flex justify-end gap-4 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => router.push(`/contractor/workers/${worker.worker_id}`)}
                      className="flex-1 rounded-lg bg-gray-100 py-3 px-4 text-center text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors"
                      style={{ minHeight: '44px' }}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(worker.worker_id, worker.name)}
                      disabled={isDeleting}
                      className="flex-1 rounded-lg bg-red-50 py-3 px-4 text-center text-sm font-bold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                      style={{ minHeight: '44px' }}
                    >
                      削除
                    </button>
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
              >
                前へ
              </button>
              <span className="text-sm text-gray-700">
                {currentPage} / {totalPages} ページ
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                style={{ minHeight: '44px' }}
              >
                次へ
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}