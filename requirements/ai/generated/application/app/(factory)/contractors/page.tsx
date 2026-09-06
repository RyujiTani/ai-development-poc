"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAdminContractorsUseCase } from "@/features/contractor/usecase/getAdminContractorsUseCase";
import { saveContractorUseCase } from "@/features/contractor/usecase/saveContractorUseCase";
import { deleteContractorUseCase } from "@/features/contractor/usecase/deleteContractorUseCase";
import { Contractor } from "@/features/contractor/domain/Contractor";
import { logger } from "@/lib/logger/logger";

const contractorSchema = z.object({
  name: z.string().trim().min(1, { message: "企業名を入力してください" }),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type ContractorFormValues = z.infer<typeof contractorSchema>;

export default function ContractorCompanyRegisterPage() {
  const router = useRouter();
  const [userName] = useState<string>("管理者");

  // State管理 (SCR-014-ST)
  const [contractorsList, setContractorsList] = useState<Contractor[]>([]);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ページネーション (SCR-014-UI-005)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContractorFormValues>({
    resolver: zodResolver(contractorSchema),
  });

  // 認証と初期ロード
  useEffect(() => {
    const userId = sessionStorage.getItem("user_id");
    const role = sessionStorage.getItem("role");

    // 認証・権限ガード (SCR-014-VL-003)
    if (!userId || !role || role !== "FACTORY_ADMIN") {
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("role");
      router.replace("/admin-login");
      return;
    }

    loadContractors();
  }, [router]);

  const loadContractors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminContractorsUseCase();
      if (result.success) {
        setContractorsList(result.value);
      } else {
        setError("error" in result ? result.error.message : "外注先企業一覧の取得に失敗しました。");
      }
    } catch (err) {
      setError("データの読み込みに失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  // 登録/編集モーダル起動 (SCR-014-EV-001, SCR-014-EV-003)
  const handleOpenCreate = () => {
    setFormMode("CREATE");
    setSelectedContractor(null);
    reset({
      name: "",
      status: "ACTIVE",
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (contractor: Contractor) => {
    setFormMode("EDIT");
    setSelectedContractor(contractor);
    reset({
      name: contractor.name,
      status: contractor.status,
    });
    setIsFormOpen(true);
  };

  // 保存処理 (SCR-014-EV-002, SCR-014-VL-001, SCR-014-DT-002, SCR-014-DT-003)
  const onSubmit = async (data: ContractorFormValues) => {
    const userId = sessionStorage.getItem("user_id") || "";
    setIsLoading(true);
    try {
      const result = await saveContractorUseCase({
        contractorId: formMode === "EDIT" ? selectedContractor?.contractor_id : undefined,
        name: data.name,
        status: data.status,
        userId,
      });

      if (result.success) {
        showToast(formMode === "EDIT" ? "外注先企業情報を更新しました。" : "外注先企業を登録しました。");
        setIsFormOpen(false);
        await loadContractors();
      } else {
        setError("error" in result ? result.error.message : "保存に失敗しました。");
      }
    } catch (err) {
      setError("保存処理中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  // 削除処理 (SCR-014-EV-004, SCR-014-VL-002, SCR-014-DT-004)
  const handleDelete = async (contractorId: string, contractorName: string) => {
    // 削除確認ダイアログ (SCR-014-VL-002)
    const confirmed = window.confirm(`外注先企業「${contractorName}」を本当に削除しますか？`);
    if (!confirmed) return;

    const userId = sessionStorage.getItem("user_id") || "";
    setIsLoading(true);
    try {
      const result = await deleteContractorUseCase(contractorId, userId);
      if (result.success) {
        showToast("外注先企業を削除しました。");
        await loadContractors();
        // 削除後のページ数オーバーフロー調整
        const maxPage = Math.ceil((contractorsList.length - 1) / itemsPerPage);
        if (currentPage > maxPage && maxPage > 0) {
          setCurrentPage(maxPage);
        }
      } else {
        // 紐づく作業員が存在するなどの制限エラー
        const msg = "error" in result ? result.error.message : "削除に失敗しました。";
        alert(msg);
      }
    } catch (err) {
      setError("削除処理中にエラーが発生しました。");
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

  // ページネーション計算 (SCR-014-UI-005)
  const totalPages = Math.ceil(contractorsList.length / itemsPerPage);
  const displayedContractors = contractorsList.slice(
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
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg bg-blue-600 text-white"
            data-testid="nav-contractors"
          >
            🏢 外注先企業登録
          </a>
          <a
            href="/users"
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
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
            <h1 className="text-xl font-bold text-gray-900">外注先企業登録</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700" data-testid="user-display-name">
                {userName} 様
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

        {/* モバイル用簡易ナビゲーション (SCR-014-UI-006) */}
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
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white"
          >
            🏢 企業登録
          </a>
          <a
            href="/users"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded text-slate-300 bg-slate-900 hover:text-white"
          >
            👤 ユーザー登録
          </a>
        </div>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded bg-red-50 p-4 text-sm text-red-600 border border-red-200 font-medium" role="alert" data-testid="error-message">
              ⚠️ {error}
            </div>
          )}

          {/* 新規登録ボタンエリア (SCR-014-UI-002) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">外注先企業の登録・編集・削除を行います。</p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-base font-bold text-white shadow-md active:scale-95 hover:bg-emerald-700 focus:outline-none h-12 min-w-[120px]"
              data-testid="add-contractor-button"
            >
              ＋ 新規登録
            </button>
          </div>

          {/* リスト・テーブル表示 (SCR-014-UI-001, SCR-014-UI-006) */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {isLoading && contractorsList.length === 0 ? (
              <div className="p-8 text-center" data-testid="loading-indicator">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
                <p className="text-gray-500 text-sm mt-3 font-medium">企業リストを取得中...</p>
              </div>
            ) : contractorsList.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-medium" data-testid="empty-state">
                登録されている外注先企業はありません。
              </div>
            ) : (
              <>
                {/* 1. PC向けテーブル表示 (SCR-014-UI-001) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">外注先企業名</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ステータス</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">登録日時</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">アクション</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200" data-testid="contractor-table-body">
                      {displayedContractors.map((contractor) => (
                        <tr key={contractor.contractor_id} data-testid={`contractor-row-${contractor.contractor_id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900" data-testid={`contractor-name-${contractor.contractor_id}`}>
                            {contractor.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" data-testid={`contractor-status-${contractor.contractor_id}`}>
                            {contractor.status === "ACTIVE" ? (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">有効 (ACTIVE)</span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-800">無効 (INACTIVE)</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                            {new Date(contractor.created_at).toLocaleString("ja-JP")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                            <button
                              onClick={() => handleOpenEdit(contractor)}
                              className="text-blue-600 hover:text-blue-900 font-bold"
                              data-testid={`edit-button-${contractor.contractor_id}`}
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(contractor.contractor_id, contractor.name)}
                              className="text-red-600 hover:text-red-900 font-bold"
                              data-testid={`delete-button-${contractor.contractor_id}`}
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 2. モバイル向けカード表示 (SCR-014-UI-006) */}
                <div className="md:hidden divide-y divide-gray-200">
                  {displayedContractors.map((contractor) => (
                    <div key={contractor.contractor_id} className="p-4 space-y-3 bg-white" data-testid={`contractor-card-${contractor.contractor_id}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-base font-bold text-gray-900" data-testid={`mobile-contractor-name-${contractor.contractor_id}`}>{contractor.name}</p>
                          <p className="text-xs text-gray-400">登録: {new Date(contractor.created_at).toLocaleDateString("ja-JP")}</p>
                        </div>
                        {contractor.status === "ACTIVE" ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">有効</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-800">無効</span>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleOpenEdit(contractor)}
                          className="flex-1 inline-flex justify-center items-center rounded border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 h-10"
                          data-testid={`mobile-edit-button-${contractor.contractor_id}`}
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(contractor.contractor_id, contractor.name)}
                          className="flex-1 inline-flex justify-center items-center rounded border border-transparent bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700 h-10"
                          data-testid={`mobile-delete-button-${contractor.contractor_id}`}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ページネーションコントロール (SCR-014-UI-005) */}
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

      {/* 新規登録・編集モーダルフォーム (SCR-014-UI-004) */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          role="dialog"
          aria-modal="true"
          data-testid="contractor-modal"
        >
          <div
            className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b pb-4">
              <h2 className="text-lg font-bold text-gray-900" data-testid="modal-title">
                {formMode === "CREATE" ? "外注先企業の新規登録" : "外注先企業情報の編集"}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                外注先企業の基本情報を設定してください。
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-1">
                  外注先企業名 <span className="text-red-500 text-xs">*必須</span>
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="例: 株式会社外注商事"
                  {...register("name")}
                  className={`block w-full rounded border px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 bg-white ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  data-testid="contractor-name-input"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600" data-testid="contractor-name-error">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-bold text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  id="status"
                  {...register("status")}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 bg-white"
                  data-testid="contractor-status-select"
                >
                  <option value="ACTIVE">有効 (ACTIVE)</option>
                  <option value="INACTIVE">無効 (INACTIVE)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none h-12"
                  data-testid="cancel-button"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-md hover:bg-blue-700 focus:outline-none h-12 disabled:bg-gray-400"
                  data-testid="save-button"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}