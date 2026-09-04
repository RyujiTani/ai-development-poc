'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Role } from '@/features/user/domain/user';
import { Contractor } from '@/features/contractor/domain/contractor';
import { IndexedDBUserRepository } from '@/features/user/repository/userRepository';
import { IndexedDBContractorRepository } from '@/features/contractor/repository/contractorRepository';
import { UserUsecase } from '@/features/user/usecase/userUsecase';
import { getSession } from '@/lib/auth/mockAuth';
import { initSeedData } from '@/lib/db/indexedDb';

export default function AdminUserRegisterPage() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ステート定義
  const [users, setUsers] = useState<User[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // フォーム用
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [formData, setFormData] = useState({
    userId: '',
    loginId: '',
    displayName: '',
    role: 'FACTORY_ADMIN' as Role,
    contractorId: '',
    password: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 削除用
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [targetDeleteUserId, setTargetDeleteUserId] = useState<string | null>(null);

  // 簡易トースト通知
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const userRepo = new IndexedDBUserRepository();
  const contractorRepo = new IndexedDBContractorRepository();
  const usecase = new UserUsecase(userRepo, contractorRepo);

  const loadData = async () => {
    setIsLoading(true);
    const usersRes = await usecase.getUserList();
    const contractorsRes = await usecase.getActiveContractors();

    if (usersRes.success) {
      setUsers(usersRes.data);
    } else {
      showToast('ユーザー情報の取得に失敗しました', 'error');
    }

    if (contractorsRes.success) {
      setContractors(contractorsRes.data);
    } else {
      showToast('所属企業の取得に失敗しました', 'error');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'FACTORY_ADMIN') {
      router.push('/login');
      return;
    }
    setCurrentUser(session);
    setIsAuthChecking(false);

    initSeedData().then(() => {
      loadData();
    });
  }, [router]);

  if (isAuthChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  const handleCreateClick = () => {
    setFormMode('CREATE');
    setFormData({
      userId: '',
      loginId: '',
      displayName: '',
      role: 'FACTORY_ADMIN',
      contractorId: '',
      password: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleEditClick = (user: User) => {
    setFormMode('EDIT');
    setFormData({
      userId: user.user_id,
      loginId: user.login_id,
      displayName: user.display_name,
      role: user.role,
      contractorId: user.contractor_id || '',
      password: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteClick = (userId: string) => {
    if (currentUser && currentUser.user_id === userId) {
      showToast('自分自身のアカウントを削除することはできません。', 'error');
      return;
    }
    setTargetDeleteUserId(userId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!targetDeleteUserId) return;
    setIsLoading(true);
    const res = await usecase.deleteUser(targetDeleteUserId);
    setIsLoading(false);
    setIsDeleteConfirmOpen(false);
    setTargetDeleteUserId(null);

    if (res.success) {
      showToast('ユーザーを削除しました', 'success');
      loadData();
    } else {
      showToast('ユーザーの削除に失敗しました', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const errors: Record<string, string> = {};

    if (formMode === 'CREATE') {
      if (!formData.userId.trim()) {
        errors.userId = 'ユーザーIDは必須項目です';
      }
      if (!formData.loginId.trim()) {
        errors.loginId = 'ログインIDは必須項目です';
      }
      if (!formData.password) {
        errors.password = 'パスワードは必須項目です';
      } else if (formData.password.length < 8) {
        errors.password = 'パスワードは8文字以上である必要があります';
      }
    } else {
      if (formData.password && formData.password.length < 8) {
        errors.password = 'パスワードは8文字以上である必要があります';
      }
    }

    if (!formData.displayName.trim()) {
      errors.displayName = '表示名は必須項目です';
    }

    if (formData.role === 'CONTRACTOR_MANAGER' && !formData.contractorId) {
      errors.contractorId = '外注先管理者の場合は、所属企業を選択してください';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsLoading(true);
    let res;
    if (formMode === 'CREATE') {
      res = await usecase.createUser({
        userId: formData.userId,
        loginId: formData.loginId,
        displayName: formData.displayName,
        role: formData.role,
        contractorId: formData.contractorId || null,
        password: formData.password,
      });
    } else {
      res = await usecase.updateUser(formData.userId, {
        displayName: formData.displayName,
        role: formData.role,
        contractorId: formData.contractorId || null,
        password: formData.password || undefined,
      });
    }

    setIsLoading(false);
    if (res.success) {
      showToast('保存が完了しました', 'success');
      setIsFormOpen(false);
      loadData();
    } else {
      showToast(res.error.message || '保存に失敗しました', 'error');
      if (res.error.message.includes('ユーザーID')) {
        setFormErrors((prev) => ({ ...prev, userId: res.error.message }));
      } else if (res.error.message.includes('ログインID')) {
        setFormErrors((prev) => ({ ...prev, loginId: res.error.message }));
      }
    }
  };

  const getContractorName = (id: string | null) => {
    if (!id) return '-';
    const c = contractors.find((item) => item.contractor_id === id);
    return c ? c.name : '-';
  };

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* トースト表示 */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg p-4 shadow-lg transition-all duration-300 ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <div className="font-semibold">{toast.message}</div>
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">管理者ユーザー登録</h1>
            <p className="text-sm text-gray-500 mt-1">
              工場側・外注先のシステム管理ユーザーのアカウント情報を一覧管理および登録・編集できます。
            </p>
          </div>
          <button
            onClick={handleCreateClick}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            新規ユーザー登録
          </button>
        </header>

        {/* ユーザー一覧 */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
              <thead className="bg-gray-100 font-semibold text-gray-700 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-4">ユーザーID / ログインID</th>
                  <th scope="col" className="px-6 py-4">表示名</th>
                  <th scope="col" className="px-6 py-4">権限種別</th>
                  <th scope="col" className="px-6 py-4">所属外注先企業</th>
                  <th scope="col" className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                      データをロード中...
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                      登録されているアカウントがありません。
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="font-semibold text-blue-700">{user.user_id}</div>
                        <div className="text-xs text-gray-400 mt-0.5">ログイン用: {user.login_id}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{user.display_name}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.role === 'FACTORY_ADMIN'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {user.role === 'FACTORY_ADMIN' ? '工場側管理者' : '外注先管理者'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {getContractorName(user.contractor_id)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 min-h-[44px] min-w-[44px]"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user.user_id)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-100 min-h-[44px] min-w-[44px]"
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

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4">
              <div className="text-sm text-gray-600">
                合計 <span className="font-semibold text-gray-900">{users.length}</span> 件中{' '}
                <span className="font-semibold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span>{' '}
                から <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, users.length)}</span> 件を表示
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                >
                  前へ
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 登録・編集モーダル */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="bg-gray-50 border-b border-gray-150 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {formMode === 'CREATE' ? '管理者ユーザー新規登録' : 'ユーザーアカウント情報編集'}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px]"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </header>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* ユーザーID */}
              <div>
                <label htmlFor="userId" className="block text-sm font-semibold text-gray-700 mb-1">
                  ユーザーID <span className="text-red-500">*</span>
                </label>
                <input
                  id="userId"
                  type="text"
                  name="userId"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  disabled={formMode === 'EDIT'}
                  className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:bg-gray-100 disabled:text-gray-500 ${
                    formErrors.userId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="例: user-99"
                />
                {formErrors.userId && <p className="mt-1 text-xs text-red-500 font-medium">{formErrors.userId}</p>}
              </div>

              {/* ログインID */}
              <div>
                <label htmlFor="loginId" className="block text-sm font-semibold text-gray-700 mb-1">
                  ログインID（ログイン時に入力するID） <span className="text-red-500">*</span>
                </label>
                <input
                  id="loginId"
                  type="text"
                  name="loginId"
                  value={formData.loginId}
                  onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                  disabled={formMode === 'EDIT'}
                  className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:bg-gray-100 disabled:text-gray-500 ${
                    formErrors.loginId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="例: sato-manager"
                />
                {formErrors.loginId && <p className="mt-1 text-xs text-red-500 font-medium">{formErrors.loginId}</p>}
              </div>

              {/* 表示名 */}
              <div>
                <label htmlFor="displayName" className="block text-sm font-semibold text-gray-700 mb-1">
                  表示名 <span className="text-red-500">*</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    formErrors.displayName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="例: 佐藤 隆"
                />
                {formErrors.displayName && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{formErrors.displayName}</p>
                )}
              </div>

              {/* パスワード */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                  パスワード {formMode === 'CREATE' && <span className="text-red-500">*</span>}
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    formErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={formMode === 'CREATE' ? "8文字以上のパスワード" : "変更する場合のみ入力"}
                />
                {formErrors.password && <p className="mt-1 text-xs text-red-500 font-medium">{formErrors.password}</p>}
              </div>

              {/* 権限種別 */}
              <div>
                <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-1">
                  権限種別 <span className="text-red-500">*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  <option value="FACTORY_ADMIN">工場側管理者</option>
                  <option value="CONTRACTOR_MANAGER">外注先管理者</option>
                </select>
              </div>

              {/* 所属企業 (動的UI) */}
              {formData.role === 'CONTRACTOR_MANAGER' && (
                <div>
                  <label htmlFor="contractorId" className="block text-sm font-semibold text-gray-700 mb-1">
                    所属外注先企業 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="contractorId"
                    name="contractorId"
                    value={formData.contractorId}
                    onChange={(e) => setFormData({ ...formData, contractorId: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                      formErrors.contractorId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">-- 企業を選択してください --</option>
                    {contractors.map((c) => (
                      <option key={c.contractor_id} value={c.contractor_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.contractorId && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{formErrors.contractorId}</p>
                  )}
                </div>
              )}

              {/* 操作ボタン */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 min-h-[44px]"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 min-h-[44px]"
                >
                  {isLoading ? '保存中...' : '保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900">アカウントの削除確認</h3>
            <p className="mt-2 text-sm text-gray-500">
              ユーザーID <span className="font-semibold text-blue-700">{targetDeleteUserId}</span> のアカウントを完全に削除します。
              この操作は取り消すことができません。本当によろしいですか？
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setTargetDeleteUserId(null);
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 min-h-[44px]"
              >
                キャンセル
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}