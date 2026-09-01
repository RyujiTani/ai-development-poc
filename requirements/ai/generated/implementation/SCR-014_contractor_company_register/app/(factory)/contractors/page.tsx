"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Contractor } from '@/features/contractor/domain/types';
import { IndexedDBContractorRepository } from '@/features/contractor/repository/contractorRepository';
import { ContractorTable } from '@/features/contractor/ui/ContractorTable';
import { ContractorForm } from '@/features/contractor/ui/ContractorForm';
import { resetDB } from '@/lib/db/indexedDB';

const contractorRepo = new IndexedDBContractorRepository();

export default function ContractorsPage() {
  const router = useRouter();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Authentication state
  const [authorized, setAuthorized] = useState(false);

  // Modal and Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);

  // Deletion confirmation state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Built-in Lightweight Toast System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // trace: SCR-014-VL-003
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'FACTORY_ADMIN') {
        // Render block and immediate redirect to login page
        router.push('/login');
      } else {
        setAuthorized(true);
      }
    } 
  }, [router]);

  // Load registered contractors from IndexedDB
  // trace: SCR-014-FN-001
  const loadContractors = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const data = await contractorRepo.findAll();
      // Sort: descending updated date
      const sorted = [...data].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setContractors(sorted);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('データの取得に失敗しました。');
      showToast('データのロード中にエラーが発生しました。', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      loadContractors();
    }
  }, [authorized]);

  // Handle open registration dialog
  // trace: SCR-014-EV-001
  const handleOpenCreate = () => {
    setFormMode('CREATE');
    setSelectedContractor(null);
    setIsFormOpen(true);
  };

  // Handle open edit dialog
  // trace: SCR-014-EV-003
  const handleOpenEdit = (contractor: Contractor) => {
    setFormMode('EDIT');
    setSelectedContractor(contractor);
    setIsFormOpen(true);
  };

  // Handle save (create or update)
  // trace: SCR-014-EV-002
  const handleSaveContractor = async (name: string, status: 'ACTIVE' | 'INACTIVE') => {
    try {
      if (formMode === 'CREATE') {
        const newContractor: Contractor = {
          contractor_id: window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          name,
          status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await contractorRepo.save(newContractor);
        showToast(`「${name}」を新規登録しました。`, 'success');
      } else if (formMode === 'EDIT' && selectedContractor) {
        const updatedContractor: Contractor = {
          ...selectedContractor,
          name,
          status,
          updated_at: new Date().toISOString()
        };
        await contractorRepo.update(updatedContractor);
        showToast(`「${name}」の情報を更新しました。`, 'success');
      }
      setIsFormOpen(false);
      await loadContractors();
    } catch (err) {
      console.error(err);
      showToast('保存処理中にエラーが発生しました。', 'error');
    }
  };

  // Handle click delete button
  const handleDeleteClick = (contractorId: string) => {
    setDeleteTargetId(contractorId);
    setIsDeleteConfirmOpen(true);
  };

  // Handle delete action confirmed
  // trace: SCR-014-EV-004
  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      const target = contractors.find(c => c.contractor_id === deleteTargetId);
      await contractorRepo.delete(deleteTargetId);
      showToast(`「${target?.name || '外注先企業'}」を削除しました。`, 'success');
      setIsDeleteConfirmOpen(false);
      setDeleteTargetId(null);
      await loadContractors();
    } catch (err) {
      console.error(err);
      showToast('削除処理中にエラーが発生しました。', 'error');
    }
  };

  // Handle reset seed database helper
  const handleResetDB = async () => {
    if (confirm('IndexedDB内の外注先企業ストアを初期データにリセットしますか？')) {
      try {
        setIsLoading(true);
        await resetDB();
        showToast('データベースを正常に初期化しました。', 'success');
        await loadContractors();
      } catch (err) {
        console.error(err);
        showToast('データベースの初期化に失敗しました。', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-sm font-semibold text-gray-600">認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Toast Alert Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 transform transition-all duration-300">
          <div className={`p-4 rounded-lg shadow-lg flex items-center space-x-3 text-white font-bold min-h-[50px] ${
            toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-rose-600' : 'bg-blue-600'
          }`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              外注先企業登録
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              工場で勤務する外注作業員の所属会社マスタ情報を管理・編集します。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Developer Reset Helper */}
            <button
              onClick={handleResetDB}
              className="px-4 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 min-h-[44px]"
            >
              シードリセット
            </button>
            {/* trace: SCR-014-UI-002 */}
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 active:bg-indigo-800 shadow-sm min-h-[44px] flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>新規登録</span>
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <p className="text-sm font-medium text-gray-500">データを読み込み中...</p>
            </div>
          ) : errorMsg ? (
            <div className="py-12 text-center text-red-600 font-medium space-y-2">
              <p>{errorMsg}</p>
              <button
                onClick={loadContractors}
                className="px-4 py-2 bg-indigo-55 text-indigo-700 rounded-md hover:bg-indigo-100 font-semibold"
              >
                再試行
              </button>
            </div>
          ) : (
            <ContractorTable
              contractors={contractors}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteClick}
            />
          )}
        </div>
      </div>

      {/* Form Dialog Modal */}
      <ContractorForm
        isOpen={isFormOpen}
        mode={formMode}
        contractor={selectedContractor}
        onSave={handleSaveContractor}
        onCancel={() => setIsFormOpen(false)}
      />

      {/* Deletion Confirmation Modal */}
      {/* trace: SCR-014-VL-002 */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsDeleteConfirmOpen(false)}></div>
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-bold leading-6 text-gray-900">
                      外注先企業の削除
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        本当にこの外注先企業を削除しますか？削除すると元に戻せません。所属する作業員データへの影響等、ご注意ください。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-reverse space-y-3">
                <button
                  type="button"
                  className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 min-h-[44px]"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto px-4 py-2.5 text-sm font-bold text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 min-h-[44px]"
                  onClick={handleDeleteConfirm}
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"
    },
    {