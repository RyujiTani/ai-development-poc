"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAdminUsersUseCase } from "@/features/user/usecase/getAdminUsersUseCase";
import { saveAdminUserUseCase } from "@/features/user/usecase/saveAdminUserUseCase";
import { deleteAdminUserUseCase } from "@/features/user/usecase/deleteAdminUserUseCase";
import { getContractorsUseCase, ContractorDto } from "@/features/attendance/usecase/getContractorsUseCase";
import { User } from "@/features/user/domain/User";
import { logger } from "@/lib/logger/logger";

// バリデーションスキーマの定義 (SCR-015-VL-001, 002, 003, 004)
const userSchema = z.object({
  mode: z.enum(["CREATE", "EDIT"]),
  loginId: z
    .string()
    .trim()
    .min(1, { message: "ユーザーIDを入力してください。" }),
  displayName: z
    .string()
    .trim()
    .min(1, { message: "表示名を入力してください。" }),
  password: z.string().optional(),
  role: z.enum(["FACTORY_ADMIN", "CONTRACTOR_MANAGER"], {
    required_error: "権限種別を選択してください。",
  }),
  contractorId: z.string().optional(),
  status: z.enum(["ACTIVE", "LOCKED", "DISABLED"]),
}).superRefine((data, ctx) => {
  // 新規登録時のパスワードは必須 (SCR-015-VL-002)
  if (data.mode === "CREATE" && (!data.password || data.password.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "パスワードを入力してください。",
      path: ["password"],
    });
  }

  // 外注先管理者の場合は所属企業が必須 (SCR-015-VL-004)
  if (data.role === "CONTRACTOR_MANAGER" && (!data.contractorId || data.contractorId === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "所属外注先企業を選択してください。",
      path: ["contractorId"],
    });
  }
});

type UserFormValues = z.infer<typeof userSchema>;

