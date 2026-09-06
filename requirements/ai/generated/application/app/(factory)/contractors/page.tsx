'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { attendanceRepository } from '@/features/attendance/repository/attendanceRepository';
import { Contractor } from '@/features/attendance/domain/types';
import { logger } from '@/lib/logger';

const contractorSchema = z.object({
  name: z.string().trim().min(1, { message: '企業名は必須入力です' }),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type ContractorFormValues = z.infer<typeof contractorSchema>;

export default function ContractorsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // トースト表示用State
  const [toast, setToast] = useState<string | null>(null);

  // モーダル表示制御
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);

  // ページネーション用State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ContractorFormValues>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      name: '',
      status: 'ACTIVE',
    },
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 認証および初期データロード
  useEffect(() => {
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    const userId = sessionStorage.getItem('user_id');
    const role = sessionStorage.getItem('role');

    if (!userId || role !== 'FACTORY_ADMIN') {
      logger.warn('UNAUTHORIZED_ACCESS_ATTEMPT_CONTRACTORS', { userId, role });
      router.push('/admin-login');
    } else {
      setIsAuthenticated(true);
      loadContractors();
    }
  }, [router]);

  const loadContractors = async () => {
    setIsLoading(true);
    try {
      const data = await attendanceRepository.getAllContractors();
      setContractors(data);
    } catch (err) {
      logger.error('LOAD_CONTRACTORS_FAILED', { error: String(err) });
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingContractor(null);
    reset({
      name: '',
      status: 'ACTIVE',
    });
    setModalOpen(true);
    logger.info('ADD_CONTRACTOR_MODAL_OPENED');
  };

  const handleOpenEditModal = (contractor: Contractor) => {
    setEditingContractor(contractor);
    reset({
      name: contractor.name,
      status: contractor.status,
    });
    setModalOpen(true);
    logger.info('EDIT_CONTRACTOR_MODAL_OPENED', { contractorId: contractor.contractor_id });
  };

  const onSubmit = async (data: ContractorFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (editingContractor) {
        logger.info('UPDATE_CONTRACTOR_START', { contractorId: editingContractor.contractor_id });
        await attendanceRepository.updateContractor(
          editingContractor.contractor_id,
          data.name,
          data.status
        );
        logger.info('UPDATE_CONTRACTOR_SUCCESS', { contractorId: editingContractor.contractor_id });
        showToast('更新が完了しました');
      } else {
        logger.info('CREATE_CONTRACTOR_START', { name: data.name });
        const newContractor = await attendanceRepository.createContractor(data.name);
        logger.info('CREATE_CONTRACTOR_SUCCESS', { contractorId: newContractor.contractor_id });
        showToast('登録が完了しました');
      }
      setModalOpen(false);
      await loadContractors();
    } catch (err) {
      logger.error('SAVE_CONTRACTOR_FAILED', { error: String(err) });
      setError('保存に失敗しました。再試行してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (contractorId: string, name: string) => {
    const confirmed = window.confirm(`本当に削除しますか？\n対象: ${name}`);
    if (!confirmed) {
      logger.info('DELETE_CONTRACTOR_CANCELLED', { contractorId });
      return;
    }

    try {
      logger.info('DELETE_CONTRACTOR_START', { contractorId });
      await attendanceRepository.deleteContractor(contractorId);
      logger.info('DELETE_CONTRACTOR_SUCCESS', { contractorId });
      showToast('削除が完了しました');
      await loadContractors();

      // ページ整合性調整
      const newTotalPages = Math.ceil((contractors.length - 1) / itemsPerPage);
      if (currentPage > newTotalPages && currentPage > 1) {
        setCurrentPage(newTotalPages);
      }
    } catch (err) {
      logger.error('DELETE_CONTRACTOR_FAILED', { contractorId, error: String(err) });
      setError('削除に失敗しました');
    }
  };

  // ページネーション計算
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentContractors = contractors.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(contractors.length / itemsPerPage);

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
      {/* トースト表示 */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 rounded-lg bg-green-600 px-4 py-3 text-white shadow-lg font-bold"
          role="alert"
          data-testid="toast-notification"
        >
          {toast}
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">外注先企業登録</h1>
            <p className="text-sm text-gray-600 mt-1">工場側管理者用外注先企業マスタ管理</p>
          </div>
          <button
            onClick={() => router.push('/factory/dashboard')}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-500 transition-colors"
            style={{ minHeight: '44px' }}
          >
            ダッシュボードへ
          </button>
        </div>
      </header>

      {/* メインレイアウト */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6 md:py-8 flex flex-col space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg font-bold" data-testid="error-message">
            {error}
          </div>
        )}

        {/* 登録企業サマリーおよび新規追加 */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow">
          <span className="text-sm font-medium text-gray-500">
            登録件数: <span className="font-bold text-gray-900">{contractors.length}件</span>
          </span>
          <button
            onClick={handleOpenAddModal}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors flex items-center gap-1 shadow-sm"
            style={{ minHeight: '44px' }}
            data-testid="add-contractor-btn"
          >
            新規登録
          </button>
        </div>

        {/* 一覧テーブル・カード表示 */}
        <div className="bg-white rounded-xl shadow overflow-hidden flex-1 flex flex-col">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500 font-bold" data-testid="loading-text">
              読み込み中...
            </div>
          ) : (
            <>
              {/* PC向けテーブル表示 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">企業ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">企業名</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ステータス</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">登録日時</th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">操作</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200" data-testid="contractors-tbody">
                    {currentContractors.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                          外注先企業が登録されていません。
                        </td>
                      </tr>
                    ) : (
                      currentContractors.map((c) => (
                        <tr key={c.contractor_id} className="hover:bg-gray-50" data-testid="contractor-row">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">{c.contractor_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{c.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                c.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {c.status === 'ACTIVE' ? '有効' : '無効'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(c.created_at).toLocaleString('ja-JP')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => handleOpenEditModal(c)}
                                className="text-blue-600 hover:text-blue-900 font-semibold px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
                                style={{ minHeight: '44px' }}
                                data-testid={`edit-btn-${c.contractor_id}`}
                              >
                                編集
                              </button>
                              <button
                                onClick={() => handleDelete(c.contractor_id, c.name)}
                                className="text-red-600 hover:text-red-900 font-semibold px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
                                style={{ minHeight: '44px' }}
                                data-testid={`delete-btn-${c.contractor_id}`}
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

              {/* モバイル向けカードUI */}
              <div className="md:hidden divide-y divide-gray-200" data-testid="contractors-cards">
                {currentContractors.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    外注先企業が登録されていません。
                  </div>
                ) : (
                  currentContractors.map((c) => (
                    <div key={c.contractor_id} className="p-4 space-y-3 font-sans" data-testid={`mobile-card-${c.contractor_id}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{c.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">ID: {c.contractor_id}</p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            c.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {c.status === 'ACTIVE' ? '有効' : '無効'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        登録日: {new Date(c.created_at).toLocaleString('ja-JP')}
                      </div>
                      <div className="flex gap-3 pt-2 justify-end border-t border-gray-100">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="flex-1 text-center py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded bg-gray-50"
                          style={{ minHeight: '44px' }}
                          data-testid={`mobile-edit-btn-${c.contractor_id}`}
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(c.contractor_id, c.name)}
                          className="flex-1 text-center py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded bg-gray-50"
                          style={{ minHeight: '44px' }}
                          data-testid={`mobile-delete-btn-${c.contractor_id}`}
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
                    data-testid="pagination-prev"
                  >
                    前へ
                  </button>
                  <span className="text-sm text-gray-700" data-testid="pagination-info">
                    {currentPage} / {totalPages} ページ
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                    style={{ minHeight: '44px' }}
                    data-testid="pagination-next"
                  >
                    次へ
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 新規登録・編集用モーダル */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          data-testid="contractor-modal-overlay"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900" data-testid="modal-title">
                {editingContractor ? '外注先企業情報の編集' : '外注先企業の新規登録'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1"
                data-testid="modal-close-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 flex-1">
              <div>
                <label htmlFor="modal_name" className="block text-sm font-bold text-gray-700 mb-1">
                  企業名 <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal_name"
                  type="text"
                  placeholder="例: 第一建設"
                  disabled={isSubmitting}
                  className={`block w-full rounded-md border py-3 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px] ${
                    errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  {...register('name')}
                  data-testid="contractor-name-input"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 font-bold" data-testid="name-error-message">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {editingContractor && (
                <div>
                  <span className="block text-sm font-bold text-gray-700 mb-2">ステータス</span>
                  <div className="flex gap-4">
                    <label className="flex-1 flex items-center p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer min-h-[44px]">
                      <input
                        type="radio"
                        value="ACTIVE"
                        disabled={isSubmitting}
                        className="h-5 w-5 border-gray-300 text-green-600 focus:ring-green-500"
                        {...register('status')}
                        data-testid="status-active-radio"
                      />
                      <span className="ml-3 text-base text-gray-900 font-bold">有効</span>
                    </label>
                    <label className="flex-1 flex items-center p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer min-h-[44px]">
                      <input
                        type="radio"
                        value="INACTIVE"
                        disabled={isSubmitting}
                        className="h-5 w-5 border-gray-300 text-gray-600 focus:ring-gray-500"
                        {...register('status')}
                        data-testid="status-inactive-radio"
                      />
                      <span className="ml-3 text-base text-gray-900 font-bold">無効</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl bg-gray-200 py-3.5 text-center text-sm font-bold text-gray-700 hover:bg-gray-300 transition-colors"
                  style={{ minHeight: '56px' }}
                  data-testid="modal-cancel-btn"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-blue-600 py-3.5 text-center text-sm font-bold text-white hover:bg-blue-500 transition-colors disabled:bg-blue-400"
                  style={{ minHeight: '56px' }}
                  data-testid="modal-save-btn"
                >
                  {isSubmitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}