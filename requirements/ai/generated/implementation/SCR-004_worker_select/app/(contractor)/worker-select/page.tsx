'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth/sessionStore';
import { WorkerUseCase } from '@/features/worker/usecase/workerUseCase';
import { WorkerRepositoryImpl } from '@/features/worker/repository/workerRepositoryImpl';
import { Worker } from '@/features/worker/domain/worker';
import { useAttendanceStore } from '@/features/attendance/store/attendanceStore';
import { logger } from '@/lib/logger/logger';
import { seedDatabase } from '@/lib/db/indexedDb';

export default function WorkerSelectPage() {
  const router = useRouter();
  const { punchMode, selectedWorkerIds, setSelectedWorkerIds } = useAttendanceStore();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ページネーション設定
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 認証チェックとデータ取得
  useEffect(() => {
    const loadSessionAndData = async () => {
      try {
        const session = getSession();
        if (!session || session.role !== 'CONTRACTOR_MANAGER') {
          logger.info('Unauthorized access attempt to SCR-004');
          router.push('/login');
          return;
        }

        if (session.contractorId) {
          // 初期シードが投入されていない場合の簡易フォールバック
          try {
            await seedDatabase();
          } catch {
            // すでに初期化済みの場合はスルー
          }

          const repository = new WorkerRepositoryImpl();
          const useCase = new WorkerUseCase(repository);
          const list = await useCase.getWorkersByContractor(session.contractorId);

          // 氏名五十音順（昇順）にソート
          const sortedList = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
          setWorkers(sortedList);
        }
      } catch (error) {
        logger.error('Failed to load workers in SCR-004', { error: String(error) });
        setErrorMessage('作業員マスタの読み込みに失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessionAndData();
  }, [router]);

  // トースト自動非表示
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // 選択処理
  const handleToggleWorker = (workerId: string) => {
    if (selectedWorkerIds.includes(workerId)) {
      setSelectedWorkerIds(selectedWorkerIds.filter((id) => id !== workerId));
    } else {
      setSelectedWorkerIds([...selectedWorkerIds, workerId]);
    }
  };

  // 一括選択・解除
  const handleToggleSelectAll = () => {
    const currentPageWorkerIds = currentItems.map((w) => w.worker_id);
    const allCurrentSelected = currentPageWorkerIds.every((id) =>
      selectedWorkerIds.includes(id)
    );

    if (allCurrentSelected) {
      // 現在表示中ページの作業員の選択をすべて解除
      setSelectedWorkerIds(
        selectedWorkerIds.filter((id) => !currentPageWorkerIds.includes(id))
      );
    } else {
      // 現在表示中ページの作業員をすべて追加選択
      const newSelection = Array.from(
        new Set([...selectedWorkerIds, ...currentPageWorkerIds])
      );
      setSelectedWorkerIds(newSelection);
    }
  };

  // ページネーション用アイテム抽出
  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return workers.slice(indexOfFirstItem, indexOfLastItem);
  }, [workers, currentPage]);

  const totalPages = Math.ceil(workers.length / itemsPerPage);

  // 全選択チェックボックスの状態判定
  const isAllSelectedOnCurrentPage = useMemo(() => {
    if (currentItems.length === 0) return false;
    return currentItems.every((w) => selectedWorkerIds.includes(w.worker_id));
  }, [currentItems, selectedWorkerIds]);

  // 次へ遷移
  const handleNext = () => {
    if (selectedWorkerIds.length === 0) {
      setToastMessage('作業員を1名以上選択してください。');
      return;
    }
    logger.info('Workers selected. Transitioning to shoot page.', {
      count: selectedWorkerIds.length,
      mode: punchMode,
    });
    router.push('/contractor/shoot');
  };

  // 戻る遷移
  const handleBack = () => {
    logger.info('Returning to punch mode select page.');
    router.push('/contractor/punch-mode');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">作業員データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      {/* トースト表示 */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-600 px-6 py-3 text-white shadow-lg animate-fade-in transition-opacity">
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        {/* ヘッダー・打刻モード表示 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-6 text-white text-center">
          <span className="inline-block rounded-full bg-white/20 px-4 py-1 text-xs font-bold uppercase tracking-wider mb-2">
            打刻ステップ 1/2
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {punchMode === 'CLOCK_IN' ? '出勤打刻 対象者選択' : '退勤打刻 対象者選択'}
          </h1>
          <p className="mt-1 text-sm text-blue-100">
            本日現場に入る作業員をリストから選択してください（複数選択可）。
          </p>
        </div>

        <div className="p-6">
          {errorMessage && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
              {errorMessage}
            </div>
          )}

          {/* 全選択・全解除アクション */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
            <label className="flex items-center cursor-pointer select-none space-x-3 group">
              <input
                type="checkbox"
                checked={isAllSelectedOnCurrentPage}
                onChange={handleToggleSelectAll}
                className="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-base font-semibold text-gray-700 group-hover:text-gray-900">
                このページの全員を選択・解除
              </span>
            </label>
            <span className="text-sm text-gray-500 font-medium">
              選択中: <strong className="text-blue-600 text-base">{selectedWorkerIds.length}</strong> 名
            </span>
          </div>

          {/* 作業員リスト */}
          {workers.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              登録されているアクティブな作業員が見つかりません。
            </div>
          ) : (
            <div className="space-y-3">
              {currentItems.map((worker) => {
                const isChecked = selectedWorkerIds.includes(worker.worker_id);
                return (
                  <div
                    key={worker.worker_id}
                    onClick={() => handleToggleWorker(worker.worker_id)}
                    className={`flex items-center space-x-4 rounded-xl border p-4 transition-all duration-150 cursor-pointer select-none ${
                      isChecked
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="h-7 w-7 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-900">{worker.name}</p>
                      {worker.contact && (
                        <p className="text-xs text-gray-500 mt-0.5">{worker.contact}</p>
                      )}
                      {worker.qualifications.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {worker.qualifications.map((q) => (
                            <span
                              key={q}
                              className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700"
                            >
                              有資格
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ページネーションコントロール */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>
              <span className="text-sm text-gray-600">
                {currentPage} / {totalPages} ページ
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          )}

          {/* 操作ボタン */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <button
              onClick={handleBack}
              className="flex items-center justify-center rounded-xl border-2 border-gray-300 bg-white py-4 px-6 text-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors focus:ring-4 focus:ring-gray-200 focus:outline-none"
            >
              戻る
            </button>
            <button
              onClick={handleNext}
              className="flex items-center justify-center rounded-xl bg-blue-600 py-4 px-6 text-lg font-bold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 focus:ring-4 focus:ring-blue-200 focus:outline-none"
            >
              次へ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}