export default function AdminUserRegisterPage() {
  const router = useRouter();
  const [currentActorId, setCurrentActorId] = useState<string>("");
  const [actorName] = useState<string>("管理者");

  // State管理 (SCR-015-ST-001, 002, 003, 004)
  const [usersList, setUsersList] = useState<User[]>([]);
  const [contractors, setContractors] = useState<ContractorDto[]>([]);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ページネーション用状態 (SCR-015-UI-005)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      mode: "CREATE",
      loginId: "",
      displayName: "",
      password: "",
      role: "FACTORY_ADMIN",
      contractorId: "",
      status: "ACTIVE",
    },
  });

  const watchRole = watch("role");
  const watchMode = watch("mode");

  // 1. 認証ガード & 権限チェック & 初期データ取得 (SCR-015-VL-006, AC-015-009)
  useEffect(() => {
    const userId = sessionStorage.getItem("user_id");
    const role = sessionStorage.getItem("role");

    if (!userId || !role || role !== "FACTORY_ADMIN") {
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("role");
      router.replace("/admin-login");
      return;
    }

    setCurrentActorId(userId);
    loadInitialData();
  }, [router]);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // ユーザー一覧取得 (SCR-015-DT-001)
      const usersResult = await getAdminUsersUseCase();
      if (usersResult.success) {
        setUsersList(usersResult.value);
      } else {
        setError("error" in usersResult ? usersResult.error.message : "ユーザー一覧の取得に失敗しました。");
      }

      // プルダウン用外注先企業一覧取得 (SCR-015-DT-005)
      const contractorsResult = await getContractorsUseCase();
      if (contractorsResult.success) {
        setContractors(contractorsResult.value);
      }
    } catch (err) {
      setError("データの読み込み中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. モーダル起動処理 (SCR-015-EV-001, SCR-015-EV-003)
  const handleOpenCreate = () => {
    setFormMode("CREATE");
    setSelectedUser(null);
    reset({
      mode: "CREATE",
      loginId: "",
      displayName: "",
      password: "",
      role: "FACTORY_ADMIN",
      contractorId: "",
      status: "ACTIVE",
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setFormMode("EDIT");
    setSelectedUser(user);
    reset({
      mode: "EDIT",
      loginId: user.login_id,
      displayName: user.display_name,
      password: "", // 編集時は空でもパスワード更新しない想定
      role: user.role,
      contractorId: user.contractor_id || "",
      status: user.status,
    });
    setIsFormOpen(true);
  };

  // 3. 保存・バリデーション通過時の処理 (SCR-015-EV-002, SCR-015-DT-002, SCR-015-DT-003)
  const onSubmit = async (data: UserFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await saveAdminUserUseCase({
        userId: formMode === "EDIT" ? selectedUser?.user_id : undefined,
        contractorId: data.role === "CONTRACTOR_MANAGER" ? (data.contractorId || null) : null,
        role: data.role,
        loginId: data.loginId,
        passwordPlain: data.password && data.password.trim() !== "" ? data.password : undefined,
        displayName: data.displayName,
        status: data.status,
        actorUserId: currentActorId,
      });

      if (result.success) {
        showToast(formMode === "EDIT" ? "ユーザー情報を更新しました。" : "ユーザーアカウントを登録しました。");
        setIsFormOpen(false);
        // 一覧を再取得
        const reloadResult = await getAdminUsersUseCase();
        if (reloadResult.success) {
          setUsersList(reloadResult.value);
        }
      } else {
        if ("error" in result) {
          // 重複エラーなどの場合、モーダル表示中にエラーを出す
          setError(result.error.message);
        } else {
          setError("保存処理に失敗しました。");
        }
      }
    } catch (err) {
      setError("保存処理中にシステムエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. アカウント削除（無効化）処理 (SCR-015-EV-004, SCR-015-VL-005, SCR-015-DT-004)
  const handleDelete = async (targetUserId: string, targetLoginId: string) => {
    // 削除確認ダイアログ表示 (SCR-015-VL-005)
    const confirmed = window.confirm(`ユーザー「${targetLoginId}」のアカウントを本当に削除しますか？`);
    if (!confirmed) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await deleteAdminUserUseCase(targetUserId, currentActorId);
      if (result.success) {
        showToast("ユーザーを削除しました。");
        // 一覧を再取得
        const reloadResult = await getAdminUsersUseCase();
        if (reloadResult.success) {
          setUsersList(reloadResult.value);
          // 削除によりページネーションのページ数が変わる場合の調整
          const maxPage = Math.ceil(reloadResult.value.length / itemsPerPage);
          if (currentPage > maxPage && maxPage > 0) {
            setCurrentPage(maxPage);
          }
        }
      } else {
        if ("error" in result) {
          alert(result.error.message);
        } else {
          alert("削除処理に失敗しました。");
        }
      }
    } catch (err) {
      setError("削除処理中にシステムエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("role");
    logger.info("ADMIN_LOGOUT");
    router.push("/admin-login");
  };

  // 5. ページネーション計算 (SCR-015-UI-005)
  const totalPages = Math.ceil(usersList.length / itemsPerPage);
  const displayedUsers = usersList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* 簡易トースト表示 */}
      {toastMessage && (
        <div
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-emerald-600 px-4 py-3 text-white shadow-md font-bold"
          role="alert"
          data-testid="toast-message"
        >
          ✓ {toastMessage}
        </div>
      )}

      {/* ナビゲーションサイドバー (dashboard/page.tsx と一貫) */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-slate-950 text-slate-100 border-r border-slate-800">
        <div className="p-6">
          <h2 className="text-lg font-bold tracking-wider">工場側管理画面</h2>
          <p className="text-xs text-slate-400 mt-1">勤怠・配置管理</p>
        </div>
        <nav className="flex-1 px-4 space-y-1 py-4">
          <a
            href="/dashboard"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            data-testid="nav-dashboard"
          >
            📊 ダッシュボード
          </a>
          <a
            href="/attendance-history"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            data-testid="nav-attendance-history"
          >
            📅 打刻履歴確認
          </a>
          <a
            href="/labor-time-summary"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            data-testid="nav-labor-summary"
          >
            ⏱️ 労働時間集計
          </a>
          <a
            href="/contractors"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            data-testid="nav-contractors"
          >
            🏢 外注先企業登録
          </a>
          <a
            href="/users"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg bg-blue-600 text-white"
            data-testid="nav-users"
          >
            👤 管理者ユーザー登録
          </a>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white transition-colors border border-slate-800"
            data-testid="logout-button-sidebar"
          >
            🚪 ログアウト
          </button>
        </div>
      </aside>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-xl font-bold text-gray-900">管理者ユーザー登録</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700" data-testid="user-display-name">
                {actorName} 様
              </span>
              <button
                onClick={handleLogout}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 md:hidden"
                data-testid="logout-button-header"
              >
                ログアウト
              </button>
              <button
                onClick={handleLogout}
                className="hidden md:block text-xs font-medium text-red-600 hover:text-red-700 font-bold"
                data-testid="logout-button"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>

        {/* モバイル用簡易ナビゲーション (レスポンシブ) */}
        <div className="md:hidden bg-slate-950 p-2 flex overflow-x-auto gap-2 border-b border-slate-800">
          <a
            href="/dashboard"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded text-slate-300 bg-slate-900 hover:text-white"
          >
            📊 ダッシュボード
          </a>
          <a
            href="/attendance-history"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded text-slate-300 bg-slate-900 hover:text-white"
          >
            📅 履歴確認
          </a>
          <a
            href="/labor-time-summary"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded text-slate-300 bg-slate-900 hover:text-white"
          >
            ⏱️ 時間集計
          </a>
          <a
            href="/contractors"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded text-slate-300 bg-slate-900 hover:text-white"
          >
            🏢 企業登録
          </a>
          <a
            href="/users"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white"
          >
            👤 ユーザー登録
          </a>
        </div>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && !isFormOpen && (
            <div className="rounded bg-red-50 p-4 text-sm text-red-600 border border-red-200 font-medium" role="alert" data-testid="error-message">
              ⚠️ {error}
            </div>
          )}

          {/* 新規登録ボタンエリア (SCR-015-UI-002) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">工場側管理者および外注先管理者のユーザーアカウント登録・編集・削除を行います。</p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-base font-bold text-white shadow-md active:scale-95 hover:bg-emerald-700 focus:outline-none h-12 min-w-[120px]"
              data-testid="add-user-button"
            >
              ＋ 新規登録
            </button>
          </div>

          {/* リスト・テーブル表示 (SCR-015-UI-001, SCR-015-UI-006) */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {isLoading && usersList.length === 0 ? (
              <div className="p-8 text-center" data-testid="loading-indicator">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
                <p className="text-gray-500 text-sm mt-3 font-medium">ユーザーリストを取得中...</p>
              </div>
            ) : usersList.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-medium" data-testid="empty-state">
                登録されているユーザーはいません。
              </div>
            ) : (
              <>
                {/* 1. PC向けテーブル表示 (SCR-015-UI-001) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ユーザーID (ログインID)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">表示名</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">役割 (権限種別)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">所属外注先企業</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">状態</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">アクション</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200" data-testid="user-table-body">
                      {displayedUsers.map((userItem) => {
                        const matchedContractor = contractors.find(
                          (c) => c.contractor_id === userItem.contractor_id
                        );
                        return (
                          <tr key={userItem.user_id} data-testid={`user-row-${userItem.user_id}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 font-mono" data-testid={`user-login-id-${userItem.user_id}`}>
                              {userItem.login_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" data-testid={`user-display-name-${userItem.user_id}`}>
                              {userItem.display_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" data-testid={`user-role-${userItem.user_id}`}>
                              {userItem.role === "FACTORY_ADMIN" ? (
                                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">工場側管理者</span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">外注先管理者</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600" data-testid={`user-contractor-${userItem.user_id}`}>
                              {userItem.role === "CONTRACTOR_MANAGER" ? (matchedContractor ? matchedContractor.name : "不明な所属先") : "---"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" data-testid={`user-status-${userItem.user_id}`}>
                              {userItem.status === "ACTIVE" ? (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">有効</span>
                              ) : userItem.status === "LOCKED" ? (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">ロック</span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-800">無効</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                              <button
                                onClick={() => handleOpenEdit(userItem)}
                                className="text-blue-600 hover:text-blue-900 font-bold"
                                data-testid={`edit-button-${userItem.user_id}`}
                              >
                                編集
                              </button>
                              <button
                                onClick={() => handleDelete(userItem.user_id, userItem.login_id)}
                                disabled={userItem.user_id === currentActorId}
                                className={`font-bold ${
                                  userItem.user_id === currentActorId
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-red-600 hover:text-red-900"
                                }`}
                                data-testid={`delete-button-${userItem.user_id}`}
                              >
                                削除
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 2. モバイル向けカード表示 (SCR-015-UI-006) */}
                <div className="md:hidden divide-y divide-gray-200">
                  {displayedUsers.map((userItem) => {
                    const matchedContractor = contractors.find(
                      (c) => c.contractor_id === userItem.contractor_id
                    );
                    return (
                      <div key={userItem.user_id} className="p-4 space-y-3 bg-white" data-testid={`user-card-${userItem.user_id}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-base font-bold text-gray-900" data-testid={`mobile-user-login-id-${userItem.user_id}`}>
                              {userItem.login_id}
                            </p>
                            <p className="text-xs text-gray-500">表示名: {userItem.display_name}</p>
                          </div>
                          {userItem.status === "ACTIVE" ? (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">有効</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-800">ロック/無効</span>
                          )}
                        </div>

                        <div className="text-xs space-y-1 text-gray-600">
                          <p>
                            <span className="font-bold">役割:</span>{" "}
                            {userItem.role === "FACTORY_ADMIN" ? "工場側管理者" : "外注先管理者"}
                          </p>
                          {userItem.role === "CONTRACTOR_MANAGER" && (
                            <p>
                              <span className="font-bold">所属企業:</span>{" "}
                              {matchedContractor ? matchedContractor.name : "不明な所属先"}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleOpenEdit(userItem)}
                            className="flex-1 inline-flex justify-center items-center rounded border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 h-10"
                            data-testid={`mobile-edit-button-${userItem.user_id}`}
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(userItem.user_id, userItem.login_id)}
                            disabled={userItem.user_id === currentActorId}
                            className={`flex-1 inline-flex justify-center items-center rounded border px-4 py-2 text-sm font-bold text-white shadow-sm h-10 ${
                              userItem.user_id === currentActorId
                                ? "bg-gray-200 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-700"
                            }`}
                            data-testid={`mobile-delete-button-${userItem.user_id}`}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ページネーションコントロール (SCR-015-UI-005) */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-white" data-testid="pagination-controls">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-4 py-2 border border-gray-300 rounded bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed h-10 flex items-center justify-center min-w-[80px]"
                      data-testid="prev-page-button"
                    >
                      前へ
                    </button>
                    <span className="text-sm text-gray-600 font-medium" data-testid="page-info">
                      {currentPage} / {totalPages} ページ
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-4 py-2 border border-gray-300 rounded bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed h-10 flex items-center justify-center min-w-[80px]"
                      data-testid="next-page-button"
                    >
                      次へ
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      </div>

      {/* 新規登録・編集モーダルフォーム (SCR-015-UI-004) */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          role="dialog"
          aria-modal="true"
          data-testid="user-modal"
        >
          <div
            className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b pb-4">
              <h2 className="text-lg font-bold text-gray-900" data-testid="modal-title">
                {formMode === "CREATE" ? "管理者ユーザーの新規登録" : "管理者ユーザー情報の編集"}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                システムユーザーアカウントの権限およびログイン情報を設定してください。
              </p>
            </div>

            {/* モーダル内部でのバリデーションや重複エラー用メッセージ */}
            {error && (
              <div className="rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200 font-medium" role="alert" data-testid="modal-error-message">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* 隠しフィールドモード */}
              <input type="hidden" {...register("mode")} />

              {/* ユーザーID (login_id) */}
              <div>
                <label htmlFor="loginId" className="block text-sm font-bold text-gray-700 mb-1">
                  ユーザーID (ログインID) <span className="text-red-500 text-xs">*必須</span>
                </label>
                <input
                  id="loginId"
                  type="text"
                  placeholder="例: main_contractor_manager"
                  disabled={isLoading || formMode === "EDIT"}
                  {...register("loginId")}
                  className={`block w-full rounded border px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 bg-white ${
                    formMode === "EDIT" ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""
                  } ${errors.loginId ? "border-red-500" : "border-gray-300"}`}
                  data-testid="user-login-id-input"
                />
                {errors.loginId && (
                  <p className="mt-1 text-sm text-red-600" data-testid="user-login-id-error">
                    {errors.loginId.message}
                  </p>
                )}
              </div>

              {/* 表示名 */}
              <div>
                <label htmlFor="displayName" className="block text-sm font-bold text-gray-700 mb-1">
                  表示名 (名前) <span className="text-red-500 text-xs">*必須</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  placeholder="例: 山田 太郎"
                  disabled={isLoading}
                  {...register("displayName")}
                  className={`block w-full rounded border px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 bg-white ${
                    errors.displayName ? "border-red-500" : "border-gray-300"
                  }`}
                  data-testid="user-display-name-input"
                />
                {errors.displayName && (
                  <p className="mt-1 text-sm text-red-600" data-testid="user-display-name-error">
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              {/* パスワード */}
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-1">
                  パスワード{" "}
                  {formMode === "CREATE" ? (
                    <span className="text-red-500 text-xs">*必須</span>
                  ) : (
                    <span className="text-gray-400 text-xs">(変更する場合のみ入力)</span>
                  )}
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="例: password123"
                  disabled={isLoading}
                  {...register("password")}
                  className={`block w-full rounded border px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 bg-white ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                  data-testid="user-password-input"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600" data-testid="user-password-error">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* 権限種別 */}
              <div>
                <label htmlFor="role" className="block text-sm font-bold text-gray-700 mb-1">
                  役割 (権限種別) <span className="text-red-500 text-xs">*必須</span>
                </label>
                <select
                  id="role"
                  disabled={isLoading}
                  {...register("role")}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 bg-white"
                  data-testid="user-role-select"
                >
                  <option value="FACTORY_ADMIN">工場側管理者 (FACTORY_ADMIN)</option>
                  <option value="CONTRACTOR_MANAGER">外注先管理者 (CONTRACTOR_MANAGER)</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600" data-testid="user-role-error">
                    {errors.role.message}
                  </p>
                )}
              </div>

              {/* 所属外注先企業 (外注先管理者選択時のみ動的表示) (SCR-015-EV-005, AC-015-003, 008) */}
              {watchRole === "CONTRACTOR_MANAGER" && (
                <div>
                  <label htmlFor="contractorId" className="block text-sm font-bold text-gray-700 mb-1">
                    所属外注先企業 <span className="text-red-500 text-xs">*必須</span>
                  </label>
                  <select
                    id="contractorId"
                    disabled={isLoading}
                    {...register("contractorId")}
                    className={`block w-full rounded border px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 bg-white ${
                      errors.contractorId ? "border-red-500" : "border-gray-300"
                    }`}
                    data-testid="user-contractor-select"
                  >
                    <option value="">-- 外注先企業を選択してください --</option>
                    {contractors.map((c) => (
                      <option key={c.contractor_id} value={c.contractor_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.contractorId && (
                    <p className="mt-1 text-sm text-red-600" data-testid="user-contractor-error">
                      {errors.contractorId.message}
                    </p>
                  )}
                </div>
              )}

              {/* ステータス */}
              <div>
                <label htmlFor="status" className="block text-sm font-bold text-gray-700 mb-1">
                  アカウント状態
                </label>
                <select
                  id="status"
                  disabled={isLoading}
                  {...register("status")}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 bg-white"
                  data-testid="user-status-select"
                >
                  <option value="ACTIVE">有効 (ACTIVE)</option>
                  <option value="LOCKED">ロック (LOCKED)</option>
                  <option value="DISABLED">無効 (DISABLED)</option>
                </select>
              </div>

              {/* アクションボタン */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isLoading}
                  className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none h-12"
                  data-testid="cancel-button"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-md hover:bg-blue-700 focus:outline-none h-12 disabled:bg-gray-400"
                  data-testid="save-button"
                >
                  {isLoading ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}