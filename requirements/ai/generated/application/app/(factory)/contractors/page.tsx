"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IndexedDBContractorRepository } from '@/features/contractor/repository/indexedDBContractorRepository';
import { GetContractorsUseCase } from '@/features/contractor/usecase/getContractorsUseCase';
import { CreateContractorUseCase } from '@/features/contractor/usecase/createContractorUseCase';
import { UpdateContractorUseCase } from '@/features/contractor/usecase/updateContractorUseCase';
import { DeleteContractorUseCase } from '@/features/contractor/usecase/deleteContractorUseCase';
import { Contractor } from '@/features/contractor/domain/types';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';

// Custom SVG Icons
const LayoutDashboard = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const FileSpreadsheet = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M8 13h8" />
    <path d="M8 17h8" />
    <path d="M10 9h4" />
  </svg>
);

const Building2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
);

const Users = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const Bell = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const LogOut = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const Menu = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const X = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const Plus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default function ContractorRegisterPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 企業データ状態
  const [contractorsList, setContractorsList] = useState<Contractor[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // モーダル・ポップアップ状態
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formType, setFormType] = useState<'NEW' | 'EDIT'>('NEW');

  // 入力フォーム状態
  const [editFormState, setEditFormState] = useState({
    contractorId: '',
    name: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const contractorRepository = new IndexedDBContractorRepository();

  useEffect(() => {
    const checkAuthAndInit = async () => {
      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'FACTORY_ADMIN') {
        logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: '/contractors' });
        router.replace('/login');
        return;
      }

      setIsAuthenticated(true);
      await loadContractors();
    };

    checkAuthAndInit();
  }, [router]);

  const loadContractors = async () => {
    setIsLoading(true);
    try {
      const useCase = new GetContractorsUseCase(contractorRepository);
      const result = await useCase.execute();

      if (result.success) {
        setContractorsList(result.value);
        setCurrentPage(1);
      } else if ('error' in result) {
        setErrorMessage(result.error.message);
      }
    } catch (err) {
      logger.error('LOAD_CONTRACTORS_ERROR', err);
      setErrorMessage('システムエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logger.info('ADMIN_LOGOUT_EVENT', { user_id: sessionStorage.getItem('user_id') });
    sessionStorage.removeItem('user_id');
    sessionStorage.removeItem('role');
    router.push('/login');
  };

  const openNewForm = () => {
    setFormType('NEW');
    setFormErrors({});
    setEditFormState({
      contractorId: '',
      name: '',
      status: 'ACTIVE',
    });
    setIsFormModalOpen(true);
    logger.info('OPEN_CONTRACTOR_FORM_NEW');
  };

  const openEditForm = (contractor: Contractor) => {
    setFormType('EDIT');
    setFormErrors({});
    setEditFormState({
      contractorId: contractor.contractor_id,
      name: contractor.name,
      status: contractor.status,
    });
    setIsFormModalOpen(true);
    logger.info('OPEN_CONTRACTOR_FORM_EDIT', { contractor_id: contractor.contractor_id });
  };

  const handleFormChange = (key: string, value: string) => {
    setEditFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!editFormState.name || !editFormState.name.trim()) {
      errors.name = '企業名は必須入力です。';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (formType === 'NEW') {
        const useCase = new CreateContractorUseCase(contractorRepository);
        const result = await useCase.execute({
          name: editFormState.name,
          status: editFormState.status,
        });

        if (result.success) {
          toast.success('外注先企業を登録しました。');
          setIsFormModalOpen(false);
          await loadContractors();
        } else if ('error' in result) {
          setFormErrors({ name: result.error.message });
        }
      } else {
        const useCase = new UpdateContractorUseCase(contractorRepository);
        const result = await useCase.execute({
          contractorId: editFormState.contractorId,
          name: editFormState.name,
          status: editFormState.status,
        });

        if (result.success) {
          toast.success('外注先企業情報を更新しました。');
          setIsFormModalOpen(false);
          await loadContractors();
        } else if ('error' in result) {
          setFormErrors({ name: result.error.message });
        }
      }
    } catch (err) {
      logger.error('SAVE_CONTRACTOR_ERROR', err);
      toast.error('保存処理中にエラーが発生しました。');
    }
  };

  const handleDelete = async (contractorId: string) => {
    const confirmed = window.confirm('本当に削除しますか？');
    if (!confirmed) {
      return;
    }

    try {
      const useCase = new DeleteContractorUseCase(contractorRepository);
      const result = await useCase.execute(contractorId);

      if (result.success) {
        toast.success('外注先企業を削除しました。');
        await loadContractors();
      } else if ('error' in result) {
        toast.error(result.error.message);
      }
    } catch (err) {
      logger.error('DELETE_CONTRACTOR_ERROR', err);
      toast.error('削除処理中にエラーが発生しました。');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  // ページネーション
  const totalPages = Math.ceil(contractorsList.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecords = contractorsList.slice(indexOfFirstItem, indexOfLastItem);

  const navItems = [
    { name: '総合ダッシュボード', path: '/dashboard', icon: LayoutDashboard },
    { name: '打刻履歴確認', path: '/attendance-history', icon: Bell },
    { name: '労働時間集計', path: '/labor-summary', icon: FileSpreadsheet },
    { name: '外注先企業登録', path: '/contractors', icon: Building2 },
    { name: '管理者ユーザー登録', path: '/admin-users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* モバイルヘッダー */}
      <header className="bg-indigo-950 text-white px-4 py-4 flex items-center justify-between md:hidden shadow-md">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-indigo-400" />
          <span className="font-bold text-lg tracking-wider">工場管理者ポータル</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1 rounded-md hover:bg-indigo-900 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="メニューを開閉"
          data-testid="mobile-menu-toggle"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* モバイルドロワーメニュー */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden" data-testid="mobile-sidebar">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-indigo-950 text-white pt-5 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-shrink-0 flex items-center px-4 mb-6">
              <LayoutDashboard className="h-8 w-8 text-indigo-400 mr-2" />
              <span className="font-bold text-xl tracking-wider">管理者メニュー</span>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    router.push(item.path);
                  }}
                  className={`group flex items-center px-4 py-3 text-base font-bold rounded-md w-full min-h-[44px] transition-colors ${
                    item.path === '/contractors' ? 'bg-indigo-900 text-white' : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
                  }`}
                  data-testid={`mobile-nav-link-${item.path}`}
                >
                  <item.icon className="mr-4 h-6 w-6 text-indigo-300" />
                  {item.name}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="group flex items-center px-4 py-3 text-base font-bold rounded-md w-full min-h-[44px] text-red-300 hover:bg-red-950 hover:text-red-100 transition-colors mt-8"
                data-testid="mobile-logout-btn"
              >
                <LogOut className="mr-4 h-6 w-6 text-red-400" />
                ログアウト
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* デスクトップサイドバー */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-indigo-950 text-white min-h-screen p-4 flex-shrink-0 shadow-xl" data-testid="desktop-sidebar">
        <div className="flex items-center gap-2 mb-8 px-2 py-3 border-b border-indigo-900">
          <LayoutDashboard className="h-8 w-8 text-indigo-400" />
          <div>
            <h1 className="font-extrabold text-lg tracking-wider">工場管理者ポータル</h1>
            <p className="text-xs text-indigo-300 font-medium">勤怠・配置管理</p>
          </div>
        </div>
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              className={`flex items-center px-4 py-3 text-sm font-bold rounded-lg w-full transition-all duration-150 ${
                item.path === '/contractors'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
              }`}
              data-testid={`desktop-nav-link-${item.path}`}
            >
              <item.icon className="mr-3 h-5 w-5 text-indigo-300" />
              {item.name}
            </button>
          ))}
        </nav>
        <div className="pt-4 border-t border-indigo-900 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-3 text-sm font-bold rounded-lg w-full text-red-300 hover:bg-red-950 hover:text-red-100 transition-all duration-150"
            data-testid="logout-btn"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-400" />
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ領域 */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 pb-5 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 md:text-3xl">外注先企業登録</h2>
            <p className="text-sm text-gray-500 mt-1">外注先企業の新規登録・編集・削除を行います。</p>
          </div>
          <button
            onClick={openNewForm}
            className="flex items-center justify-center gap-2 h-12 px-5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[44px]"
            data-testid="contractor-register-btn"
          >
            <Plus className="h-5 w-5" />
            <span>新規登録</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 shadow-sm" role="alert">
            {errorMessage}
          </div>
        )}

        {/* 一覧テーブル */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20" data-testid="loading-indicator">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {contractorsList.length === 0 ? (
              <div className="p-16 text-center text-gray-500 font-medium" data-testid="no-records-msg">
                登録されている外注先企業はありません。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">外注先企業ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">外注先企業名</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ステータス</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">作成日時</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white" data-testid="contractors-list">
                    {currentRecords.map((contractor) => (
                      <tr key={contractor.contractor_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {contractor.contractor_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {contractor.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              contractor.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {contractor.status === 'ACTIVE' ? '有効' : '無効'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {new Date(contractor.created_at).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => openEditForm(contractor)}
                              className="text-indigo-600 hover:text-indigo-900 font-bold px-3 py-1.5 rounded hover:bg-indigo-50 transition-colors min-h-[36px]"
                              data-testid={`edit-btn-${contractor.contractor_id}`}
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(contractor.contractor_id)}
                              className="text-red-600 hover:text-red-950 font-bold px-3 py-1.5 rounded hover:bg-red-50 transition-colors min-h-[36px]"
                              data-testid={`delete-btn-${contractor.contractor_id}`}
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
            )}

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex h-10 px-4 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                  data-testid="prev-page-btn"
                >
                  前へ
                </button>
                <span className="text-sm text-gray-700 font-mono">
                  {currentPage} / {totalPages} ページ
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex h-10 px-4 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                  data-testid="next-page-btn"
                >
                  次へ
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 新規登録・編集モーダル */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" data-testid="form-modal">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-indigo-950 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold" data-testid="form-modal-title">
                {formType === 'NEW' ? '外注先企業新規登録' : '外注先企業情報編集'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-indigo-200 hover:text-white p-1 min-w-[36px] min-h-[36px] flex items-center justify-center"
                data-testid="form-close-icon-btn"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {/* 企業名入力 */}
              <div className="flex flex-col">
                <label htmlFor="contractorName" className="block text-sm font-bold text-gray-700 mb-1.5">
                  外注先企業名 <span className="text-red-500 font-normal">(必須)</span>
                </label>
                <input
                  id="contractorName"
                  type="text"
                  value={editFormState.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="例: テスト協力企業A"
                  className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px]"
                  data-testid="contractor-name-input"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600 animate-fade-in" data-testid="contractor-name-error">
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* ステータス */}
              <div className="flex flex-col">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  ステータス
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`flex items-center justify-center gap-3 cursor-pointer border-2 rounded-lg p-3 min-h-[44px] select-none hover:bg-gray-50 transition-colors ${
                    editFormState.status === 'ACTIVE' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="formStatus"
                      value="ACTIVE"
                      checked={editFormState.status === 'ACTIVE'}
                      onChange={() => handleFormChange('status', 'ACTIVE')}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold">有効 (ACTIVE)</span>
                  </label>
                  <label className={`flex items-center justify-center gap-3 cursor-pointer border-2 rounded-lg p-3 min-h-[44px] select-none hover:bg-gray-50 transition-colors ${
                    editFormState.status === 'INACTIVE' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="formStatus"
                      value="INACTIVE"
                      checked={editFormState.status === 'INACTIVE'}
                      onChange={() => handleFormChange('status', 'INACTIVE')}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold">無効 (INACTIVE)</span>
                  </label>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="flex-1 h-12 rounded-md border border-gray-300 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center min-h-[44px]"
                  data-testid="form-cancel-btn"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-md bg-indigo-600 text-base font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center min-h-[44px]"
                  data-testid="form-submit-btn"
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}