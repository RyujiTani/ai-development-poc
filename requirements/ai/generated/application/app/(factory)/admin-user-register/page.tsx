'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sessionManager, Session } from '../../../lib/auth/session';
import { useToast } from '../../../components/ui/toast';
import { logger } from '../../../lib/logger/logger';
import { IndexedDBUserRepository } from '../../../features/user/repository/userRepository';
import { GetUsersUseCase } from '../../../features/user/usecase/getUsersUseCase';
import { SaveUserUseCase } from '../../../features/user/usecase/saveUserUseCase';
import { DeleteUserUseCase } from '../../../features/user/usecase/deleteUserUseCase';
import { User, Role } from '../../../features/user/domain/user';
import { IndexedDBContractorRepository } from '../../../features/contractor/repository/contractorRepository';
import { Contractor } from '../../../features/contractor/domain/contractor';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

const userFormSchema = z.object({
  role: z.enum(['FACTORY_ADMIN', 'CONTRACTOR_MANAGER'], {
    errorMap: () => ({ message: '権限種別を選択してください。' }),
  }),
  loginId: z.string().min(1, 'ログインIDを入力してください。'),
  password: z.string().optional(),
  displayName: z.string().min(1, '表示名を入力してください。'),
  contractorId: z.string().optional(),
  status: z.enum(['ACTIVE', 'LOCKED', 'DISABLED']),
}).superRefine((data, ctx) => {
  if (data.role === 'CONTRACTOR_MANAGER' && !data.contractorId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '所属外注先企業を選択してください。',
      path: ['contractorId'],
    });
  }
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function AdminUserRegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const itemsPerPage = 10;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      role: 'FACTORY_ADMIN',
      loginId: '',
      password: '',
      displayName: '',
      contractorId: '',
      status: 'ACTIVE',
    },
  });

  const watchRole = watch('role');

  const fetchUsersAndContractors = useCallback(async () => {
    try {
      const userRepo = new IndexedDBUserRepository();
      const getUsersUseCase = new GetUsersUseCase(userRepo);
      const userResult = await getUsersUseCase.execute();

      const contractorRepo = new IndexedDBContractorRepository();
      const contractorList = await contractorRepo.findAll();

      if (userResult.success) {
        setUsers(userResult.value);
      } else {
        showToast(userResult.error.message, 'error');
      }

      setContractors(contractorList.filter(c => c.status === 'ACTIVE'));
    } catch (err) {
      logger.error('failed_to_fetch_users_or_contractors', err);
      showToast('データの取得に失敗しました。', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 1. 認証認可ガード
  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'FACTORY_ADMIN') {
      logger.warn('unauthorized_access_redirect_from_admin_user_register', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.replace('/admin/login');
      return;
    }
    setSession(currentSession);
    fetchUsersAndContractors();
    logger.info('admin_user_register_page_loaded', { user_id: currentSession.user_id });
  }, [router, fetchUsersAndContractors]);

  const handleLogout = () => {
    logger.info('factory_admin_logout_from_user_register', { user_id: session?.user_id });
    sessionManager.clearSession();
    showToast('ログアウトしました。', 'info');
    router.push('/admin/login');
  };

  const handleBackToDashboard = () => {
    router.push('/admin/dashboard');
  };

  const handleOpenNewDialog = () => {
    setSelectedUser(null);
    reset({
      role: 'FACTORY_ADMIN',
      loginId: '',
      password: '',
      displayName: '',
      contractorId: '',
      status: 'ACTIVE',
    });
    setIsDialogOpen(true);
    logger.info('open_new_user_dialog');
  };

  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user);
    reset({
      role: user.role,
      loginId: user.login_id,
      password: '',
      displayName: user.display_name,
      contractorId: user.contractor_id || '',
      status: user.status as 'ACTIVE' | 'LOCKED' | 'DISABLED',
    });
    setIsDialogOpen(true);
    logger.info('open_edit_user_dialog', { target_user_id: user.user_id });
  };

  const handleSave = async (data: UserFormValues) => {
    if (!selectedUser && (!data.password || !data.password.trim())) {
      showToast('新規登録時はパスワードを入力してください。', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const userRepo = new IndexedDBUserRepository();
      const saveUserUseCase = new SaveUserUseCase(userRepo);

      const result = await saveUserUseCase.execute({
        userId: selectedUser?.user_id,
        contractorId: data.role === 'FACTORY_ADMIN' ? null : (data.contractorId || null),
        role: data.role,
        loginId: data.loginId,
        password: data.password || undefined,
        displayName: data.displayName,
        status: data.status,
      });

      if (result.success) {
        showToast(
          selectedUser ? 'ユーザー情報を更新しました。' : '新しいユーザーを登録しました。',
          'success'
        );
        setIsDialogOpen(false);
        fetchUsersAndContractors();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      logger.error('failed_to_save_user', err);
      showToast('ユーザー情報の保存に失敗しました。', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (userId: string) => {
    if (session && userId === session.user_id) {
      showToast('現在ログイン中のアカウントは削除できません。', 'error');
      return;
    }
    setDeleteConfirmId(userId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      const userRepo = new IndexedDBUserRepository();
      const deleteUserUseCase = new DeleteUserUseCase(userRepo);
      const result = await deleteUserUseCase.execute(deleteConfirmId, session?.user_id);

      if (result.success) {
        showToast('ユーザーアカウントを削除しました。', 'success');
        setDeleteConfirmId(null);
        fetchUsersAndContractors();
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      logger.error('failed_to_delete_user', err);
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

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const displayedUsers = users.slice(
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
              <span className="text-sm font-bold text-gray-900 sm:text-base">管理者ユーザー登録</span>
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

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {/* 上部操作エリア */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">管理者ユーザー一覧</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              システムを利用する工場管理者および外注先管理者のアカウント管理を行います。
            </p>
          </div>
          <button
            id="new-user-button"
            onClick={handleOpenNewDialog}
            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm self-start sm:self-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            新規登録
          </button>
        </div>

        {/* ユーザーリスト/テーブル */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          {users.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <p className="text-gray-500 font-bold text-base">登録されているユーザーがいません。</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-sm font-bold text-gray-700">表示名</th>
                    <th className="p-4 text-sm font-bold text-gray-700">ログインID</th>
                    <th className="p-4 text-sm font-bold text-gray-700">権限</th>
                    <th className="p-4 text-sm font-bold text-gray-700">所属企業</th>
                    <th className="p-4 text-sm font-bold text-gray-700">ステータス</th>
                    <th className="p-4 text-sm font-bold text-gray-700 text-center w-48">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedUsers.map((user) => {
                    const contractor = contractors.find(c => c.contractor_id === user.contractor_id);
                    return (
                      <tr key={user.user_id} className="hover:bg-gray-50/50 transition">
                        <td className="p-4 text-sm font-bold text-gray-900">{user.display_name}</td>
                        <td className="p-4 text-sm text-gray-600">{user.login_id}</td>
                        <td className="p-4 text-sm">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            user.role === 'FACTORY_ADMIN'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-teal-50 text-teal-700 border-teal-200'
                          }`}>
                            {user.role === 'FACTORY_ADMIN' ? '工場管理者' : '外注先管理者'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {user.role === 'FACTORY_ADMIN' ? '工場（全体）' : (contractor?.name || '不明な外注先')}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${
                            user.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {user.status === 'ACTIVE' ? '有効' : user.status === 'LOCKED' ? 'ロック' : '無効'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 min-h-[44px]">
                            <button
                              onClick={() => handleOpenEditDialog(user)}
                              className="h-10 px-3 border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold transition flex items-center justify-center min-w-[64px] cursor-pointer"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteClick(user.user_id)}
                              disabled={session && user.user_id === session.user_id}
                              className="h-10 px-3 border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 rounded-lg text-xs font-bold transition flex items-center justify-center min-w-[64px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              削除
                            </button>
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
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between mt-auto">
              <span className="text-xs sm:text-sm text-gray-500 font-medium">
                全 {users.length} 件中 {(currentPage - 1) * itemsPerPage + 1}〜
                {Math.min(users.length, currentPage * itemsPerPage)} 件表示
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
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedUser ? '管理者ユーザーの編集' : '管理者ユーザーの新規登録'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">システム管理者のアカウント情報を管理します。</p>
            </div>

            <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
              {/* 表示名 */}
              <div>
                <Input
                  id="displayName"
                  type="text"
                  label="表示名 (お名前)"
                  placeholder="例: 田中 太郎"
                  disabled={submitting}
                  error={errors.displayName?.message}
                  className="h-12 text-sm"
                  {...register('displayName')}
                />
              </div>

              {/* ログインID */}
              <div>
                <Input
                  id="loginId"
                  type="text"
                  label="ログインID"
                  placeholder="例: tanaka_admin"
                  disabled={submitting}
                  error={errors.loginId?.message}
                  className="h-12 text-sm"
                  {...register('loginId')}
                />
              </div>

              {/* パスワード */}
              <div>
                <Input
                  id="password"
                  type="password"
                  label={selectedUser ? '新しいパスワード (変更する場合のみ入力)' : 'パスワード'}
                  placeholder="••••••••"
                  disabled={submitting}
                  error={errors.password?.message}
                  className="h-12 text-sm"
                  {...register('password')}
                />
              </div>

              {/* 権限種別 */}
              <div>
                <span className="block text-sm font-bold text-gray-700 mb-2">権限種別</span>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center justify-center h-12 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition px-3 gap-2 font-bold text-gray-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:text-indigo-900 text-sm">
                    <input
                      type="radio"
                      value="FACTORY_ADMIN"
                      disabled={submitting}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      {...register('role')}
                    />
                    工場側管理者
                  </label>
                  <label className="flex-1 flex items-center justify-center h-12 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition px-3 gap-2 font-bold text-gray-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:text-indigo-900 text-sm">
                    <input
                      type="radio"
                      value="CONTRACTOR_MANAGER"
                      disabled={submitting}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      {...register('role')}
                    />
                    外注先管理者
                  </label>
                </div>
              </div>

              {/* 所属外注先企業プルダウン */}
              {watchRole === 'CONTRACTOR_MANAGER' && (
                <div id="contractor-select-container">
                  <label htmlFor="contractorId" className="block text-sm font-bold text-gray-700 mb-1.5">
                    所属外注先企業 <span className="text-red-500 text-xs font-normal">(必須)</span>
                  </label>
                  <select
                    id="contractorId"
                    disabled={submitting}
                    className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 text-sm focus:outline-none transition duration-150 ease-in-out cursor-pointer disabled:bg-gray-100"
                    {...register('contractorId')}
                  >
                    <option value="">所属外注先企業を選択してください</option>
                    {contractors.map((c) => (
                      <option key={c.contractor_id} value={c.contractor_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.contractorId && (
                    <p className="mt-1.5 text-sm text-red-600">{errors.contractorId.message}</p>
                  )}
                </div>
              )}

              {/* ステータス */}
              {selectedUser && (
                <div>
                  <span className="block text-sm font-bold text-gray-700 mb-2">ステータス</span>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center h-12 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition px-2 gap-1 font-bold text-gray-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:text-indigo-900 text-xs">
                      <input
                        type="radio"
                        value="ACTIVE"
                        disabled={submitting}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                        {...register('status')}
                      />
                      有効
                    </label>
                    <label className="flex-1 flex items-center justify-center h-12 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition px-2 gap-1 font-bold text-gray-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:text-indigo-900 text-xs">
                      <input
                        type="radio"
                        value="LOCKED"
                        disabled={submitting}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                        {...register('status')}
                      />
                      ロック
                    </label>
                    <label className="flex-1 flex items-center justify-center h-12 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition px-2 gap-1 font-bold text-gray-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:text-indigo-900 text-xs">
                      <input
                        type="radio"
                        value="DISABLED"
                        disabled={submitting}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                        {...register('status')}
                      />
                      無効
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
              <h3 className="text-lg font-bold text-gray-900">ユーザーアカウントの削除確認</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                本当にこのユーザーを削除しますか？この操作を実行すると、一覧に表示されなくなります。
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