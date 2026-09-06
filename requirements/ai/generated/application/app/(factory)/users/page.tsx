'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { initDB } from '@/lib/db/indexedDB';
import { User, Contractor } from '@/features/attendance/domain/types';
import { userRepository } from '@/features/user/repository/userRepository';
import { attendanceRepository } from '@/features/attendance/repository/attendanceRepository';
import { logger } from '@/lib/logger';

const createUserSchema = (isEdit: boolean) =>
  z
    .object({
      user_id: z
        .string()
        .trim()
        .min(1, { message: 'ユーザーIDは必須入力です' })
        .regex(/^[a-zA-Z0-9_-]+$/, { message: '半角英数字、ハイフン、アンダースコアのみ使用できます' }),
      login_id: z.string().trim().min(1, { message: 'ログインIDは必須入力です' }),
      password: isEdit
        ? z.string().optional()
        : z.string().min(1, { message: 'パスワードは必須入力です' }),
      display_name: z.string().trim().min(1, { message: '表示名は必須入力です' }),
      role: z.enum(['FACTORY_ADMIN', 'CONTRACTOR_MANAGER'], {
        errorMap: () => ({ message: '権限種別を選択してください' }),
      }),
      contractor_id: z.string().nullable(),
      status: z.enum(['ACTIVE', 'LOCKED', 'DISABLED']),
    })
    .superRefine((data, ctx) => {
      if (data.role === 'CONTRACTOR_MANAGER' && !data.contractor_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '外注先管理者の場合、所属外注先企業は必須です',
          path: ['contractor_id'],
        });
      }
    });

type UserFormValues = z.infer<ReturnType<typeof createUserSchema>>;

