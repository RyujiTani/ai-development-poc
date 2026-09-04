'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sessionManager, Session } from '../../../lib/auth/session';
import { useToast } from '../../../components/ui/toast';
import { logger } from '../../../lib/logger/logger';
import { IndexedDBContractorRepository } from '../../../features/contractor/repository/contractorRepository';
import { SaveContractorUseCase } from '../../../features/contractor/usecase/saveContractorUseCase';
import { DeleteContractorUseCase } from '../../../features/contractor/usecase/deleteContractorUseCase';
import { Contractor } from '../../../features/contractor/domain/contractor';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

const contractorSchema = z.object({
  name: z.string().min(1, '企業名は必須入力です。'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type ContractorFormValues = z.infer<typeof contractorSchema>;

export default function ContractorRegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeContractor, setActiveContractor] = useState<Contractor | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const fetchContractors = useCallback(async () => {
    try {
      const repo = new IndexedDBContractorRepository();
      const list = await repo.findAll();
      // 作成日時降順
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setContractors(list);
    } catch (err) {
      logger.error('failed_to_fetch_contractors', err);
      showToast('企業一覧の取得に失敗しました。', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 1. 認証認可ガード
  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'FACTORY_ADMIN') {
      logger.warn('unauthorized_factory_admin_redirect_from_contractors', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.replace('/admin/login');
      return;
    }
    setSession(currentSession);
    fetchContractors();
    logger.info('contractor_register_page_loaded', { user_id: currentSession.user_id });
  }, [router, fetchContractors]);

  const handleLogout = () => {
    logger.info('factory_admin_logout_from_contractors', { user_id: session?.user_id });
    sessionManager.clearSession();
    showToast('ログアウトしました。', 'info');
    router.push('/admin/login');
  };

  const handleBackToDashboard = () => {
    router.push('/admin/dashboard');
  };

  const handleOpenNewDialog = () => {
    setActiveContractor(null);
    reset({
      name: '',
      status: 'ACTIVE',
    });
    setIsDialogOpen(true);
    logger.info('open_new_contractor_dialog');
  };

  const handleOpenEditDialog = (contractor: Contractor) => {
    setActiveContractor(contractor);
    setValue('name', contractor.name);
    setValue('status', contractor.status);
    setIsDialogOpen(true);
    logger.info('open_edit_contractor_dialog', { contractor_id: contractor.contractor_id });
  };

  const handleSave = async (data: ContractorFormValues) => {
    setSubmitting(true);
    try {
      const repo = new IndexedDBContractorRepository();
      const useCase = new SaveContractorUseCase(repo);

      const result = await useCase.execute({
        contractorId: activeContractor?.contractor_id,
        name: data.name,
        status: data.status,
      });

      if (result.success) {
        showToast(
          activeContractor ? '企業情報を更新しました。' : '新しい企業を登録しました。',
          'success'
        );
        setIsDialogOpen(false);
        fetchContractors();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      logger.error('failed_to_save_contractor', err);
      showToast('保存に失敗しました。', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      const repo = new IndexedDBContractorRepository();
      const useCase = new DeleteContractorUseCase(repo);
      const result = await useCase.execute(deleteConfirmId);

      if (result.success) {
        showToast('外注先企業を削除しました。', 'success');
        setDeleteConfirmId(null);
        fetchContractors();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      logger.error('failed_to_delete_contractor', err);
      showToast('削除に失敗しました。', 'error');
    }
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

  const totalPages = Math.ceil(contractors.length / itemsPerPage);
  const displayedContractors = contractors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToDashboard}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition h-10 w-10 flex items-center justify-center cursor-pointer"
              aria-label="戻る"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-indigo-600 tracking-wider">勤怠・配置管理システム</span>
              <span className="text-sm font-bold text-gray-900 sm:text-base">外注先企業登録</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-gray-800">{session?.display_name} 様</p>
              <p className="text-xs text-gray-500">工場管理者</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 active:bg-red-100 transition h-9 flex items-center justify-center cursor-pointer"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {/* 上部操作エリア */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">外注先企業マスタ</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              連携している外注先企業の確認、新規登録、編集、削除が行えます。
            </p>
          </div>
          <button
            id="new-contractor-button"
            onClick={handleOpenNewDialog}
            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm self-start sm:self-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            新規登録
          </button>
        </div>

        {/* 企業リスト/テーブル */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          {contractors.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-500 font-bold text-base">登録されている外注先企業がありません。</p>
              <p className="text-gray-400 text-xs mt-2 max-w-[280px] mx-auto leading-relaxed">
                右上の「新規登録」ボタンから、新しい外注先企業を登録してください。
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              {/* PC用テーブル形式 */}
              <table className="w-full text-left border-collapse hidden md:table">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-sm font-bold text-gray-700">企業ID</th>
                    <th className="p-4 text-sm font-bold text-gray-700">企業名</th>
                    <th className="p-4 text-sm font-bold text-gray-700">ステータス</th>
                    <th className="p-4 text-sm font-bold text-gray-700">登録日時</th>
                    <th className="p-4 text-sm font-bold text-gray-700 text-center w-48">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedContractors.map((c) => (
                    <tr key={c.contractor_id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 text-xs font-mono text-gray-500">{c.contractor_id}</td>
                      <td className="p-4 text-sm font-bold text-gray-900">{c.name}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>
                          {c.status === 'ACTIVE' ? '活性' : '非活性'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(c.created_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 min-h-[44px]">
                          <button
                            onClick={() => handleOpenEditDialog(c)}
                            className="h-10 px-3 border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold transition flex items-center justify-center min-w-[64px] cursor-pointer"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteClick(c.contractor_id)}
                            className="h-10 px-3 border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 rounded-lg text-xs font-bold transition flex items-center justify-center min-w-[64px] cursor-pointer"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* モバイル用カード形式 */}
              <div className="md:hidden divide-y divide-gray-100">
                {displayedContractors.map((c) => (
                  <div key={c.contractor_id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{c.name}</h3>
                        <p className="text-[10px] font-mono text-gray-400 mt-1">ID: {c.contractor_id}</p>
                      </div>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {c.status === 'ACTIVE' ? '活性' : '非活性'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      登録: {new Date(c.created_at).toLocaleString('ja-JP')}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleOpenEditDialog(c)}
                        className="flex-1 h-11 border border-indigo-200 text-indigo-600 font-bold rounded-xl text-xs transition flex items-center justify-center cursor-pointer"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteClick(c.contractor_id)}
                        className="flex-1 h-11 border border-red-200 text-red-600 font-bold rounded-xl text-xs transition flex items-center justify-center cursor-pointer"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between mt-auto">
              <span className="text-xs sm:text-sm text-gray-500 font-medium font-sans">
                全 {contractors.length} 件中 {(currentPage - 1) * itemsPerPage + 1}〜
                {Math.min(contractors.length, currentPage * itemsPerPage)} 件表示
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 h-9 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition min-w-[44px] cursor-pointer"
                >
                  前へ
                </button>
                <span className="text-xs sm:text-sm text-gray-700 font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 h-9 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition min-w-[44px] cursor-pointer"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 戻るボタンフッター */}
        <div className="mt-6 flex justify-start">
          <button
            onClick={handleBackToDashboard}
            className="px-6 h-12 rounded-xl text-gray-600 hover:text-gray-900 border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 shadow-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto sm:min-w-[140px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7 7-7" />
            </svg>
            ダッシュボードに戻る
          </button>
        </div>
      </main>

      {/* 新規登録・編集モーダル */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsDialogOpen(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">
                {activeContractor ? '外注先企業の編集' : '外注先企業の新規登録'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">外注先企業のマスタ情報を管理します。</p>
            </div>

            <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
              {/* 企業名 */}
              <div>
                <Input
                  id="name"
                  type="text"
                  label="企業名"
                  placeholder="例: 株式会社大島組"
                  disabled={submitting}
                  error={errors.name?.message}
                  className="h-12 text-sm"
                  {...register('name')}
                />
              </div>

              {/* ステータス */}
              {activeContractor && (
                <div>
                  <span className="block text-sm font-bold text-gray-700 mb-2">ステータス</span>
                  <div className="flex gap-4">
                    <label className="flex-1 flex items-center justify-center h-12 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition px-3 gap-2 font-bold text-gray-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:text-indigo-900 text-sm">
                      <input
                        type="radio"
                        value="ACTIVE"
                        disabled={submitting}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                        {...register('status')}
                      />
                      活性
                    </label>
                    <label className="flex-1 flex items-center justify-center h-12 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition px-3 gap-2 font-bold text-gray-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:text-indigo-900 text-sm">
                      <input
                        type="radio"
                        value="INACTIVE"
                        disabled={submitting}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                        {...register('status')}
                      />
                      非活性
                    </label>
                  </div>
                </div>
              )}

              {/* ボタン */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={submitting}
                  className="flex-1 h-12 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer"
                >
                  キャンセル
                </button>
                <Button
                  id="save-button"
                  type="submit"
                  loading={submitting}
                  disabled={submitting}
                  className="flex-1 h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md transition flex items-center justify-center cursor-pointer"
                >
                  保存
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">外注先企業の削除確認</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                本当にこの企業を削除しますか？この操作を実行すると、一覧に表示されなくなります。
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 h-11 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer"
              >
                キャンセル
              </button>
              <button
                id="delete-confirm-button"
                onClick={handleDeleteConfirm}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400">
          &copy; 2026 勤怠・配置管理システム プロトタイプ版 (工場側管理者ポータル)
        </div>
      </footer>
    </div>
  );
}