'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { seedIfNeeded } from '@/lib/db/indexedDb';
import { WorkerRepository } from '@/features/worker/repository/workerRepository';
import { WorkerUseCase } from '@/features/worker/usecase/workerUseCase';
import { Worker, User } from '@/features/worker/domain/types';
import { logger } from '@/lib/logger/logger';

const QUALIFICATION_MAP: Record<string, string> = {
  QUAL_01: '職長・安全衛生責任者',
  QUAL_02: '足場の組立て等作業主任者',
  QUAL_03: '玉掛け技能講習',
};

const TRAINING_MAP: Record<string, string> = {
  TR_01: '安全衛生教育',
  TR_02: '新規入場者教育',
};

export default function WorkerListPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const workerUseCase = useMemo(() => new WorkerUseCase(new WorkerRepository()), []);

  useEffect(() => {
    async function init() {
      try {
        const session = getSession();
        if (!session || session.role !== 'CONTRACTOR_MANAGER') {
          logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: '/workers' });
          router.push('/login');
          return;
        }
        setCurrentUser(session);

        await seedIfNeeded();
        const data = await workerUseCase.getWorkers(session.contractor_id || '');
        setWorkers(data);
      } catch (err) {
        logger.error('WORKER_LIST_INIT_FAILED', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, workerUseCase]);

  const handleDelete = async (workerId: string, workerName: string) => {
    const confirmed = window.confirm(`作業員「${workerName}」を本当に削除しますか？`);
    if (!confirmed) return;

    try {
      await workerUseCase.deleteWorker(workerId);
      logger.info('WORKER_DELETED', { workerId });
      
      if (currentUser) {
        const data = await workerUseCase.getWorkers(currentUser.contractor_id || '');
        setWorkers(data);
        
        const newTotalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
        if (currentPage > newTotalPages) {
          setCurrentPage(newTotalPages);
        }
      }
    } catch (err) {
      logger.error('WORKER_DELETE_FAILED', err, { workerId });
      alert('削除に失敗しました。');
    }
  };

  const handleNavigateNew = () => {
    logger.info('NAVIGATE_TO_NEW_WORKER');
    router.push('/contractor/workers/new');
  };

  const handleNavigateEdit = (workerId: string) => {
    logger.info('NAVIGATE_TO_EDIT_WORKER', { workerId });
    router.push(`/contractor/workers/edit?id=${workerId}`);
  };

  const handleNavigateBack = () => {
    logger.info('NAVIGATE_TO_HOME');
    router.push('/contractor/home');
  };

  const totalPages = Math.max(1, Math.ceil(workers.length / itemsPerPage));
  const paginatedWorkers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return workers.slice(start, start + itemsPerPage);
  }, [workers, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleNavigateBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors py-2 px-3 rounded-md hover:bg-gray-100 min-h-[44px] text-sm font-medium"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            戻る
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">
            作業員マスタ管理
          </h1>
          <div className="text-xs text-gray-500 max-sm:hidden">
            {currentUser?.display_name}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        {/* 上部アクションバー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">
              登録済みの自社作業員一覧を表示しています。（全 {workers.length} 名）
            </p>
          </div>
          <button
            onClick={handleNavigateNew}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center min-h-[44px] text-base"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            新規作業員登録
          </button>
        </div>

        {/* 作業員リスト */}
        {workers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-gray-500 font-medium">作業員が登録されていません</p>
            <p className="text-sm text-gray-400 mt-1">
              右上のボタンから新規登録を行ってください。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* PC・タブレット向けテーブルレイアウト */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      氏名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      連絡先
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      保有資格
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      講習受講履歴
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedWorkers.map((worker) => (
                    <tr key={worker.worker_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {worker.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {worker.contact || '未設定'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {worker.qualifications && worker.qualifications.length > 0 ? (
                            worker.qualifications.map((q) => (
                              <span
                                key={q}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"
                              >
                                {QUALIFICATION_MAP[q] || q}
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
                            worker.trainings.map((t) => (
                              <div key={t.code} className="text-xs text-gray-600 flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5"></span>
                                {TRAINING_MAP[t.code] || t.code} ({t.taken_at})
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">なし</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleNavigateEdit(worker.worker_id)}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors min-h-[36px]"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(worker.worker_id, worker.name)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors min-h-[36px]"
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

            {/* スマホ向けカードレイアウト */}
            <div className="space-y-4 md:hidden">
              {paginatedWorkers.map((worker) => (
                <div
                  key={worker.worker_id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-base font-bold text-gray-900">
                      {worker.name}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {worker.contact || '連絡先なし'}
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        保有資格
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {worker.qualifications && worker.qualifications.length > 0 ? (
                          worker.qualifications.map((q) => (
                            <span
                              key={q}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100"
                            >
                              {QUALIFICATION_MAP[q] || q}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">なし</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        講習受講履歴
                      </h4>
                      <div className="space-y-1 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        {worker.trainings && worker.trainings.length > 0 ? (
                          worker.trainings.map((t) => (
                            <div key={t.code} className="text-xs text-gray-600 flex items-center justify-between">
                              <span className="font-medium">
                                {TRAINING_MAP[t.code] || t.code}
                              </span>
                              <span className="text-gray-400 font-mono">{t.taken_at}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">なし</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン（スマホ対応タップ領域） */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleNavigateEdit(worker.worker_id)}
                      className="flex-1 max-w-[120px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-lg text-center transition-colors flex items-center justify-center min-h-[44px]"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(worker.worker_id, worker.name)}
                      className="flex-1 max-w-[120px] bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg text-center transition-colors flex items-center justify-center min-h-[44px]"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ページネーションコントロール */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-4 py-3.5 rounded-xl border border-gray-200 shadow-sm mt-4">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                  >
                    次へ
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      全 <span className="font-medium">{workers.length}</span> 件中{' '}
                      <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> から{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, workers.length)}
                      </span>{' '}
                      件を表示
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 min-h-[44px] min-w-[44px] justify-center"
                      >
                        <span className="sr-only">前へ</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPage(idx + 1)}
                          aria-current={currentPage === idx + 1 ? 'page' : undefined}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold min-h-[44px] min-w-[44px] justify-center ${
                            currentPage === idx + 1
                              ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 min-h-[44px] min-w-[44px] justify-center"
                      >
                        <span className="sr-only">次へ</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}