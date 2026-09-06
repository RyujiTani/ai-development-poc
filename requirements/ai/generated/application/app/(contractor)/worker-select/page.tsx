'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAttendanceStore } from '@/features/attendance/store/attendanceStore';
import { initDB } from '@/lib/db/indexedDB';
import { User, Worker } from '@/features/attendance/domain/types';
import { logger } from '@/lib/logger';
import { logoutMock } from '@/lib/auth/mockAuth';

export default function WorkerSelectPage() {
  const router = useRouter();
  const { punchType, selectedWorkerIds, setSelectedWorkerIds, reset } = useAttendanceStore();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 認証およびデータ取得
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

        // 自社の作業員一覧を取得
        const workerTx = db.transaction('workers', 'readonly');
        const workerStore = workerTx.objectStore('workers');
        const index = workerStore.index('contractor_id');
        const list = (await index.getAll(contractorId)) as Worker[];
        
        // ステータスが ACTIVE な作業員のみを抽出し、氏名でソート
        const activeWorkers = list
          .filter((w) => w.status === 'ACTIVE')
          .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

        setWorkers(activeWorkers);
        logger.info('FETCH_WORKERS_SUCCESS', { contractorId, count: activeWorkers.length });
      } catch (error) {
        logger.error('FETCH_WORKERS_FAILED', { error: String(error) });
        setErrorMessage('データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthAndFetchWorkers();
  }, [router]);

  // 打刻モードが設定されていない場合はモード選択へ戻す
  useEffect(() => {
    if (!isLoading && !punchType) {
      router.push('/contractor/punch-mode');
    }
  }, [isLoading, punchType, router]);

  // 現在のページに表示する作業員
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentWorkers = workers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(workers.length / itemsPerPage);

  // 個別選択の切り替え
  const handleToggleWorker = (workerId: string) => {
    setErrorMessage(null);
    if (selectedWorkerIds.includes(workerId)) {
      setSelectedWorkerIds(selectedWorkerIds.filter((id) => id !== workerId));
    } else {
      setSelectedWorkerIds([...selectedWorkerIds, workerId]);
    }
  };

  // 現在のページの全選択・全解除
  const currentWorkerIds = currentWorkers.map((w) => w.worker_id);
  const isAllCurrentSelected =
    currentWorkerIds.length > 0 &&
    currentWorkerIds.every((id) => selectedWorkerIds.includes(id));

  const handleToggleSelectAll = () => {
    setErrorMessage(null);
    if (isAllCurrentSelected) {
      // 現在のページの作業員を未選択にする
      setSelectedWorkerIds(selectedWorkerIds.filter((id) => !currentWorkerIds.includes(id)));
    } else {
      // 現在のページの作業員を追加する（重複を避ける）
      const newSelections = Array.from(new Set([...selectedWorkerIds, ...currentWorkerIds]));
      setSelectedWorkerIds(newSelections);
    }
  };

  const handleNext = () => {
    if (selectedWorkerIds.length === 0) {
      setErrorMessage('作業員を1名以上選択してください');
      logger.warn('NEXT_STEP_FAILED_NO_WORKERS_SELECTED', { userId: currentUser?.user_id });
      return;
    }

    logger.info('WORKERS_SELECTED_NEXT_STEP', {
      userId: currentUser?.user_id,
      selectedCount: selectedWorkerIds.length,
    });
    router.push('/attendance-capture/capture');
  };

  const handleBack = () => {
    reset();
    logger.info('WORKERS_SELECT_CANCELLED', { userId: currentUser?.user_id });
    router.push('/contractor/punch-mode');
  };

  if (isLoading) {
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
            <h1 className="text-xl font-bold text-gray-900">作業員選択</h1>
            {currentUser && (
              <p className="text-sm text-gray-600 mt-1">
                ログイン中: <span className="font-semibold">{currentUser.display_name}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleBack}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-550 transition-colors"
            style={{ minHeight: '44px' }}
          >
            戻る
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 mx-auto max-w-md w-full px-4 py-6 flex flex-col space-y-4">
        {/* 打刻モード表示領域 */}
        <div className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-500">打刻モード</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold ${
              punchType === 'CLOCK_IN'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {punchType === 'CLOCK_IN' ? '出勤モード' : '退勤モード'}
          </span>
        </div>

        {/* エラーメッセージ（トースト風、または上部表示） */}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
            <span className="block sm:inline text-sm font-bold">{errorMessage}</span>
          </div>
        )}

        {/* 作業員リスト */}
        <div className="bg-white rounded-xl shadow overflow-hidden flex-1 flex flex-col">
          {/* 一括操作ヘッダー */}
          {workers.length > 0 && (
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center">
              <label
                className="flex items-center cursor-pointer w-full"
                style={{ minHeight: '44px' }}
              >
                <input
                  type="checkbox"
                  checked={isAllCurrentSelected}
                  onChange={handleToggleSelectAll}
                  className="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm font-bold text-gray-700">
                  {isAllCurrentSelected ? '全解除' : '全選択'} ({selectedWorkerIds.length}名選択中)
                </span>
              </label>
            </div>
          )}

          {/* リスト本体 */}
          <div className="divide-y divide-gray-200 overflow-y-auto max-h-[400px]">
            {currentWorkers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                登録されている作業員がいません。
              </div>
            ) : (
              currentWorkers.map((worker) => {
                const isSelected = selectedWorkerIds.includes(worker.worker_id);
                return (
                  <div
                    key={worker.worker_id}
                    onClick={() => handleToggleWorker(worker.worker_id)}
                    className={`px-4 py-3 flex items-center hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/50' : ''
                    }`}
                    style={{ minHeight: '56px' }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // 親の onClick で処理
                      className="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <p className="text-base font-semibold text-gray-900">{worker.name}</p>
                      {worker.qualifications && worker.qualifications.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          資格: {worker.qualifications.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
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
                className="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                style={{ minHeight: '44px' }}
              >
                次へ
              </button>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleBack}
            className="flex-1 rounded-xl bg-gray-200 py-3.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-300 transition-colors"
            style={{ minHeight: '48px' }}
          >
            戻る
          </button>
          <button
            onClick={handleNext}
            className="flex-1 rounded-xl bg-blue-600 py-3.5 text-center text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            style={{ minHeight: '48px' }}
          >
            次へ ({selectedWorkerIds.length}名選択)
          </button>
        </div>
      </main>
    </div>
  );
}