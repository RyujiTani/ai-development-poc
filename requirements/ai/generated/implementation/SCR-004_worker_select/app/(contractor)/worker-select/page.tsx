'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Worker } from '@/features/worker/domain/worker';
import { IndexedDBWorkerRepository } from '@/features/worker/repository/workerRepository';
import { AttendanceProvider, useAttendance } from '@/features/attendance/usecase/attendanceContext';
import { getSessionUser, SessionUser } from '@/lib/auth/session';
import { seedDatabase } from '@/lib/db/indexedDb';

function WorkerSelectScreen() {
  const router = useRouter();
  const { punchMode, selectedWorkerIds, setSelectedWorkerIds } = useAttendance();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [todayPunchedWorkerIds, setTodayPunchedWorkerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  const itemsPerPage = 5;
  const repository = new IndexedDBWorkerRepository();

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!sessionUser || sessionUser.role !== 'CONTRACTOR_MANAGER') {
      router.push('/login');
      return;
    }
    setUser(sessionUser);
    
    const initializeData = async () => {
      try {
        await seedDatabase();
        if (sessionUser.contractor_id) {
          const fetchedWorkers = await repository.getWorkersByContractor(sessionUser.contractor_id);
          setWorkers(fetchedWorkers);

          const todayStr = new Date().toISOString().split('T')[0];
          const todayAttendance = await repository.getAttendanceRecordsByDate(sessionUser.contractor_id, todayStr);
          
          const punchedIds = todayAttendance
            .filter(record => record.punch_type === punchMode)
            .map(record => record.worker_id);
          setTodayPunchedWorkerIds(punchedIds);
        }
      } catch (error) {
        console.error('Failed to load workers from IndexedDB', error);
        setErrorMessage('データの読み込みに失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };
    initializeData();
  }, [router, punchMode]);

  const filteredAndSortedWorkers = workers
    .filter(worker => worker.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  const totalItems = filteredAndSortedWorkers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedWorkers = filteredAndSortedWorkers.slice(
    (currentPage - 1) * itemsPerPage,
    (currentPage - 1) * itemsPerPage + itemsPerPage
  );

  const selectableWorkersInPage = paginatedWorkers.filter(
    worker => !todayPunchedWorkerIds.includes(worker.worker_id)
  );

  const isAllSelectedInPage = 
    selectableWorkersInPage.length > 0 && 
    selectableWorkersInPage.every(worker => selectedWorkerIds.includes(worker.worker_id));

  const handleRowClick = (workerId: string) => {
    if (todayPunchedWorkerIds.includes(workerId)) return;

    if (selectedWorkerIds.includes(workerId)) {
      setSelectedWorkerIds(selectedWorkerIds.filter(id => id !== workerId));
    } else {
      setSelectedWorkerIds([...selectedWorkerIds, workerId]);
    }
  };

  const handleSelectAllInPage = () => {
    if (isAllSelectedInPage) {
      const unselected = selectedWorkerIds.filter(
        id => !selectableWorkersInPage.some(w => w.worker_id === id)
      );
      setSelectedWorkerIds(unselected);
    } else {
      const toAdd = selectableWorkersInPage
        .map(w => w.worker_id)
        .filter(id => !selectedWorkerIds.includes(id));
      setSelectedWorkerIds([...selectedWorkerIds, ...toAdd]);
    }
  };

  const handleNext = () => {
    if (selectedWorkerIds.length === 0) {
      setErrorMessage('作業員を1名以上選択してください。');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    setSuccessToast('作業員の選択を保持しました。撮影・送信画面へ遷移します。');
    setTimeout(() => {
      setSuccessToast(null);
      router.push('/contractor/punch-photo');
    }, 1500);
  };

  const handleBack = () => {
    router.push('/contractor/attendance-mode');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 画面上部 トースト通知領域 */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm">
          <span className="font-bold">⚠️ エラー:</span>
          <span>{errorMessage}</span>
        </div>
      )}
      {successToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-100 border border-emerald-400 text-emerald-800 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm">
          <span className="font-bold">✓</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-900">打刻対象者の選択</h1>
            {user && (
              <p className="text-xs text-gray-500">
                {user.display_name} | 管理ID: {user.user_id}
              </p>
            )}
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold ${punchMode === 'CLOCK_IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {punchMode === 'CLOCK_IN' ? '☀️ 出勤' : '🌙 退勤'}
          </span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col gap-4 pb-24">
        
        {/* 検索・絞り込み */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <label htmlFor="search" className="block text-xs font-bold text-gray-700 mb-1.5">作業員名で検索</label>
          <div className="relative">
            <input
              id="search"
              type="text"
              placeholder="例: 佐藤"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-800 placeholder-gray-400"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold p-1 text-sm"
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {/* 作業員リスト */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
          
          {/* ヘッダー・一括選択 */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <span className="text-xs font-bold text-gray-500">
              表示中 {filteredAndSortedWorkers.length}名中 {Math.min(filteredAndSortedWorkers.length, (currentPage - 1) * itemsPerPage + 1)}〜{Math.min(filteredAndSortedWorkers.length, currentPage * itemsPerPage)}名
            </span>
            
            {paginatedWorkers.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllInPage}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 focus:outline-none flex items-center gap-1.5 px-2 py-1.5 rounded active:bg-emerald-50"
              >
                <span className={`inline-block w-4 h-4 rounded border flex items-center justify-center ${isAllSelectedInPage ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'}`}>
                  {isAllSelectedInPage && '✓'}
                </span>
                ページ内全選択 / 解除
              </button>
            )}
          </div>

          {/* リスト本体 */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {paginatedWorkers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                該当する作業員が見つかりません。
              </div>
            ) : (
              paginatedWorkers.map((worker) => {
                const isSelected = selectedWorkerIds.includes(worker.worker_id);
                const isPunched = todayPunchedWorkerIds.includes(worker.worker_id);
                
                return (
                  <div
                    key={worker.worker_id}
                    onClick={() => handleRowClick(worker.worker_id)}
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 min-h-[64px] transition-colors ${isSelected ? 'bg-emerald-50/40' : ''} ${isPunched ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                  >
                    <div className="flex items-center gap-3.5 pr-2">
                      {/* スマホ操作用の大きなチェックボックス (最低44x44pxタップ領域確保用のレイアウト) */}
                      <div className="flex items-center justify-center min-w-[28px] min-h-[28px]">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isPunched}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                          className="w-6 h-6 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-offset-0 disabled:opacity-50 disabled:bg-gray-200"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-base">{worker.name}</div>
                        <p className="text-xs text-gray-500">
                          連絡先: {worker.contact || '未登録'}
                        </p>
                      </div>
                    </div>

                    {/* 資格 or ステータスバッジ */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {isPunched ? (
                        <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2.5 py-1 rounded border border-gray-300 shrink-0">
                          本日打刻済
                        </span>
                      ) : (
                        <div className="flex gap-1 flex-wrap justify-end max-w-[150px]">
                          {worker.qualifications.length > 0 ? (
                            worker.qualifications.map((q) => (
                              <span key={q} className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-200 shrink-0">
                                {q}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-[10px]">資格なし</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ページネーションコントロール */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>
              <span className="text-xs text-gray-600">
                {currentPage} / {totalPages} ページ
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          )} 
        </div>

        {/* 選択状況の集計表示 */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
          <span className="text-sm text-gray-700 font-medium">
            選択中: <strong className="text-emerald-600 text-lg font-extrabold">{selectedWorkerIds.length}</strong> 名
          </span>
          {selectedWorkerIds.length > 0 && (
            <button 
              onClick={() => setSelectedWorkerIds([])} 
              className="text-xs text-gray-500 hover:text-red-500 underline font-medium"
            >
              すべてクリア
            </button>
          )}
        </div>
      </main>

      {/* 画面下部 固定操作バー (最低44px確保) */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10 shadow-lg">
        <div className="max-w-md mx-auto flex gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-xl border border-gray-300 active:scale-[0.98] transition-transform min-h-[48px] flex items-center justify-center"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex-[2] py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl active:scale-[0.98] transition-transform min-h-[48px] flex items-center justify-center shadow-md"
          >
            次へ進む
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <AttendanceProvider>
      <WorkerSelectScreen />
    </AttendanceProvider>
  );
}
