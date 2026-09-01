"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Worker } from '../domain/worker';
import { IndexedDBWorkerRepository } from '../repository/workerRepository';
import { getCurrentUser, logoutMock, AuthUser } from '@/lib/auth/authStore';
import { seedDatabaseIfEmpty } from '@/lib/db/indexedDB';
import { logger } from '@/lib/logger/logger';

const QUALIFICATION_MAP: Record<string, string> = {
  'QUAL_001': 'フォークリフト運転者',
  'QUAL_002': '玉掛け技能',
  'QUAL_003': '足場組立作業主任者',
  'QUAL_004': 'クレーン運転士',
};

const TRAINING_MAP: Record<string, string> = {
  'TRN_001': '安全衛生特別教育',
  'TRN_002': '新規入場者教育',
};

const ITEMS_PER_PAGE = 20;

export default function WorkerList() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [selectedQual, setSelectedQual] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const repository = new IndexedDBWorkerRepository();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== 'CONTRACTOR_MANAGER') {
      logger.warn('Unauthorized access attempt to Worker List screen (SCR-007)');
      router.replace('/login');
      return;
    }
    setCurrentUser(user);
    init(user.contractor_id);
  }, [router]);

  const init = async (contractorId: string) => {
    try {
      setLoading(true);
      await seedDatabaseIfEmpty();
      await loadWorkers(contractorId);
    } catch (err) {
      logger.error('Failed to initialize workers list', err);
      showToast('データのロードに失敗しました。', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkers = async (contractorId: string) => {
    const data = await repository.getWorkersByContractor(contractorId);
    setWorkers(data);
    setFilteredWorkers(data);
    logger.info('Successfully loaded worker records', { count: data.length });
  };

  useEffect(() => {
    let result = workers;

    if (searchName.trim()) {
      const query = searchName.toLowerCase();
      result = result.filter(w => w.name.toLowerCase().includes(query));
    }

    if (selectedQual) {
      result = result.filter(w => w.qualifications.includes(selectedQual));
    }

    setFilteredWorkers(result);
    setCurrentPage(1);
  }, [searchName, selectedQual, workers]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (worker: Worker) => {
    const confirmed = window.confirm(`作業員「${worker.name}」を削除してもよろしいですか？`);
    if (!confirmed) {
      logger.info('Worker deletion cancelled by user', { worker_id: worker.worker_id });
      return;
    }

    try {
      await repository.deleteWorker(worker.worker_id);
      logger.info('Successfully deleted worker', { worker_id: worker.worker_id });
      showToast('作業員を削除しました。', 'success');
      if (currentUser) {
        await loadWorkers(currentUser.contractor_id);
      }
    } catch (err) {
      logger.error('Failed to delete worker', err, { worker_id: worker.worker_id });
      showToast('削除に失敗しました。', 'error');
    }
  };

  const handleLogout = () => {
    logoutMock();
    router.replace('/login');
  };

  const totalItems = filteredWorkers.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedWorkers = filteredWorkers.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-blue-800">外注作業員管理</span>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                外注先用
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 font-medium hidden sm:inline-block">
                {currentUser?.display_name || '管理者'} 様
              </span>
              <button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                style={{ minHeight: '44px', minWidth: '88px' }}
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push('/contractor')}
              className="inline-flex items-center justify-center text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ minWidth: '88px', minHeight: '44px' }}
            >
              ← 戻る
            </button>
            <h1 className="text-2xl font-bold text-gray-900">作業員一覧</h1>
          </div>
          <div>
            <button
              onClick={() => router.push('/contractor/workers/new')}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md transition-all active:scale-95"
              style={{ minHeight: '48px', minWidth: '140px' }}
            >
              ＋ 新規追加
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search-input" className="block text-sm font-semibold text-gray-700 mb-1">
                氏名で検索
              </label>
              <input
                id="search-input"
                type="text"
                placeholder="作業員の氏名を入力..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                style={{ minHeight: '44px' }}
              />
            </div>
            <div>
              <label htmlFor="qual-select" className="block text-sm font-semibold text-gray-700 mb-1">
                資格で絞り込み
              </label>
              <select
                id="qual-select"
                value={selectedQual}
                onChange={(e) => setSelectedQual(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                style={{ minHeight: '44px' }}
              >
                <option value="">すべての資格</option>
                {Object.entries(QUALIFICATION_MAP).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Custom Toast Alert */}
        {toast && (
          <div
            role="alert"
            className={`fixed bottom-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            <span className="font-bold flex-1">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-4 font-bold text-lg leading-none hover:opacity-80 focus:outline-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 font-medium">データを読み込み中...</p>
          </div>
        ) : totalItems === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
            </svg>
            <p className="text-gray-500 font-bold mb-1 text-lg">作業員が見つかりません</p>
            <p className="text-gray-400 text-sm">条件を変えて再度検索するか、新しく作業員を追加してください。</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      氏名
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      連絡先
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      資格情報
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      講習受講履歴
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedWorkers.map((worker) => (
                    <tr key={worker.worker_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-base">{worker.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {worker.contact || '未登録'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {worker.qualifications.length > 0 ? (
                            worker.qualifications.map((q) => (
                              <span key={q} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
                                {QUALIFICATION_MAP[q] || q}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">なし</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {worker.trainings.length > 0 ? (
                            worker.trainings.map((t, idx) => (
                              <div key={idx} className="flex items-center space-x-1.5 text-xs text-gray-700">
                                <span className="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">
                                  {TRAINING_MAP[t.code] || t.code}
                                </span>
                                <span className="text-gray-500">{t.taken_at} 受講</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">なし</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => router.push(`/contractor/workers/${worker.worker_id}/edit`)}
                          className="inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-bold transition-all"
                          style={{ minHeight: '44px', minWidth: '70px' }}
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(worker)}
                          className="inline-flex items-center justify-center px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-all"
                          style={{ minHeight: '44px', minWidth: '70px' }}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
              {paginatedWorkers.map((worker) => (
                <div key={worker.worker_id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{worker.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">連絡先: {worker.contact || '未登録'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">資格</h4>
                    <div className="flex flex-wrap gap-1">
                      {worker.qualifications.length > 0 ? (
                        worker.qualifications.map((q) => (
                          <span key={q} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {QUALIFICATION_MAP[q] || q}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs">登録された資格なし</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">講習実績</h4>
                    <div className="space-y-1">
                      {worker.trainings.length > 0 ? (
                        worker.trainings.map((t, idx) => (
                          <div key={idx} className="flex items-center space-x-1.5 text-xs text-gray-700">
                            <span className="bg-teal-50 text-teal-700 border border-teal-100 px-1.5 py-0.5 rounded font-bold">
                              {TRAINING_MAP[t.code] || t.code}
                            </span>
                            <span className="text-gray-400">{t.taken_at}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs">受講実績なし</span>
                      )}
                    </div>
                  </div>

                  {/* Large mobile-friendly touch targets */}
                  <div className="flex space-x-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => router.push(`/contractor/workers/${worker.worker_id}/edit`)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-bold transition-all active:scale-95"
                      style={{ minHeight: '44px' }}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(worker)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-all active:scale-95"
                      style={{ minHeight: '44px' }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Panel */}
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="text-sm text-gray-600 font-semibold">
                全 <span className="font-bold text-gray-900">{totalItems}</span> 名中{' '}
                <span className="font-bold text-gray-900">{startIndex + 1}</span> 〜{' '}
                <span className="font-bold text-gray-900">{endIndex}</span> 名を表示
              </div>
              <div className="flex items-center space-x-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center"
                  style={{ minHeight: '44px', minWidth: '70px' }}
                >
                  前へ
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 border rounded-lg text-sm font-bold transition-all shadow-sm ${
                      currentPage === page
                        ? 'bg-blue-600 border-blue-600 text-white font-extrabold'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    style={{ minHeight: '44px', minWidth: '44px' }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center"
                  style={{ minHeight: '44px', minWidth: '70px' }}
                >
                  次へ
                </button>
              </div>
            </div>
          </> ceiling
        )}
      </main>
    </div>
  );
}
"
    },
    {