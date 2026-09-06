"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { User } from "@/features/user/domain/types";
import { Contractor, getContractors } from "@/features/contractor/repository/contractorRepository";
import { getUsers, createUser, updateUser, deleteUser } from "@/features/user/repository/userRepository";
import UserFormModal from "@/features/user/ui/UserFormModal";

// SVG Icons
const LayoutDashboardIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="10" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const ClipboardListIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </svg>
);

const CalendarDaysIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </svg>
);

const Building2Icon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M10 9h4" />
    <path d="M10 14h4" />
    <path d="M18 9h.01" />
    <path d="M18 14h.01" />
    <path d="M10 18h4" />
    <path d="M18 18h.01" />
  </svg>
);

const UserPlus2Icon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" x2="19" y1="8" y2="14" />
    <line x1="22" x2="16" y1="11" y2="11" />
  </svg>
);

const LogOutIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const MenuIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="6" y2="18" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 3 21 3 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export default function AdminUsersPage() {
  const router = useRouter();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // States
  const [users, setUsers] = useState<User[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Auth Guard
  useEffect(() => {
    if (typeof sessionStorage !== "undefined") {
      const storedId = sessionStorage.getItem("user_id");
      const storedRole = sessionStorage.getItem("role");

      if (!storedId || storedRole !== "FACTORY_ADMIN") {
        router.push("/admin-login");
      } else {
        setIsAuthLoading(false);
      }
    }
  }, [router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const uData = await getUsers();
      uData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setUsers(uData);

      const cData = await getContractors();
      setContractors(cData.filter((c) => c.status === "ACTIVE"));
    } catch (err) {
      console.error(err);
      setErrorMessage("ユーザー情報の読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading) {
      loadData();
    }
  }, [isAuthLoading]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLogout = () => {
    logout();
    router.push("/admin-login");
  };

  const handleOpenNewModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (formData: any) => {
    try {
      if (editingUser) {
        // 既存ユーザーの編集
        await updateUser(editingUser.user_id, {
          display_name: formData.display_name,
          role: formData.role,
          contractor_id: formData.contractor_id,
          status: formData.status,
          password_raw: formData.password,
        });
        setToast({ type: "success", text: "ユーザーアカウント情報を更新しました" });
      } else {
        // 新規ユーザー登録
        await createUser({
          login_id: formData.login_id,
          password_raw: formData.password,
          display_name: formData.display_name,
          role: formData.role,
          contractor_id: formData.contractor_id,
        });
        setToast({ type: "success", text: "新規ユーザーを登録しました" });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setToast({ type: "error", text: err.message || "保存に失敗しました" });
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    // 自己アカウント削除防止
    const currentUserId = sessionStorage.getItem("user_id");
    if (targetUser.user_id === currentUserId) {
      setToast({ type: "error", text: "現在ログイン中の自分自身のアカウントは削除できません" });
      return;
    }

    const confirmed = window.confirm(`本当にユーザー「${targetUser.display_name}」を削除しますか？`);
    if (!confirmed) return;

    try {
      await deleteUser(targetUser.user_id);
      setToast({ type: "success", text: "ユーザーアカウントを削除しました" });
      await loadData();
    } catch (err: any) {
      console.error(err);
      setToast({ type: "error", text: err.message || "削除に失敗しました" });
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
        <div className="flex items-center space-x-2 text-slate-600">
          <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-semibold text-lg">認証確認中...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: "総合ダッシュボード", href: "/dashboard", icon: LayoutDashboardIcon },
    { name: "打刻履歴確認", href: "/attendance-history", icon: ClipboardListIcon },
    { name: "労働時間集計", href: "/labor-summary", icon: CalendarDaysIcon },
    { name: "外注先企業登録", href: "/contractor-register", icon: Building2Icon },
    { name: "管理者ユーザー登録", href: "/admin-users", icon: UserPlus2Icon, active: true },
  ];

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = users.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row relative">
      {toast && (
        <div
          data-testid="toast-message"
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3.5 rounded-xl shadow-lg text-white text-base font-bold transition-all duration-300 max-w-sm text-center ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* モバイルヘッダー */}
      <header className="bg-slate-900 text-white px-4 py-4 flex items-center justify-between md:hidden shadow">
        <div className="flex items-center space-x-2">
          <LayoutDashboardIcon className="h-6 w-6 text-blue-400" />
          <span className="font-bold text-lg">管理者ダッシュボード</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="メニューを開く"
          data-testid="mobile-menu-btn"
        >
          {isSidebarOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </header>

      {/* サイドバー */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="sidebar"
      >
        <div className="h-full flex flex-col justify-between py-6 px-4">
          <div className="space-y-6">
            <div className="hidden md:flex items-center space-x-2 px-2">
              <LayoutDashboardIcon className="h-8 w-8 text-blue-400" />
              <span className="font-bold text-xl tracking-tight">工場側管理画面</span>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setIsSidebarOpen(false);
                      router.push(item.href);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors ${
                      item.active
                        ? "bg-blue-600 text-white shadow"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                    style={{ minHeight: "44px" }}
                    data-testid={`nav-item-${item.href}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-800 space-y-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-semibold text-slate-400 hover:bg-red-900/40 hover:text-red-200 transition-colors"
              style={{ minHeight: "44px" }}
              data-testid="logout-btn"
            >
              <LogOutIcon className="h-5 w-5" />
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      </aside>

      {/* モバイル用オーバーレイ */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl tracking-tight">
              管理者ユーザー登録
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              工場側管理者、および各外注先の管理者用アカウントを新規登録、編集、無効化管理が行えます。
            </p>
          </div>
          <button
            onClick={handleOpenNewModal}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-base font-bold shadow transition-colors"
            style={{ minHeight: "44px" }}
            data-testid="new-user-btn"
          >
            <PlusIcon className="h-5 w-5" />
            <span>新規登録</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-bold flex items-center space-x-2" data-testid="error-message">
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6" data-testid="loading-skeleton">
            <div className="animate-pulse bg-white h-64 rounded-2xl border border-slate-200" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" data-testid="user-table-container">
              {/* PC向けテーブル表示 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-sm font-bold text-slate-600">ユーザーID (ログインID)</th>
                      <th className="px-6 py-3 text-sm font-bold text-slate-600">表示名</th>
                      <th className="px-6 py-3 text-sm font-bold text-slate-600">権限</th>
                      <th className="px-6 py-3 text-sm font-bold text-slate-600">所属先企業</th>
                      <th className="px-6 py-3 text-sm font-bold text-slate-600">ステータス</th>
                      <th className="px-6 py-3 text-sm font-bold text-slate-600 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white" data-testid="user-table-body">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                          登録されている管理者ユーザーはありません。
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((u) => {
                        const contractor = contractors.find((c) => c.contractor_id === u.contractor_id);
                        return (
                          <tr key={u.user_id} className="hover:bg-slate-50/50 transition-colors" data-testid={`user-row-${u.user_id}`}>
                            <td className="px-6 py-4 text-base font-bold text-slate-900" data-testid={`user-login-id-${u.user_id}`}>
                              {u.login_id}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-900" data-testid={`user-display-name-${u.user_id}`}>
                              {u.display_name}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {u.role === "FACTORY_ADMIN" ? (
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100" data-testid={`user-role-badge-${u.user_id}`}>
                                  工場側管理者
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-bold border border-purple-100" data-testid={`user-role-badge-${u.user_id}`}>
                                  外注先管理者
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600" data-testid={`user-contractor-name-${u.user_id}`}>
                              {u.role === "FACTORY_ADMIN" ? (
                                <span className="text-slate-400 italic">工場内管理者</span>
                              ) : (
                                contractor ? contractor.name : "不明な所属企業"
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {u.status === "ACTIVE" ? (
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold shadow-sm" data-testid={`user-status-badge-${u.user_id}`}>
                                  有効
                                </span>
                              ) : u.status === "LOCKED" ? (
                                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold shadow-sm" data-testid={`user-status-badge-${u.user_id}`}>
                                  ロック
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-bold shadow-sm" data-testid={`user-status-badge-${u.user_id}`}>
                                  無効
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-right space-x-3">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setIsModalOpen(true);
                                }}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 border border-slate-300 hover:border-slate-400 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                                style={{ minHeight: "36px" }}
                                data-testid={`edit-user-btn-${u.user_id}`}
                              >
                                <EditIcon />
                                <span>編集</span>
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                                style={{ minHeight: "36px" }}
                                data-testid={`delete-user-btn-${u.user_id}`}
                              >
                                <TrashIcon />
                                <span>削除</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* スマホ向けカード表示 */}
              <div className="md:hidden divide-y divide-slate-200" data-testid="user-mobile-list">
                {paginatedUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-medium">
                    登録されている管理者ユーザーはありません。
                  </div>
                ) : (
                  paginatedUsers.map((u) => {
                    const contractor = contractors.find((c) => c.contractor_id === u.contractor_id);
                    return (
                      <div key={u.user_id} className="p-5 space-y-4 hover:bg-slate-50/50" data-testid={`user-card-${u.user_id}`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900" data-testid={`user-display-name-mobile-${u.user_id}`}>
                              {u.display_name}
                            </h3>
                            <p className="text-sm text-slate-600" data-testid={`user-login-id-mobile-${u.user_id}`}>
                              ID: {u.login_id}
                            </p>
                            <p className="text-xs text-slate-500">
                              所属: {u.role === "FACTORY_ADMIN" ? "工場側管理者" : (contractor ? contractor.name : "外注先")}
                            </p>
                          </div>
                          <div>
                            {u.status === "ACTIVE" ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold shadow-sm">
                                有効
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-bold shadow-sm">
                                無効
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setIsModalOpen(true);
                            }}
                            className="flex items-center justify-center space-x-1 px-4 py-2 border border-slate-300 bg-white rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                            style={{ minWidth: "80px", minHeight: "44px" }}
                            data-testid={`edit-user-mobile-btn-${u.user_id}`}
                          >
                            <EditIcon />
                            <span>編集</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="flex items-center justify-center space-x-1 px-4 py-2 border border-red-200 hover:border-red-300 bg-white rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 shadow-sm"
                            style={{ minWidth: "80px", minHeight: "44px" }}
                            data-testid={`delete-user-mobile-btn-${u.user_id}`}
                          >
                            <TrashIcon />
                            <span>削除</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-2xl shadow-sm">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    style={{ minHeight: "44px" }}
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    style={{ minHeight: "44px" }}
                  >
                    次へ
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-700">
                      全 <span className="font-bold">{users.length}</span> 件中{" "}
                      <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span>{" "}
                      から{" "}
                      <span className="font-bold">
                        {Math.min(currentPage * itemsPerPage, users.length)}
                      </span>{" "}
                      件を表示
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="ページネーション">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-3 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        style={{ minHeight: "40px" }}
                      >
                        前へ
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          aria-current={page === currentPage ? "page" : undefined}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 ${
                            page === currentPage
                              ? "z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                              : "text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:outline-offset-0"
                          }`}
                          style={{ minHeight: "40px" }}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-3 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        style={{ minHeight: "40px" }}
                      >
                        次へ
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 新規追加・編集用モーダルフォーム */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        user={editingUser}
        contractors={contractors}
      />
    </div>
  );
}