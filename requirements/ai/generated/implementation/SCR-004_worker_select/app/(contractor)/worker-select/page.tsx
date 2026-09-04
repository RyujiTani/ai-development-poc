'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkerSelectStore } from '@/features/attendance/ui/WorkerSelectStore';
import { WorkerRepository } from '@/features/attendance/repository/workerRepository';
import { getSessionUser } from '@/lib/auth/mockAuth';
import { Worker } from '@/features/attendance/domain/types';
import { seedDatabase } from '@/lib/db/indexedDB';

export default function WorkerSelectPage() {
  const router = useRouter();
  const { punchType, selectedWorkerIds, toggleWorkerSelection, setSelectedWorkerIds } = useWorkerSelectStore();

  const workerRepository = useMemo(() => new WorkerRepository(), []);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('');

  // ページネーション用ステート
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    // 1. 認証認可ガード
    const user = getSessionUser();
    if (!user || user.role !== 'CONTRACTOR_MANAGER' || !user.contractor_id) {
      router.push('/login');
      return;
    }
    setUserDisplayName(user.display_name);

    // 2. 所属企業の作業員データロード
    const loadWorkers = async () => {
      try {
        setIsLoading(true);
        let list = await workerRepository.getWorkersByContractor(user.contractor_id!);
        // IndexedDBが空だった場合に初期シードデータを投入する
        if (list.length === 0) {
          await seedDatabase();
          list = await workerRepository.getWorkersByContractor(user.contractor_id!);
        }
        setWorkers(list);
      } catch (err) {
        console.error(err);
        setErrorMessage('作業員の取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkers();
  }, [router, workerRepository]);

  // ページ割当データ
  const paginatedWorkers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return workers.slice(startIndex, startIndex + itemsPerPage);
  }, [workers, currentPage]);

  const totalPages = Math.ceil(workers.length / itemsPerPage);

  // ページ内一括選択・一括解除
  const handleSelectAllOnPage = () => {
    const pageWorkerIds = paginatedWorkers.map((w) => w.worker_id);
    const allSelectedOnPage = pageWorkerIds.every((id) => selectedWorkerIds.includes(id));

    if (allSelectedOnPage) {
      setSelectedWorkerIds(selectedWorkerIds.filter((id) => !pageWorkerIds.includes(id)));
    } else {
      const newSelected = [...selectedWorkerIds];
      pageWorkerIds.forEach((id) => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      setSelectedWorkerIds(newSelected);
    }
  };

  const isAllSelectedOnPage = useMemo(() => {
    if (paginatedWorkers.length === 0) return false;
    return paginatedWorkers.every((w) => selectedWorkerIds.includes(w.worker_id));
  }, [paginatedWorkers, selectedWorkerIds]);

  const handleNext = () => {
    if (selectedWorkerIds.length === 0) {
      setErrorMessage('作業員を1名以上選択してください。');
      return;
    }
    setErrorMessage(null);
    router.push('/worker-select/photo');
  };

  const handleBack = () => {
    router.push('/punch-mode');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">作業員データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 画面ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-semibold">外注先管理者</span>
            <span className="text-sm text-gray-800 font-bold">{userDisplayName}</span>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-sm font-black shadow-sm ${
            punchType === 'CLOCK_IN' 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
              : 'bg-orange-100 text-orange-800 border border-orange-300'
          }`}>
            {punchType === 'CLOCK_IN' ? '☀️ 出勤モード' : '🌙 退勤モード'}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col gap-4">
        {/* インフォメーションカード */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">打刻する作業員の選択</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            打刻対象者のチェックボックスをONにしてください。複数選択して一度に撮影打刻できます。
          </p>
        </div>

        {/* バリデーションエラー表示 */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm font-semibold flex items-start gap-2 shadow-sm animate-pulse">
            <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 一括操作 & 選択バッジ */}
        <div className="flex items-center justify-between px-2 bg-gray-100 py-2 rounded-lg">
          <button
            type="button"
            onClick={handleSelectAllOnPage}
            className="flex items-center gap-2 text-sm text-gray-700 font-bold hover:text-gray-900 focus:outline-none min-h-[44px] px-3"
          >
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={isAllSelectedOnPage}
                onChange={() => {}} // onClick側でトグル処理するため空
                className="w-6 h-6 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
              />
            </div>
            <span>このページの全員を選択</span>
          </button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
            選択中: {selectedWorkerIds.length}名
          </span>
        </div>

        {/* 作業員リスト */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
          {workers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              登録されている作業員がいません。
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 flex-1">
              {paginatedWorkers.map((worker) => {
                const isChecked = selectedWorkerIds.includes(worker.worker_id);
                return (
                  <li key={worker.worker_id} className="hover:bg-gray-50 transition-colors">
                    <label className="flex items-center gap-4 px-4 py-3.5 cursor-pointer min-h-[56px] w-full">
                      <div className="relative flex items-center min-h-[44px] min-w-[44px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleWorkerSelection(worker.worker_id)}
                          className="w-7 h-7 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-gray-800 truncate">{worker.name}</p>
                        {worker.contact && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{worker.contact}</p>
                        )}
                        {worker.qualifications.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {worker.qualifications.map((q) => (
                              <span key={q} className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded border border-blue-100 font-medium">
                                有資格
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-between">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="px-3 py-2 border border-gray-300 rounded-md text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] flex items-center"
              >
                前へ
              </button>
              <span className="text-xs font-semibold text-gray-600">
                {currentPage} / {totalPages} ページ
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="px-3 py-2 border border-gray-300 rounded-md text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] flex items-center"
              >
                次へ
              </button>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3 mt-auto pt-2">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3.5 px-4 rounded-xl text-sm shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 min-h-[48px] flex items-center justify-center"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 px-4 rounded-xl text-sm shadow-md transition-all hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[48px] flex items-center justify-center"
          >
            次へ進む (カメラ起動)
          </button>
        </div>
      </main>
    </div>
  );
}