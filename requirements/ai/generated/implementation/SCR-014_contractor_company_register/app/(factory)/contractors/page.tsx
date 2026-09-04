'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Contractor } from '@/features/contractor/domain/contractor';
import { IndexedDBContractorRepository } from '@/features/contractor/repository/indexedDBContractorRepository';
import { ContractorUseCase } from '@/features/contractor/usecase/contractorUseCase';
import { getSession } from '@/lib/auth/auth';
import { useToast, ToastProvider } from '@/components/ui/toast';
import { logger } from '@/lib/logger/logger';
import { seedInitialData } from '@/lib/db/idb';

interface ContractorFormData {
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const repo = new IndexedDBContractorRepository();
const useCase = new ContractorUseCase(repo);

function ContractorsPageContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal / Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContractorFormData>({
    defaultValues: {
      name: '',
      status: 'ACTIVE',
    },
  });

  // Auth Guard check
  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'FACTORY_ADMIN') {
      logger.warn('Unauthorized access attempt to contractors page', {
        role: session?.role || 'NONE',
      });
      showToast('管理者権限が必要です。ログインしてください。', 'error');
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router, showToast]);

  // Loading contractors data
  const loadData = async () => {
    setIsLoading(true);
    try {
      await seedInitialData();
      const result = await useCase.getContractors();
      if (result.success) {
        setContractors(result.value);
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (e: any) {
      logger.error('Failed to load contractors', {}, e);
      showToast('データのロードに失敗しました。', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized]);

  // Compute paginated items
  const paginatedContractors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return contractors.slice(startIndex, startIndex + itemsPerPage);
  }, [contractors, currentPage]);

  const totalPages = Math.ceil(contractors.length / itemsPerPage) || 1;

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedContractor(null);
    reset({
      name: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
    logger.info('Open create contractor modal');
  };

  const handleOpenEditModal = (contractor: Contractor) => {
    setModalMode('edit');
    setSelectedContractor(contractor);
    reset({
      name: contractor.name,
      status: contractor.status,
    });
    setIsModalOpen(true);
    logger.info('Open edit contractor modal', { contractorId: contractor.contractor_id });
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`本当に「${name}」を削除しますか？\n(紐づく作業員データ等は削除されません)`);
    if (!confirmed) {
      logger.info('Delete contractor cancelled', { contractorId: id });
      return;
    }

    try {
      const result = await useCase.deleteContractor(id);
      if (result.success) {
        showToast('削除しました。', 'success');
        logger.info('Contractor deleted successfully', { contractorId: id });
        loadData();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (e: any) {
      logger.error('Failed to delete contractor', { contractorId: id }, e);
      showToast('削除処理に失敗しました。', 'error');
    }
  };

  const onSubmit = async (data: ContractorFormData) => {
    try {
      if (modalMode === 'create') {
        const result = await useCase.createContractor(data.name);
        if (result.success) {
          showToast('新規登録しました。', 'success');
          logger.info('Contractor created successfully', { contractorId: result.value.contractor_id });
          setIsModalOpen(false);
          loadData();
        } else {
          showToast(result.error.message, 'error');
        }
      } else {
        if (!selectedContractor) return;
        const result = await useCase.updateContractor(
          selectedContractor.contractor_id,
          data.name,
          data.status
        );
        if (result.success) {
          showToast('更新しました。', 'success');
          logger.info('Contractor updated successfully', { contractorId: selectedContractor.contractor_id });
          setIsModalOpen(false);
          loadData();
        } else {
          showToast(result.error.message, 'error');
        }
      }
    } catch (e: any) {
      logger.error('Form submission error', {}, e);
      showToast('エラーが発生しました。', 'error');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">アクセス権限を確認しています...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">外注先企業登録管理</h1>
            <p className="mt-1 text-sm text-gray-500">外注先企業マスタの追加・編集・削除が行えます。</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-semibold rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[48px]"
          >
            新規企業登録
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 font-medium">読み込み中...</span>
          </div>
        ) : contractors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
            <p className="text-gray-500 text-lg">登録されている外注先企業がありません。</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            {/* PC Display Table */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      企業名
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      登録日時
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      最終更新日時
                    </th>
                    <th scope="col" className="relative px-6 py-4 text-right">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedContractors.map((c) => (
                    <tr key={c.contractor_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {c.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          c.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {c.status === 'ACTIVE' ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(c.created_at).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(c.updated_at).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[36px]"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(c.contractor_id, c.name)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-h-[36px]"
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

            {/* Mobile Cards Display */}
            <div className="block md:hidden divide-y divide-gray-200">
              {paginatedContractors.map((c) => (
                <div key={c.contractor_id} className="p-4 space-y-3 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{c.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        更新: {new Date(c.updated_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      c.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {c.status === 'ACTIVE' ? '有効' : '無効'}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleOpenEditModal(c)}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2.5 border border-gray-300 text-sm font-semibold rounded-md text-gray-700 bg-white hover:bg-gray-50 min-h-[44px]"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(c.contractor_id, c.name)}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-md text-white bg-red-600 hover:bg-red-700 min-h-[44px]"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-4 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
                  >
                    次へ
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      全 <span className="font-medium">{contractors.length}</span> 件中{' '}
                      <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> から{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, contractors.length)}
                      </span>{' '}
                      件を表示
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="sr-only">前へ</span>
                        &larr;
                      </button>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === i + 1
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="sr-only">次へ</span>
                        &rarr;
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create / Edit Modal Dialog */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={() => setIsModalOpen(false)}
              ></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none min-h-[36px]"
                  >
                    <span className="sr-only">閉じる</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-bold text-gray-900 mb-6">
                      {modalMode === 'create' ? '外注先企業の新規登録' : '外注先企業情報の編集'}
                    </h3>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                          企業名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          {...register('name', { required: '企業名は必須入力です' })}
                          className={`appearance-none block w-full px-3 py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm min-h-[48px] ${
                            errors.name ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="例: 株式会社サンプル建設"
                        />
                        {errors.name && (
                          <p className="mt-2 text-sm text-red-600 font-semibold" id="name-error">
                            {errors.name.message}
                          </p>
                        )}
                      </div>

                      {modalMode === 'edit' && (
                        <div>
                          <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                            ステータス <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="status"
                            {...register('status', { required: true })}
                            className="block w-full px-3 py-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm min-h-[48px]"
                          >
                            <option value="ACTIVE">有効</option>
                            <option value="INACTIVE">無効</option>
                          </select>
                        </div>
                      )}

                      <div className="mt-8 sm:flex sm:flex-row-reverse gap-3">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-semibold rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 min-h-[48px]"
                        >
                          {isSubmitting ? '保存中...' : '保存する'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-semibold rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[48px]"
                        >
                          キャンセル
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContractorsPage() {
  return (
    <ToastProvider>
      <ContractorsPageContent />
    </ToastProvider>
  );
}