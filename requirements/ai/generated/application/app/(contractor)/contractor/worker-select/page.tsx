'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sessionManager, Session } from '../../../../lib/auth/session';
import { useToast } from '../../../../components/ui/toast';
import { logger } from '../../../../lib/logger/logger';
import { useAttendanceStore } from '../../../../features/attendance/store/useAttendanceStore';
import { IndexedDBWorkerRepository } from '../../../../features/worker/repository/workerRepository';
import { GetWorkersUseCase } from '../../../../features/worker/usecase/getWorkersUseCase';
import { Worker } from '../../../../features/worker/domain/worker';

export default function WorkerSelectPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { punchType, selectedWorkerIds, setSelectedWorkerIds } = useAttendanceStore();

  // 認証チェック & 初期ロード
  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'CONTRACTOR_MANAGER') {
      logger.warn('unauthorized_access_redirect', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.push('/login');
      return;
    }

    // 打刻モードが未選択の場合は打刻モード選択へ戻す
    if (!punchType) {
      showToast('打刻モードを先に選択してください。', 'error');
      router.push('/contractor/punch-mode');
      return;
    }

    setSession(currentSession);

    // 作業員一覧の取得
    const fetchWorkers = async () => {
      try {
        const workerRepository = new IndexedDBWorkerRepository();
        const getWorkersUseCase = new GetWorkersUseCase(workerRepository);
        const result = await getWorkersUseCase.execute(currentSession.contractor_id || '');

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
    };

    fetchWorkers();
    logger.info('worker_select_loaded', { user_id: currentSession.user_id });
  }, [router, punchType, showToast]);

  // 個別チェック
  const handleToggleWorker = (workerId: string) => {
    if (selectedWorkerIds.includes(workerId)) {
      setSelectedWorkerIds(selectedWorkerIds.filter((id) => id !== workerId));
    } else {
      setSelectedWorkerIds([...selectedWorkerIds, workerId]);
    }
  };

  // 全選択・全解除（現在のページに表示されている作業員を対象とする）
  const displayedWorkers = workers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const displayedWorkerIds = displayedWorkers.map((w) => w.worker_id);
  const isAllDisplayedSelected =
    displayedWorkerIds.length > 0 &&
    displayedWorkerIds.every((id) => selectedWorkerIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllDisplayedSelected) {
      // 現在のページの作業員を未選択にする
      setSelectedWorkerIds(selectedWorkerIds.filter((id) => !displayedWorkerIds.includes(id)));
    } else {
      // 現在のページの作業員を選択状態に追加する
      const newSelected = Array.from(new Set([...selectedWorkerIds, ...displayedWorkerIds]));
      setSelectedWorkerIds(newSelected);
    }
  };

  const handleNext = () => {
    if (selectedWorkerIds.length === 0) {
      showToast('作業員を1名以上選択してください。', 'error');
      return;
    }
    logger.info('worker_select_next', {
      selected_count: selectedWorkerIds.length,
      user_id: session?.user_id,
    });
    router.push('/contractor/punch-photo');
  };

  const handleBack = () => {
    logger.info('worker_select_back', { user_id: session?.user_id });
    router.push('/contractor/punch-mode');
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
              <span className="text-sm font-bold text-gray-900 sm:text-base">作業員選択</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">{session?.display_name} 様</p>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col">
        {/* 打刻モードバッジ表示 */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
              打刻対象の作業員を選択してください
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              チェックを入れて「次へ」ボタンを押してください。複数選択可能です。
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs text-gray-500 font-bold">選択中のモード:</span>
            {punchType === 'CLOCK_IN' ? (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                出勤 (作業開始)
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                退勤 (作業終了)
              </span>
            )}
          </div>
        </div>

        {/* 作業員リスト */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          {workers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-500 font-medium text-sm">登録されている有効な作業員がいません。</p>
              <p className="text-gray-400 text-xs mt-1">「作業員管理」メニューから作業員を登録してください。</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 w-16 text-center">
                      <div className="flex items-center justify-center min-h-[44px]">
                        <input
                          type="checkbox"
                          id="select-all-checkbox"
                          checked={isAllDisplayedSelected}
                          onChange={handleToggleSelectAll}
                          className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                    </th>
                    <th className="p-4 text-sm font-bold text-gray-700">氏名</th>
                    <th className="p-4 text-sm font-bold text-gray-700 hidden sm:table-cell">連絡先</th>
                    <th className="p-4 text-sm font-bold text-gray-700">資格 / 講習</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedWorkers.map((worker) => {
                    const isSelected = selectedWorkerIds.includes(worker.worker_id);
                    return (
                      <tr
                        key={worker.worker_id}
                        onClick={() => handleToggleWorker(worker.worker_id)}
                        className={`hover:bg-gray-50/80 active:bg-gray-100/50 transition cursor-pointer ${
                          isSelected ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center min-h-[44px]">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleWorker(worker.worker_id)}
                              className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                          </div>
                        </td>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-500">
                全 {workers.length} 名中 {Math.min(workers.length, (currentPage - 1) * itemsPerPage + 1)}〜
                {Math.min(workers.length, currentPage * itemsPerPage)} 名表示
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 h-9 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition min-w-[44px]"
                >
                  前へ
                </button>
                <span className="text-xs sm:text-sm text-gray-700 font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 h-9 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition min-w-[44px]"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 下部操作ボタン */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <button
            onClick={handleBack}
            className="px-6 h-12 rounded-xl text-gray-600 hover:text-gray-900 border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 font-semibold transition flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto sm:min-w-[140px]"
          >
            戻る
          </button>
          <div className="text-center sm:text-right w-full sm:w-auto">
            <span className="text-sm font-bold text-gray-700 mr-4 block sm:inline mb-2 sm:mb-0">
              選択中: <span className="text-indigo-600 text-lg">{selectedWorkerIds.length}</span> 名
            </span>
            <button
              id="next-step-button"
              onClick={handleNext}
              className="px-8 h-12 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 font-semibold transition shadow-md hover:shadow-lg w-full sm:w-auto sm:min-w-[160px] cursor-pointer"
            >
              次へ (写真撮影)
            </button>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-gray-400">
          &copy; 2026 勤怠・配置管理システム プロトタイプ版
        </div>
      </footer>
    </div>
  );
}