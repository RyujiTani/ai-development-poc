'use client';

import React, { useEffect, useState } from 'react';
import { User, Contractor, Role, Status } from '@/features/user/domain/user';
import { IndexedDBUserRepository } from '@/features/user/repository/userRepository';
import { UserUsecase } from '@/features/user/usecase/userUsecase';

export default function AdminUserRegisterPage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [contractorsList, setContractorsList] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [loginId, setLoginId] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<Role>('FACTORY_ADMIN');
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  const [userStatus, setUserStatus] = useState<Extract<Status, 'ACTIVE' | 'LOCKED' | 'DISABLED'>>('ACTIVE');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  const userRepository = new IndexedDBUserRepository();
  const userUsecase = new UserUsecase(userRepository);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserId = sessionStorage.getItem('user_id');
      const storedRole = sessionStorage.getItem('role');

      if (!storedUserId && !storedRole) {
        sessionStorage.setItem('user_id', 'admin-default-id');
        sessionStorage.setItem('role', 'FACTORY_ADMIN');
        setCurrentUser({ id: 'admin-default-id', role: 'FACTORY_ADMIN' });
      } else if (storedRole !== 'FACTORY_ADMIN') {
        window.location.href = '/login';
      } else {
        setCurrentUser({ id: storedUserId || '', role: storedRole || '' });
      }
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const usersRes = await userUsecase.getUsersList();
    const contractorsRes = await userUsecase.getContractorsList();

    if (usersRes.success) {
      setUsersList(usersRes.value);
    } else {
      addToast(usersRes.error.message, 'error');
    }

    if (contractorsRes.success) {
      setContractorsList(contractorsRes.value);
    } else {
      addToast(contractorsRes.error.message, 'error');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const resetForm = () => {
    setLoginId('');
    setDisplayName('');
    setPassword('');
    setSelectedRole('FACTORY_ADMIN');
    setSelectedContractorId('');
    setUserStatus('ACTIVE');
    setErrors({});
    setSelectedUser(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setFormMode('CREATE');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    resetForm();
    setFormMode('EDIT');
    setSelectedUser(user);
    setLoginId(user.login_id);
    setDisplayName(user.display_name);
    setSelectedRole(user.role);
    setSelectedContractorId(user.contractor_id || '');
    setUserStatus(user.status);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (formMode === 'CREATE' && !loginId.trim()) {
      newErrors.loginId = 'ユーザーIDは必須入力です。';
    }

    if (formMode === 'CREATE' && !password) {
      newErrors.password = 'パスワードは必須入力です。';
    } else if (password && password.length < 6) {
      newErrors.password = 'パスワードは6文字以上で入力してください。';
    }

    if (!displayName.trim()) {
      newErrors.displayName = '表示名は必須入力です。';
    }

    if (selectedRole === 'CONTRACTOR_MANAGER' && !selectedContractorId) {
      newErrors.selectedContractorId = '外注先管理者の場合は所属企業の選択が必須です。';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hashPassword = (pwd: string): string => {
    return btoa(pwd);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (formMode === 'CREATE') {
      const input = {
        login_id: loginId,
        password_hash: hashPassword(password),
        display_name: displayName,
        role: selectedRole,
        contractor_id: selectedRole === 'FACTORY_ADMIN' ? null : selectedContractorId
      };

      const result = await userUsecase.registerUser(input);
      if (result.success) {
        addToast('ユーザーアカウントを新規登録しました。', 'success');
        setIsFormOpen(false);
        loadData();
      } else {
        if (result.error.code === 'DUPLICATE_LOGIN_ID') {
          setErrors({ loginId: result.error.message });
        } else {
          addToast(result.error.message, 'error');
        }
      }
    } else {
      if (!selectedUser) return;

      const input = {
        display_name: displayName,
        role: selectedRole,
        contractor_id: selectedRole === 'FACTORY_ADMIN' ? null : selectedContractorId,
        status: userStatus,
        password_hash: password ? hashPassword(password) : undefined
      };

      const result = await userUsecase.modifyUser(selectedUser.user_id, input);
      if (result.success) {
        addToast('ユーザーアカウント情報を更新しました。', 'success');
        setIsFormOpen(false);
        loadData();
      } else {
        addToast(result.error.message, 'error');
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;

    const result = await userUsecase.disableUser(deleteTargetId);
    if (result.success) {
      addToast('ユーザーアカウントを無効化しました。', 'success');
      setDeleteTargetId(null);
      loadData();
    } else {
      addToast(result.error.message, 'error');
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = usersList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(usersList.length / itemsPerPage);

  const getContractorName = (id: string | null) => {
    if (!id) return '工場管理者';
    const contractor = contractorsList.find((c) => c.contractor_id === id);
    return contractor ? contractor.name : '不明な外注先';
  };

  const getRoleBadge = (role: Role) => {
    if (role === 'FACTORY_ADMIN') {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          工場管理者
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        外注先管理者
      </span>
    );
  };

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
            有効
          </span>
        );
      case 'LOCKED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
            ロック
          </span>
        );
      case 'DISABLED':
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">
            無効
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-lg shadow-lg flex items-center justify-between text-white transition-all duration-300 transform translate-y-0 w-80 pointer-events-auto ${
              t.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{t.message}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">管理者ユーザー登録</h1>
            <p className="mt-1 text-sm text-slate-500">
              工場側および外注先管理者のアカウントを作成・変更できます。
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
            >
              新規登録
            </button>
          </div>
        </div>

        {currentUser && (
          <div className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-600 flex justify-between items-center">
            <span>
              ログインユーザー: <strong className="text-slate-800">{currentUser.id}</strong> (工場側管理者)
            </span>
          </div>
        )}

        <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ログインID</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">表示名</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">権限種別</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">所属企業</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {currentUsers.map((user) => {
                  const isSelf = user.user_id === currentUser?.id;
                  return (
                    <tr key={user.user_id} className="hover:bg-slate-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-900">{user.login_id}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{user.display_name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">{getRoleBadge(user.role)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{getContractorName(user.contractor_id)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">{getStatusBadge(user.status)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          disabled={isSelf}
                          className="text-indigo-600 hover:text-indigo-900 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(user.user_id)}
                          disabled={isSelf || user.status === 'DISABLED'}
                          className="text-rose-600 hover:text-rose-900 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          無効化
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-200">
            {currentUsers.map((user) => {
              const isSelf = user.user_id === currentUser?.id;
              return (
                <div key={user.user_id} className="p-4 space-y-3 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-base font-bold text-slate-900">{user.display_name}</div>
                      <div className="text-xs text-slate-500">ID: {user.login_id}</div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user.status)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">所属: <strong className="text-slate-700">{getContractorName(user.contractor_id)}</strong></span>
                    <div className="space-x-3">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        disabled={isSelf}
                        className="text-indigo-600 font-semibold disabled:opacity-40"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(user.user_id)}
                        disabled={isSelf || user.status === 'DISABLED'}
                        className="text-rose-600 font-semibold disabled:opacity-40"
                      >
                        無効化
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {usersList.length === 0 && (
            <div className="py-12 flex flex-col items-center text-slate-400">
              <span className="text-lg font-medium">登録されているユーザーがいません。</span>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow-sm">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                前へ
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                次へ
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  全 <span className="font-semibold">{usersList.length}</span> 件中{' '}
                  <span className="font-semibold">{indexOfFirstItem + 1}</span> から{' '}
                  <span className="font-semibold">{Math.min(indexOfLastItem, usersList.length)}</span> 件目を表示
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 ${
                        currentPage === i + 1
                          ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                          : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:outline-offset-0'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </nav>Code
              </div>
            </div>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-40 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={() => setIsFormOpen(false)}
            ></div>

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div>
                <h3 className="text-lg font-bold leading-6 text-slate-900" id="modal-title">
                  {formMode === 'CREATE' ? 'ユーザーアカウント新規登録' : 'ユーザーアカウント編集'}
                </h3>
                <form onSubmit={handleSave} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="login_id" className="block text-sm font-semibold text-slate-700">
                      ユーザーID (ログイン用)
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="login_id"
                        id="login_id"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        disabled={formMode === 'EDIT'}
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 bg-white border disabled:bg-slate-100 disabled:text-slate-500"
                        placeholder="例: worker_user_01"
                      />
                    </div>
                    {errors.loginId && <p className="mt-1.5 text-xs text-rose-600 font-semibold">{errors.loginId}</p>}
                  </div>

                  <div>
                    <label htmlFor="display_name" className="block text-sm font-semibold text-slate-700">
                      表示名
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="display_name"
                        id="display_name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 bg-white border"
                        placeholder="例: 山田 太郎"
                      />
                    </div>
                    {errors.displayName && <p className="mt-1.5 text-xs text-rose-600 font-semibold">{errors.displayName}</p>}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                      パスワード {formMode === 'EDIT' && <span className="text-xs font-normal text-slate-400">(変更する場合のみ入力)</span>}
                    </label>
                    <div className="mt-1">
                      <input
                        type="password"
                        name="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 bg-white border"
                        placeholder="6文字以上"
                      />
                    </div>
                    {errors.password && <p className="mt-1.5 text-xs text-rose-600 font-semibold">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">権限種別</label>
                    <div className="mt-2.5 flex space-x-4">
                      <label className="flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value="FACTORY_ADMIN"
                          checked={selectedRole === 'FACTORY_ADMIN'}
                          onChange={() => {
                            setSelectedRole('FACTORY_ADMIN');
                            setSelectedContractorId('');
                          }}
                          className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                        />
                        工場側管理者
                      </label>
                      <label className="flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value="CONTRACTOR_MANAGER"
                          checked={selectedRole === 'CONTRACTOR_MANAGER'}
                          onChange={() => setSelectedRole('CONTRACTOR_MANAGER')}
                          className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                        />
                        外注先管理者
                      </label>
                    </div>
                  </div>

                  {selectedRole === 'CONTRACTOR_MANAGER' && (
                    <div className="transition-all duration-200">
                      <label htmlFor="contractor" className="block text-sm font-semibold text-slate-700">
                        所属外注先企業
                      </label>
                      <div className="mt-1">
                        <select
                          id="contractor"
                          name="contractor"
                          value={selectedContractorId}
                          onChange={(e) => setSelectedContractorId(e.target.value)}
                          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 bg-white border"
                        >
                          <option value="">-- 企業を選択してください --</option>
                          {contractorsList.map((c) => (
                            <option key={c.contractor_id} value={c.contractor_id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.selectedContractorId && (
                        <p className="mt-1.5 text-xs text-rose-600 font-semibold">{errors.selectedContractorId}</p>
                      )}
                    </div>
                  )}

                  {formMode === 'EDIT' && (
                    <div>
                      <label htmlFor="status" className="block text-sm font-semibold text-slate-700">
                        ステータス
                      </label>
                      <div className="mt-1">
                        <select
                          id="status"
                          name="status"
                          value={userStatus}
                          onChange={(e) => setUserStatus(e.target.value as any)}
                          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 bg-white border"
                        >
                          <option value="ACTIVE">有効</option>
                          <option value="LOCKED">ロック</option>
                          <option value="DISABLED">無効</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
                    >
                      保存
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="confirm-modal-title" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={() => setDeleteTargetId(null)}
            ></div>

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6 sm:align-middle">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 sm:mx-0 sm:h-10 sm:w-10">
                  <span className="text-rose-600 font-bold text-lg">!</span>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg font-bold leading-6 text-slate-900" id="confirm-modal-title">
                    ユーザーアカウント無効化
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-slate-500">
                      本当にこのユーザーアカウントを無効化してもよろしいですか？
                      無効化すると該当のアカウントはシステムへのログインができなくなります。
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(null)}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="rounded-md bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 transition-colors"
                >
                  無効化する
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