export default function AdminUsersPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState<Array<User & { contractor_name?: string }>>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ログイン中の管理者情報
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // モーダル・ダイアログ制御
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const schema = createUserSchema(!!editingUser);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    getValues,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      user_id: '',
      login_id: '',
      password: '',
      display_name: '',
      role: 'FACTORY_ADMIN',
      contractor_id: null,
      status: 'ACTIVE',
    },
  });

  const selectedRole = watch('role');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 認証および権限確認
  useEffect(() => {
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    const userId = sessionStorage.getItem('user_id');
    const role = sessionStorage.getItem('role');

    if (!userId || role !== 'FACTORY_ADMIN') {
      logger.warn('UNAUTHORIZED_ACCESS_ATTEMPT_USERS', { userId, role });
      router.push('/admin-login');
    } else {
      setIsAuthenticated(true);
      setCurrentUserId(userId);
      loadInitialData();
    }
  }, [router]);

  // ロール切り替え時の所属企業制御
  useEffect(() => {
    if (selectedRole === 'FACTORY_ADMIN' && getValues('contractor_id') !== null) {
      setValue('contractor_id', null);
    }
  }, [selectedRole, setValue, getValues]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const userList = await userRepository.getAllUsers();
      setUsers(userList);

      const activeContractors = await attendanceRepository.getActiveContractors();
      setContractors(activeContractors);
    } catch (err) {
      logger.error('LOAD_USERS_PAGE_DATA_FAILED', { error: String(err) });
      setError('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    reset({
      user_id: '',
      login_id: '',
      password: '',
      display_name: '',
      role: 'FACTORY_ADMIN',
      contractor_id: null,
      status: 'ACTIVE',
    });
    setModalOpen(true);
    logger.info('ADD_USER_MODAL_OPENED');
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    reset({
      user_id: user.user_id,
      login_id: user.login_id,
      password: '', // パスワードは空の状態で開始
      display_name: user.display_name,
      role: user.role,
      contractor_id: user.contractor_id,
      status: user.status,
    });
    setModalOpen(true);
    logger.info('EDIT_USER_MODAL_OPENED', { targetUserId: user.user_id });
  };

  const onSubmit = async (data: UserFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (editingUser) {
        logger.info('UPDATE_USER_START', { targetUserId: editingUser.user_id });
        const result = await userRepository.updateUser(editingUser.user_id, {
          login_id: data.login_id,
          password_hash: data.password ? data.password : undefined, // 入力があった場合のみ更新
          display_name: data.display_name,
          role: data.role,
          contractor_id: data.contractor_id,
          status: data.status,
        });

        if (result.success) {
          logger.info('UPDATE_USER_SUCCESS', { targetUserId: editingUser.user_id });
          showToast('ユーザー情報を更新しました');
          setModalOpen(false);
          await loadInitialData();
        } else {
          setError(result.error || '更新処理に失敗しました');
        }
      } else {
        logger.info('CREATE_USER_START', { newUserId: data.user_id });
        const result = await userRepository.createUser({
          user_id: data.user_id,
          login_id: data.login_id,
          password_hash: data.password || '',
          display_name: data.display_name,
          role: data.role,
          contractor_id: data.contractor_id,
        });

        if (result.success) {
          logger.info('CREATE_USER_SUCCESS', { newUserId: data.user_id });
          showToast('新規ユーザーを登録しました');
          setModalOpen(false);
          await loadInitialData();
        } else {
          setError(result.error || '登録処理に失敗しました');
        }
      }
    } catch (err) {
      logger.error('SAVE_USER_FAILED', { error: String(err) });
      setError('保存に失敗しました。再試行してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (targetUserId: string, displayName: string) => {
    if (targetUserId === currentUserId) {
      alert('現在ログイン中の自分自身のアカウントを削除することはできません。');
      return;
    }

    const confirmed = window.confirm(`本当にこのユーザーを削除しますか？\n表示名: ${displayName}`);
    if (!confirmed) {
      logger.info('DELETE_USER_CANCELLED', { targetUserId });
      return;
    }

    try {
      logger.info('DELETE_USER_START', { targetUserId });
      await userRepository.deleteUser(targetUserId);
      logger.info('DELETE_USER_SUCCESS', { targetUserId });
      showToast('ユーザーを削除しました');
      await loadInitialData();

      // ページインデックス調整
      const newTotalPages = Math.ceil((users.length - 1) / itemsPerPage);
      if (currentPage > newTotalPages && currentPage > 1) {
        setCurrentPage(newTotalPages);
      }
    } catch (err) {
      logger.error('DELETE_USER_FAILED', { targetUserId, error: String(err) });
      setError('削除に失敗しました');
    }
  };

  // ページネーション計算
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(users.length / itemsPerPage);

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
      {/* トースト通知 */}
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
            <h1 className="text-xl font-bold text-gray-900">管理者ユーザー登録</h1>
            <p className="text-sm text-gray-600 mt-1">システムを利用する工場側・外注先の管理者アカウント管理</p>
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

      {/* メイン */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6 md:py-8 flex flex-col space-y-6">
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg font-bold"
            data-testid="error-message"
          >
            {error}
          </div>
        )}

        {/* 件数表示および新規追加 */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow">
          <span className="text-sm font-medium text-gray-500">
            登録アカウント数: <span className="font-bold text-gray-900">{users.length}件</span>
          </span>
          <button
            onClick={handleOpenAddModal}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors flex items-center gap-1 shadow-sm animate-fade-in"
            style={{ minHeight: '44px' }}
            data-testid="add-user-btn"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新規登録
          </button>
        </div>

        {/* ユーザー一覧リスト / テーブル */}
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
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                      >
                        ユーザーID
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                      >
                        ログインID
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                      >
                        表示名
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                      >
                        権限種別
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                      >
                        所属外注先企業
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                      >
                        ステータス
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">操作</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200" data-testid="users-tbody">
                    {currentUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-gray-500 font-medium">
                          登録されている管理者ユーザーはいません。
                        </td>
                      </tr>
                    ) : (
                      currentUsers.map((user) => (
                        <tr key={user.user_id} className="hover:bg-gray-50" data-testid="user-row">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono font-bold">
                            {user.user_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {user.login_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            {user.display_name}
                            {user.user_id === currentUserId && (
                              <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                ログイン中
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.role === 'FACTORY_ADMIN' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                工場側管理者
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                                外注先管理者
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.contractor_name || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                user.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800'
                                  : user.status === 'LOCKED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {user.status === 'ACTIVE' ? '有効' : user.status === 'LOCKED' ? 'ロック' : '無効'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => handleOpenEditModal(user)}
                                className="text-blue-600 hover:text-blue-900 font-semibold px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
                                style={{ minHeight: '44px' }}
                                data-testid={`edit-btn-${user.user_id}`}
                              >
                                編集
                              </button>
                              <button
                                onClick={() => handleDelete(user.user_id, user.display_name)}
                                disabled={user.user_id === currentUserId}
                                className={`font-semibold px-3 py-1.5 rounded transition-colors ${
                                  user.user_id === currentUserId
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                                }`}
                                style={{ minHeight: '44px' }}
                                data-testid={`delete-btn-${user.user_id}`}
                                title={user.user_id === currentUserId ? 'ログイン中の自身のアカウントは削除できません' : ''}
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

              {/* モバイル向けカード表示 */}
              <div className="md:hidden divide-y divide-gray-200" data-testid="users-cards">
                {currentUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    登録されている管理者ユーザーはいません。
                  </div>
                ) : (
                  currentUsers.map((user) => (
                    <div
                      key={user.user_id}
                      className="p-4 space-y-3 font-sans"
                      data-testid={`mobile-card-${user.user_id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">
                            {user.display_name}
                            {user.user_id === currentUserId && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                自身
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">ID: {user.user_id}</p>
                          <p className="text-xs text-gray-500 font-mono">ログインID: {user.login_id}</p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            user.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : user.status === 'LOCKED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.status === 'ACTIVE' ? '有効' : user.status === 'LOCKED' ? 'ロック' : '無効'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border">
                        <div>
                          <span className="font-bold block text-gray-500">権限種別</span>
                          <span>{user.role === 'FACTORY_ADMIN' ? '工場側管理者' : '外注先管理者'}</span>
                        </div>
                        <div>
                          <span className="font-bold block text-gray-500">所属企業</span>
                          <span>{user.contractor_name || '—'}</span>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2 justify-end border-t border-gray-100">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="flex-1 text-center py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded bg-gray-50 border"
                          style={{ minHeight: '44px' }}
                          data-testid={`mobile-edit-btn-${user.user_id}`}
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(user.user_id, user.display_name)}
                          disabled={user.user_id === currentUserId}
                          className={`flex-1 text-center py-2.5 text-sm font-bold rounded border bg-gray-50 ${
                            user.user_id === currentUserId
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          style={{ minHeight: '44px' }}
                          data-testid={`mobile-delete-btn-${user.user_id}`}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in"
          data-testid="user-modal-overlay"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* モーダルヘッダー */}
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900" data-testid="modal-title">
                {editingUser ? '管理者ユーザー情報の編集' : '管理者ユーザーの新規登録'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 text-lg"
                data-testid="modal-close-btn"
              >
                ✕
              </button>
            </div>

            {/* モーダルフォーム */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 flex-1 overflow-y-auto">
              {/* ユーザーID */}
              <div>
                <label htmlFor="modal_user_id" className="block text-sm font-bold text-gray-700 mb-1">
                  ユーザーID <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal_user_id"
                  type="text"
                  placeholder="例: user-01 (半角英数字、記号_-)"
                  disabled={isSubmitting || !!editingUser}
                  className={`block w-full rounded-md border py-3 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px] ${
                    !!editingUser ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'
                  } ${errors.user_id ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}`}
                  {...register('user_id')}
                  data-testid="user-id-input"
                />
                {errors.user_id && (
                  <p className="mt-1 text-sm text-red-600 font-bold" data-testid="user-id-error">
                    {errors.user_id.message}
                  </p>
                )}
              </div>

              {/* ログインID */}
              <div>
                <label htmlFor="modal_login_id" className="block text-sm font-bold text-gray-700 mb-1">
                  ログインID <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal_login_id"
                  type="text"
                  placeholder="例: login_admin"
                  disabled={isSubmitting}
                  className={`block w-full rounded-md border py-3 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px] ${
                    errors.login_id ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  {...register('login_id')}
                  data-testid="login-id-input"
                />
                {errors.login_id && (
                  <p className="mt-1 text-sm text-red-600 font-bold" data-testid="login-id-error">
                    {errors.login_id.message}
                  </p>
                )}
              </div>

              {/* パスワード */}
              <div>
                <label htmlFor="modal_password" className="block text-sm font-bold text-gray-700 mb-1">
                  パスワード {!editingUser && <span className="text-red-500">*</span>}
                  {editingUser && <span className="text-xs font-normal text-gray-500 ml-1.5">(変更する場合のみ入力)</span>}
                </label>
                <input
                  id="modal_password"
                  type="password"
                  placeholder={editingUser ? '変更しない場合は未入力' : 'パスワードを入力してください'}
                  disabled={isSubmitting}
                  className={`block w-full rounded-md border py-3 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px] ${
                    errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  {...register('password')}
                  data-testid="password-input"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 font-bold" data-testid="password-error">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* 表示名 */}
              <div>
                <label htmlFor="modal_display_name" className="block text-sm font-bold text-gray-700 mb-1">
                  表示名 <span className="text-red-500">*</span>
                </label>
                <input
                  id="modal_display_name"
                  type="text"
                  placeholder="例: 山田 太郎"
                  disabled={isSubmitting}
                  className={`block w-full rounded-md border py-3 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px] ${
                    errors.display_name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  {...register('display_name')}
                  data-testid="display-name-input"
                />
                {errors.display_name && (
                  <p className="mt-1 text-sm text-red-600 font-bold" data-testid="display-name-error">
                    {errors.display_name.message}
                  </p>
                )}
              </div>

              {/* 権限種別 */}
              <div>
                <span className="block text-sm font-bold text-gray-700 mb-2">
                  権限種別 <span className="text-red-500">*</span>
                </span>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer min-h-[44px]">
                    <input
                      type="radio"
                      value="FACTORY_ADMIN"
                      disabled={isSubmitting}
                      className="h-5 w-5 border-gray-300 text-blue-600 focus:ring-blue-500"
                      {...register('role')}
                      data-testid="role-factory-radio"
                    />
                    <span className="ml-3 text-sm text-gray-900 font-bold">工場側管理者</span>
                  </label>
                  <label className="flex-1 flex items-center p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer min-h-[44px]">
                    <input
                      type="radio"
                      value="CONTRACTOR_MANAGER"
                      disabled={isSubmitting}
                      className="h-5 w-5 border-gray-300 text-blue-600 focus:ring-blue-500"
                      {...register('role')}
                      data-testid="role-contractor-radio"
                    />
                    <span className="ml-3 text-sm text-gray-900 font-bold">外注先管理者</span>
                  </label>
                </div>
              </div>

              {/* 所属外注先企業選択 */}
              {selectedRole === 'CONTRACTOR_MANAGER' && (
                <div className="animate-fade-in">
                  <label htmlFor="modal_contractor_id" className="block text-sm font-bold text-gray-700 mb-1">
                    所属外注先企業 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="modal_contractor_id"
                    disabled={isSubmitting}
                    className={`block w-full rounded-md border py-3 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px] bg-white ${
                      errors.contractor_id ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                    {...register('contractor_id')}
                    data-testid="contractor-select"
                  >
                    <option value="">所属する企業を選択してください</option>
                    {contractors.map((c) => (
                      <option key={c.contractor_id} value={c.contractor_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.contractor_id && (
                    <p className="mt-1 text-sm text-red-600 font-bold" data-testid="contractor-error">
                      {errors.contractor_id.message}
                    </p>
                  )}
                </div>
              )}

              {/* ステータス (編集時のみ表示) */}
              {editingUser && (
                <div>
                  <label htmlFor="modal_status" className="block text-sm font-bold text-gray-700 mb-1">
                    ステータス
                  </label>
                  <select
                    id="modal_status"
                    disabled={isSubmitting}
                    className="block w-full rounded-md border border-gray-300 py-3 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px] bg-white"
                    {...register('status')}
                    data-testid="status-select"
                  >
                    <option value="ACTIVE">有効 (ACTIVE)</option>
                    <option value="LOCKED">ロック (LOCKED)</option>
                    <option value="DISABLED">無効 (DISABLED)</option>
                  </select>
                </div>
              )}

              {/* アクションボタン */}
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