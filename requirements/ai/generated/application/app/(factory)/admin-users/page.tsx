"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IndexedDBUserRepository } from '@/features/user/repository/indexedDBUserRepository';
import { IndexedDBContractorRepository } from '@/features/contractor/repository/indexedDBContractorRepository';
import { GetUsersUseCase } from '@/features/user/usecase/getUsersUseCase';
import { CreateUserUseCase } from '@/features/user/usecase/createUserUseCase';
import { UpdateUserUseCase } from '@/features/user/usecase/updateUserUseCase';
import { DeleteUserUseCase } from '@/features/user/usecase/deleteUserUseCase';
import { GetContractorsUseCase } from '@/features/contractor/usecase/getContractorsUseCase';
import { User, Role } from '@/features/user/domain/types';
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

const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
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

export default function AdminUserRegisterPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // データ状態
  const [usersList, setUsersList] = useState<User[]>([]);
  const [contractorsList, setContractorsList] = useState<Contractor[]>([]);
  const [currentAdminUserId, setCurrentAdminUserId] = useState<string>('');

  // モーダル・ポップアップ状態
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // 入力フォーム状態
  const [editFormState, setEditFormState] = useState({
    loginId: '',
    displayName: '',
    role: 'FACTORY_ADMIN' as Role,
    contractorId: '' as string,
    password: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const userRepository = new IndexedDBUserRepository();
  const contractorRepository = new IndexedDBContractorRepository();

  useEffect(() => {
    const checkAuthAndInit = async () => {
      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'FACTORY_ADMIN') {
        logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: '/admin-users' });
        router.replace('/login');
        return;
      }

      setCurrentAdminUserId(userId);
      setIsAuthenticated(true);
      await loadInitialData();
    };

    checkAuthAndInit();
  }, [router]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const getUsersUseCase = new GetUsersUseCase(userRepository);
      const getContractorsUseCase = new GetContractorsUseCase(contractorRepository);

      const [usersResult, contractorsResult] = await Promise.all([
        getUsersUseCase.execute(),
        getContractorsUseCase.execute(),
      ]);

      if (usersResult.success) {
        // status が DISABLED でないアクティブなアカウントのみを一覧表示する
        const activeUsers = usersResult.value.filter((u) => u.status !== 'DISABLED');
        setUsersList(activeUsers);
        setCurrentPage(1);
      } else if ('error' in usersResult) {
        toast.error(usersResult.error.message);
      }

      if (contractorsResult.success) {
        // プルダウン表示用に ACTIVE な企業のみロード
        const activeContractors = contractorsResult.value.filter((c) => c.status === 'ACTIVE');
        setContractorsList(activeContractors);
      } else if ('error' in contractorsResult) {
        toast.error(contractorsResult.error.message);
      }
    } catch (err) {
      logger.error('LOAD_INITIAL_DATA_ERROR', err);
      toast.error('データの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logger.info('ADMIN_LOGOUT_EVENT', { user_id: currentAdminUserId });
    sessionStorage.removeItem('user_id');
    sessionStorage.removeItem('role');
    router.push('/login');
  };

  const openNewForm = () => {
    setEditingUser(null);
    setFormErrors({});
    setEditFormState({
      loginId: '',
      displayName: '',
      role: 'FACTORY_ADMIN',
      contractorId: '',
      password: '',
    });
    setIsFormOpen(true);
    logger.info('OPEN_USER_FORM_NEW');
  };

  const openEditForm = (user: User) => {
    setEditingUser(user);
    setFormErrors({});
    setEditFormState({
      loginId: user.login_id,
      displayName: user.display_name,
      role: user.role,
      contractorId: user.contractor_id || '',
      password: '', // パスワードは空（編集時は更新対象外とする）
    });
    setIsFormOpen(true);
    logger.info('OPEN_USER_FORM_EDIT', { target_user_id: user.user_id });
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

    if (!editingUser && (!editFormState.loginId || !editFormState.loginId.trim())) {
      errors.loginId = 'ユーザーIDは必須入力です。';
    }
    if (!editFormState.displayName || !editFormState.displayName.trim()) {
      errors.displayName = '表示名は必須入力です。';
    }
    if (!editingUser && (!editFormState.password || !editFormState.password.trim())) {
      errors.password = 'パスワードは必須入力です。';
    }
    if (!editingUser && editFormState.password && editFormState.password.length < 8) {
      errors.password = 'パスワードは8文字以上必要です。';
    }
    if (editingUser && editFormState.password && editFormState.password.trim() !== '' && editFormState.password.length < 8) {
      errors.password = 'パスワードは8文字以上必要です。';
    }
    if (editFormState.role === 'CONTRACTOR_MANAGER' && !editFormState.contractorId) {
      errors.contractorId = '所属外注先企業を選択してください。';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (!editingUser) {
        const createUserUseCase = new CreateUserUseCase(userRepository);
        const result = await createUserUseCase.execute({
          loginId: editFormState.loginId,
          passwordHash: editFormState.password,
          role: editFormState.role,
          displayName: editFormState.displayName,
          contractorId: editFormState.role === 'FACTORY_ADMIN' ? null : editFormState.contractorId,
          createdBy: currentAdminUserId,
        });

        if (result.success) {
          toast.success('ユーザーアカウントを登録しました。');
          setIsFormOpen(false);
          await loadInitialData();
        } else if ('error' in result) {
          if (result.error.code === 'DUPLICATE_LOGIN_ID') {
            setFormErrors({ loginId: 'ユーザーIDが重複しています。' });
          } else {
            toast.error(result.error.message);
          }
        }
      } else {
        const updateUserUseCase = new UpdateUserUseCase(userRepository);
        const result = await updateUserUseCase.execute({
          userId: editingUser.user_id,
          role: editFormState.role,
          displayName: editFormState.displayName,
          contractorId: editFormState.role === 'FACTORY_ADMIN' ? null : editFormState.contractorId,
          passwordHash: editFormState.password.trim() !== '' ? editFormState.password : undefined,
          updatedBy: currentAdminUserId,
        });

        if (result.success) {
          toast.success('ユーザーアカウント情報を更新しました。');
          setIsFormOpen(false);
          await loadInitialData();
        } else if ('error' in result) {
          toast.error(result.error.message);
        }
      }
    } catch (err) {
      logger.error('SAVE_USER_ERROR', err);
      toast.error('保存処理中にエラーが発生しました。');
    }
  };

  const handleDelete = async (userId: string) => {
    if (userId === currentAdminUserId) {
      toast.error('自分自身のアカウントを削除することはできません。');
      return;
    }

    const confirmed = window.confirm('本当にこのユーザーアカウントを削除しますか？');
    if (!confirmed) {
      return;
    }

    try {
      const deleteUserUseCase = new DeleteUserUseCase(userRepository);
      const result = await deleteUserUseCase.execute(userId, currentAdminUserId);

      if (result.success) {
        toast.success('ユーザーアカウントを削除しました。');
        await loadInitialData();
      } else if ('error' in result) {
        toast.error(result.error.message);
      }
    } catch (err) {
      logger.error('DELETE_USER_ERROR', err);
      toast.error('削除処理中にエラーが発生しました。');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  // ページネーション計算
  const totalPages = Math.ceil(usersList.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecords = usersList.slice(indexOfFirstItem, indexOfLastItem);

  const navItems = [
    { name: '総合ダッシュボード', path: '/dashboard', icon: LayoutDashboard },
    { name: '打刻履歴確認', path: '/attendance-history', icon: Bell },
    { name: '労働時間集計', path: '/labor-summary', icon: FileSpreadsheet },
    { name: '外注先企業登録', path: '/contractors', icon: Building2 },
    { name: '管理者ユーザー登録', path: '/admin-users', icon: UsersIcon },
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
                    item.path === '/admin-users' ? 'bg-indigo-900 text-white' : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
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
                item.path === '/admin-users'
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
            <h2 className="text-2xl font-extrabold text-gray-900 md:text-3xl">管理者ユーザー登録</h2>
            <p className="text-sm text-gray-500 mt-1">工場側管理者および外注先管理者アカウントの新規発行・情報修正を行います。</p>
          </div>
          <button
            onClick={openNewForm}
            className="flex items-center justify-center gap-2 h-12 px-5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[44px]"
            data-testid="user-register-btn"
          >
            <Plus className="h-5 w-5" />
            <span>新規登録</span>
          </button>
        </div>

        {/* 一覧テーブル */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20" data-testid="loading-indicator">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {usersList.length === 0 ? (
              <div className="p-16 text-center text-gray-500 font-medium" data-testid="no-records-msg">
                登録されている管理者ユーザーはいません。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">表示名</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ユーザーID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">権限種別</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">所属企業</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">作成日時</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white" data-testid="users-list">
                    {currentRecords.map((user) => {
                      const contractor = contractorsList.find((c) => c.contractor_id === user.contractor_id);
                      return (
                        <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            {user.display_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                            {user.login_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                user.role === 'FACTORY_ADMIN'
                                  ? 'bg-purple-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {user.role === 'FACTORY_ADMIN' ? '工場管理者' : '外注先管理者'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.role === 'FACTORY_ADMIN' ? '（工場直属）' : contractor ? contractor.name : '未設定'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                            {new Date(user.created_at).toLocaleString('ja-JP')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => openEditForm(user)}
                                className="text-indigo-600 hover:text-indigo-900 font-bold px-3 py-1.5 rounded hover:bg-indigo-50 transition-colors min-h-[36px]"
                                data-testid={`edit-btn-${user.user_id}`}
                              >
                                編集
                              </button>
                              {user.user_id !== currentAdminUserId && (
                                <button
                                  onClick={() => handleDelete(user.user_id)}
                                  className="text-red-600 hover:text-red-950 font-bold px-3 py-1.5 rounded hover:bg-red-50 transition-colors min-h-[36px]"
                                  data-testid={`delete-btn-${user.user_id}`}
                                >
                                  削除
                                </button>
                              )}
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
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" data-testid="form-modal">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-indigo-950 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold" data-testid="form-modal-title">
                {editingUser ? '管理者ユーザー情報編集' : '管理者ユーザー新規登録'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-indigo-200 hover:text-white p-1 min-w-[36px] min-h-[36px] flex items-center justify-center"
                data-testid="form-close-icon-btn"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* ユーザーID (新規登録のみ可能、編集時は固定) */}
              <div className="flex flex-col">
                <label htmlFor="loginId" className="block text-sm font-bold text-gray-700 mb-1.5">
                  ユーザーID (ログインID) <span className="text-red-500 font-normal">(!新規のみ・必須)</span>
                </label>
                <input
                  id="loginId"
                  type="text"
                  value={editFormState.loginId}
                  onChange={(e) => handleFormChange('loginId', e.target.value)}
                  disabled={!!editingUser}
                  placeholder="例: admin_taro"
                  className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px] disabled:bg-gray-100 disabled:text-gray-500"
                  data-testid="loginId-input"
                />
                {formErrors.loginId && (
                  <p className="mt-1 text-sm text-red-600" data-testid="loginId-error">
                    {formErrors.loginId}
                  </p>
                )}
              </div>

              {/* 表示名 */}
              <div className="flex flex-col">
                <label htmlFor="displayName" className="block text-sm font-bold text-gray-700 mb-1.5">
                  表示名 (氏名など) <span className="text-red-500 font-normal">(必須)</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={editFormState.displayName}
                  onChange={(e) => handleFormChange('displayName', e.target.value)}
                  placeholder="例: 山田 太郎"
                  className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px]"
                  data-testid="displayName-input"
                />
                {formErrors.displayName && (
                  <p className="mt-1 text-sm text-red-600" data-testid="displayName-error">
                    {formErrors.displayName}
                  </p>
                )}
              </div>

              {/* 権限種別選択 */}
              <div className="flex flex-col">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  権限種別 <span className="text-red-500 font-normal">(必須)</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`flex items-center justify-center gap-3 cursor-pointer border-2 rounded-lg p-3 min-h-[44px] select-none hover:bg-gray-50 transition-colors ${
                    editFormState.role === 'FACTORY_ADMIN' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200'
                  }`} data-testid="role-factory-label">
                    <input
                      type="radio"
                      name="formRole"
                      value="FACTORY_ADMIN"
                      checked={editFormState.role === 'FACTORY_ADMIN'}
                      onChange={() => handleFormChange('role', 'FACTORY_ADMIN')}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold">工場管理者</span>
                  </label>
                  <label className={`flex items-center justify-center gap-3 cursor-pointer border-2 rounded-lg p-3 min-h-[44px] select-none hover:bg-gray-50 transition-colors ${
                    editFormState.role === 'CONTRACTOR_MANAGER' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200'
                  }`} data-testid="role-contractor-label">
                    <input
                      type="radio"
                      name="formRole"
                      value="CONTRACTOR_MANAGER"
                      checked={editFormState.role === 'CONTRACTOR_MANAGER'}
                      onChange={() => handleFormChange('role', 'CONTRACTOR_MANAGER')}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold">外注先管理者</span>
                  </label>
                </div>
              </div>

              {/* 所属外注先企業 (外注先管理者選択時のみ表示/動的活性化) */}
              {editFormState.role === 'CONTRACTOR_MANAGER' && (
                <div className="flex flex-col" data-testid="contractor-select-container">
                  <label htmlFor="formContractor" className="block text-sm font-bold text-gray-700 mb-1.5">
                    所属外注先企業 <span className="text-red-500 font-normal">(必須)</span>
                  </label>
                  <select
                    id="formContractor"
                    value={editFormState.contractorId}
                    onChange={(e) => handleFormChange('contractorId', e.target.value)}
                    className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px] bg-white"
                    data-testid="contractor-select"
                  >
                    <option value="">所属企業を選択してください</option>
                    {contractorsList.map((con) => (
                      <option key={con.contractor_id} value={con.contractor_id}>
                        {con.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.contractorId && (
                    <p className="mt-1 text-sm text-red-600" data-testid="contractorId-error">
                      {formErrors.contractorId}
                    </p>
                  )}
                </div>
              )}

              {/* パスワード */}
              <div className="flex flex-col">
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-1.5">
                  パスワード {editingUser ? <span className="text-gray-400 font-normal">(変更時のみ入力)</span> : <span className="text-red-500 font-normal">(必須・8文字以上)</span>}
                </label>
                <input
                  id="password"
                  type="password"
                  value={editFormState.password}
                  onChange={(e) => handleFormChange('password', e.target.value)}
                  placeholder="パスワードを入力"
                  className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px]"
                  data-testid="password-input"
                />
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-600" data-testid="password-error">
                    {formErrors.password}
                  </p>
                )}
              </div>

              {/* アクションボタン */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
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