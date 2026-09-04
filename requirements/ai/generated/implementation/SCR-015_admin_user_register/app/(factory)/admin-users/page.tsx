'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Role, Status } from '@/features/user/domain/user';
import { Contractor } from '@/features/contractor/domain/contractor';
import { getUserRepository } from '@/features/user/repository/userRepository';
import { getContractorRepository } from '@/features/contractor/repository/contractorRepository';
import { getSession, clearSession } from '@/lib/auth/mockAuth';
import { seedDatabase } from '@/lib/db/seed';

export default function AdminUserRegisterPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);

  // UI state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form fields
  const [loginId, setLoginId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('FACTORY_ADMIN');
  const [contractorId, setContractorId] = useState('');
  const [status, setStatus] = useState<Extract<Status, 'ACTIVE' | 'LOCKED' | 'DISABLED'>>('ACTIVE');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const userRepository = useMemo(() => getUserRepository(), []);
  const contractorRepository = useMemo(() => getContractorRepository(), []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const uList = await userRepository.getUsers();
      setUsers(uList);

      const cList = await contractorRepository.getContractors();
      setContractors(cList);
    } catch (e) {
      showToast('データの読み込みに失敗しました。', 'error');
    }
  }, [userRepository, contractorRepository, showToast]);

  useEffect(() => {
    const checkAuthAndInit = async () => {
      const session = getSession();
      if (!session || session.role !== 'FACTORY_ADMIN') {
        router.push('/login');
        return;
      }
      setCurrentUser(session);

      try {
        await seedDatabase();
        await loadData();
      } catch (err) {
        showToast('データベースの初期設定に失敗しました。', 'error');
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndInit();
  }, [router, loadData, showToast]);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  // Pagination logic
  const totalPages = Math.ceil(users.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return users.slice(start, start + itemsPerPage);
  }, [users, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Form operations
  const handleOpenCreate = () => {
    setFormMode('CREATE');
    setEditingUserId(null);
    setLoginId('');
    setDisplayName('');
    setPassword('');
    setRole('FACTORY_ADMIN');
    setContractorId('');
    setStatus('ACTIVE');
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setFormMode('EDIT');
    setEditingUserId(user.user_id);
    setLoginId(user.login_id);
    setDisplayName(user.display_name);
    setPassword('');
    setRole(user.role);
    setContractorId(user.contractor_id || '');
    setStatus(user.status);
    setErrors({});
    setIsModalOpen(true);
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!loginId.trim()) {
      newErrors.loginId = 'ユーザーIDは必須入力です。';
    } else if (formMode === 'CREATE') {
      const exists = await userRepository.userExists(loginId.trim());
      if (exists) {
        newErrors.loginId = 'このユーザーIDは既に登録されています。';
      }
    }

    if (!displayName.trim()) {
      newErrors.displayName = '表示名は必須入力です。';
    }

    if (formMode === 'CREATE' && !password) {
      newErrors.password = '新規登録時はパスワードが必須です。';
    }

    if (role === 'CONTRACTOR_MANAGER' && !contractorId) {
      newErrors.contractorId = '外注先管理者の場合は所属外注先企業の選択が必須です。';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateForm();
    if (!isValid) return;

    try {
      if (formMode === 'CREATE') {
        const newUser: User = {
          user_id: loginId.trim(),
          login_id: loginId.trim(),
          contractor_id: role === 'FACTORY_ADMIN' ? null : contractorId,
          role,
          password_hash: btoa(password), // 簡易的なエンコード
          display_name: displayName.trim(),
          status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await userRepository.createUser(newUser);
        showToast('ユーザーアカウントを新規登録しました。');
      } else if (formMode === 'EDIT' && editingUserId) {
        const uList = await userRepository.getUsers();
        const existing = uList.find(u => u.user_id === editingUserId);
        if (!existing) throw new Error('User not found');

        const updatedUser: User = {
          ...existing,
          contractor_id: role === 'FACTORY_ADMIN' ? null : contractorId,
          role,
          display_name: displayName.trim(),
          status,
          updated_at: new Date().toISOString(),
        };

        if (password) {
          updatedUser.password_hash = btoa(password);
        }

        await userRepository.updateUser(updatedUser);
        showToast('ユーザー情報を更新しました。');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      showToast('保存中にエラーが発生しました。', 'error');
    }
  };

  const handleDelete = async (user: User) => {
    if (currentUser && user.user_id === currentUser.user_id) {
      showToast('自分自身のアカウントを削除または無効化することはできません。', 'error');
      return;
    }

    const confirmMsg = `ユーザー「${user.display_name}」を無効化（ステータスをDISABLEDに設定）します。よろしいですか？`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await userRepository.deleteUser(user.user_id);
      showToast('ユーザーアカウントを無効化しました。');
      await loadData();
    } catch (err) {
      showToast('削除（無効化）処理に失敗しました。', 'error');
    }
  };

  const getContractorName = (cId: string | null) => {
    if (!cId) return '工場側';
    const c = contractors.find(item => item.contractor_id === cId);
    return c ? c.name : '不明な企業';
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 py-4 px-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">外注・配置管理システム</h1>
          <p className="text-xs text-gray-500">工場側管理者専用管理画面</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700 font-medium">
            {currentUser?.display_name} (工場管理者)
          </span>
          <button
            onClick={handleLogout}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded transition duration-200"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          data-testid="toast-notification"
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">管理者ユーザー登録</h2>
              <p className="text-sm text-gray-600">工場側管理者及び外注先管理者アカウントを管理します。</p>
            </div>
            <button
              onClick={handleOpenCreate}
              data-testid="btn-create-user"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-lg shadow-sm flex items-center space-x-2 transition duration-200 text-base min-h-[44px]"
            >
              <span>新規登録</span>
            </button>
          </div>

          {/* Table Container (PC & Tablet Layout) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    表示名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ユーザーID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    権限種別
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    所属
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedUsers.map(user => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.display_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.login_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.role === 'FACTORY_ADMIN' ? '工場側管理者' : '外注先管理者'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getContractorName(user.contractor_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : user.status === 'LOCKED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-55 hover:bg-blue-50 px-3 py-1.5 rounded border border-blue-200"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:text-red-900 bg-red-55 hover:bg-red-50 px-3 py-1.5 rounded border border-red-200"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card Layout (Mobile Responsive) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {paginatedUsers.map(user => (
              <div key={user.user_id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{user.display_name}</h3>
                    <p className="text-xs text-gray-500">ID: {user.login_id}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      user.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : user.status === 'LOCKED'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.status}
                  </span>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>
                    <span className="font-semibold text-gray-500 text-xs uppercase mr-2">権限:</span>
                    {user.role === 'FACTORY_ADMIN' ? '工場側管理者' : '外注先管理者'}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500 text-xs uppercase mr-2">所属:</span>
                    {getContractorName(user.contractor_id)}
                  </p>
                </div>
                <div className="flex justify-end space-x-4 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => handleOpenEdit(user)}
                    className="flex-1 py-2 text-center text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded min-h-[40px]"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="flex-1 py-2 text-center text-sm font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded min-h-[40px]"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-4 sm:px-6 mt-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[40px]"
              >
                前へ
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[40px]"
              >
                次へ
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  全 <span className="font-medium">{users.length}</span> 件中{' '}
                  <span className="font-medium">
                    {Math.min((currentPage - 1) * itemsPerPage + 1, users.length)}
                  </span>{' '}
                  〜{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, users.length)}
                  </span>{' '}
                  件を表示しています
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 min-h-[40px]"
                  >
                    前へ
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 min-h-[40px] ${
                        page === currentPage
                          ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 min-h-[40px]"
                  >
                    次へ
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal / Dialog Backdrop */}
      {isModalOpen && (
        <div
          data-testid="modal-overlay"
          className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {formMode === 'CREATE' ? 'ユーザーアカウント新規登録' : 'ユーザーアカウント編集'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500 font-bold text-xl p-1"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {/* User ID Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ユーザーID (ログインID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                    disabled={formMode === 'EDIT'}
                    placeholder="ユーザーIDを入力"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 min-h-[40px]"
                  />
                  {errors.loginId && (
                    <p className="text-red-500 text-xs mt-1" data-testid="error-loginId">
                      {errors.loginId}
                    </p>
                  )}
                </div>

                {/* Display Name Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    表示名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="表示名（氏名等）を入力"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[40px]"
                  />
                  {errors.displayName && (
                    <p className="text-red-500 text-xs mt-1" data-testid="error-displayName">
                      {errors.displayName}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    パスワード{' '}
                    {formMode === 'CREATE' ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-gray-400 text-xs">(変更する場合のみ入力)</span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={
                      formMode === 'CREATE' ? 'パスワードを入力' : '新しいパスワードを入力'
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[40px]"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1" data-testid="error-password">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Role (Role Switch) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    権限種別 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={e => {
                      const selectedRole = e.target.value as Role;
                      setRole(selectedRole);
                      if (selectedRole === 'FACTORY_ADMIN') {
                        setContractorId('');
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white min-h-[40px]"
                  >
                    <option value="FACTORY_ADMIN">工場側管理者 (FACTORY_ADMIN)</option>
                    <option value="CONTRACTOR_MANAGER">外注先管理者 (CONTRACTOR_MANAGER)</option>
                  </select>
                </div>

                {/* Contractor Field (displayed only if Contractor Manager is selected) */}
                {role === 'CONTRACTOR_MANAGER' && (
                  <div data-testid="contractor-select-wrapper">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      所属外注先企業 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={contractorId}
                      onChange={e => setContractorId(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white min-h-[40px]"
                    >
                      <option value="">-- 企業を選択してください --</option>
                      {contractors.map(c => (
                        <option key={c.contractor_id} value={c.contractor_id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {errors.contractorId && (
                      <p className="text-red-500 text-xs mt-1" data-testid="error-contractorId">
                        {errors.contractorId}
                      </p>
                    )}
                  </div>
                )}

                {/* Status Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white min-h-[40px]"
                  >
                    <option value="ACTIVE">ACTIVE (有効)</option>
                    <option value="LOCKED">LOCKED (ロック中)</option>
                    <option value="DISABLED">DISABLED (無効)</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[40px]"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium min-h-[40px]"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}