"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserMeUseCase, UserMeResult } from "@/features/user/usecase/getUserMeUseCase";
import { getWorkersUseCase } from "@/features/worker/usecase/getWorkersUseCase";
import { deleteWorkerUseCase } from "@/features/worker/usecase/deleteWorkerUseCase";
import { Worker } from "@/features/worker/domain/Worker";

export default function WorkerListPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserMeResult | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // トースト状態表示用
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // ページネーション状態
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const userId = sessionStorage.getItem("user_id");
    const role = sessionStorage.getItem("role");

    // 未認証アクセスの制限 (SCR-007-VL-002)
    if (!userId || !role || role !== "CONTRACTOR_MANAGER") {
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("contractor_id");
      router.replace("/login");
      return;
    }

    loadData(userId);

    const pendingToast = sessionStorage.getItem("worker_toast");
    if (pendingToast) {
      showToast(pendingToast, "success");
      sessionStorage.removeItem("worker_toast");
    }
  }, [router]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const userResult = await getUserMeUseCase(userId);
      if (userResult.success) {
        setUser(userResult.value);
        
        // 自社所属作業員のロード (SCR-007-FN-001, SCR-007-DT-001)
        const workersResult = await getWorkersUseCase(userResult.value.contractorId);
        if (workersResult.success) {
          setWorkers(workersResult.value);
        } else {
          setError("error" in workersResult ? workersResult.error.message : "作業員情報の取得に失敗しました");
        }
      } else {
        setError("error" in userResult ? userResult.error.message : "ユーザー情報の取得に失敗しました");
      }
    } catch (err) {
      setError("データの取得中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 削除処理 (SCR-007-FN-004, SCR-007-VL-001, SCR-007-EV-003, SCR-007-DT-002)
  const handleDelete = async (workerId: string, workerName: string) => {
    const confirmed = window.confirm(`作業員「${workerName}」を本当に削除しますか？`);
    if (!confirmed) return; // キャンセル時は何もしない (ACC-007-004)

    const userId = sessionStorage.getItem("user_id") || "";
    try {
      const result = await deleteWorkerUseCase(workerId, userId);
      if (result.success) {
        showToast("作業員を削除しました", "success");
        // 表示を最新の状態に更新 (SCR-007-EV-003)
        if (user) {
          const workersResult = await getWorkersUseCase(user.contractorId);
          if (workersResult.success) {
            setWorkers(workersResult.value);
            // 削除によりページ数が減った場合の調整
            const maxPage = Math.ceil(workersResult.value.length / itemsPerPage);
            if (currentPage > maxPage && maxPage > 0) {
              setCurrentPage(maxPage);
            }
          }
        }
      } else {
        showToast("error" in result ? result.error.message : "削除に失敗しました", "error");
      }
    } catch (err) {
      showToast("削除処理中にエラーが発生しました", "error");
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100" data-testid="loading-state">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">エラーが発生しました</h2>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              sessionStorage.removeItem("user_id");
              sessionStorage.removeItem("role");
              sessionStorage.removeItem("contractor_id");
              router.push("/login");
            }}
            className="w-full rounded bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none"
          >
            ログイン画面へ戻る
          </button>
        </div>
      </div>
    );
  }

  // ページネーション計算
  const totalPages = Math.ceil(workers.length / itemsPerPage);
  const displayedWorkers = workers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* 簡易トースト */}
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-md px-4 py-3 shadow-md transition-all duration-300 ${
            toastType === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
          role="alert"
          data-testid="toast-message"
        >
          {toastMessage}
        </div>
      )}

      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/")}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none h-10 flex items-center justify-center min-w-[70px]"
            data-testid="back-button"
          >
            ← 戻る
          </button>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">作業員一覧</span>
            <span className="text-sm font-bold text-gray-800" data-testid="user-display-name">
              {user?.displayName} 様
            </span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          
          {/* リスト上部新規追加ボタンエリア (SCR-007-UI-003) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 md:text-2xl">作業員マスタ管理</h1>
              <p className="text-xs text-gray-500 mt-1">自社の作業員情報の登録・変更・削除を行えます</p>
            </div>
            <button
              onClick={() => router.push("/workers/new")}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-base font-bold text-white shadow-md active:scale-95 hover:bg-emerald-700 focus:outline-none h-12 min-w-[120px]"
              data-testid="add-worker-button"
            >
              ＋ 新規追加
            </button>
          </div>

          {/* 作業員リスト表示 (SCR-007-UI-001, SCR-007-UI-005, SCR-007-UI-006) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {displayedWorkers.length === 0 ? (
              <div className="p-8 text-center text-gray-500" data-testid="empty-state">
                登録されている作業員がいません。
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {displayedWorkers.map((worker) => (
                  <div
                    key={worker.worker_id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    data-testid={`worker-row-${worker.worker_id}`}
                  >
                    {/* 作業員詳細情報 */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900" data-testid={`worker-name-${worker.worker_id}`}>
                          {worker.name}
                        </span>
                        {worker.status === "ACTIVE" ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            在籍
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                            離職
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium text-gray-400 mr-2">連絡先:</span>
                          <span data-testid={`worker-contact-${worker.worker_id}`}>{worker.contact || "未登録"}</span>
                        </p>
                        
                        {/* 資格 */}
                        <div>
                          <span className="font-medium text-gray-400 mr-2">保有資格:</span>
                          {worker.qualifications && worker.qualifications.length > 0 ? (
                            <div className="inline-flex flex-wrap gap-1">
                              {worker.qualifications.map((q) => (
                                <span
                                  key={q}
                                  className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800"
                                  data-testid={`worker-qualification-${worker.worker_id}`}
                                >
                                  {q === "QUAL_001" ? "有資格者（足場）" : q}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">なし</span>
                          )}
                        </div>

                        {/* 講習 */}
                        <div>
                          <span className="font-medium text-gray-400 mr-2">講習履歴:</span>
                          {worker.trainings && worker.trainings.length > 0 ? (
                            <div className="inline-flex flex-col gap-1">
                              {worker.trainings.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded"
                                  data-testid={`worker-training-${worker.worker_id}`}
                                >
                                  {t.code === "TRN_001" ? "特別安全講習" : t.code} ({t.taken_at})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">なし</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 操作ボタン配置 (SCR-007-UI-004) */}
                    <div className="flex items-center gap-3 sm:self-center">
                      <button
                        onClick={() => router.push(`/workers/${worker.worker_id}/edit`)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center rounded border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 h-10 min-w-[70px]"
                        data-testid={`edit-button-${worker.worker_id}`}
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(worker.worker_id, worker.name)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center rounded border border-transparent bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700 h-10 min-w-[70px]"
                        data-testid={`delete-button-${worker.worker_id}`}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ページネーションコントロール (SCR-007-UI-002) */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-2 py-4" data-testid="pagination-controls">
              <button
                disabled={currentPage === 1}
                onClick={handlePrevPage}
                className="px-4 py-2 border border-gray-300 rounded bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed h-11 flex items-center justify-center min-w-[80px]"
                data-testid="prev-page-button"
              >
                前へ
              </button>
              <span className="text-sm text-gray-600 font-medium" data-testid="page-info">
                {currentPage} / {totalPages} ページ
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={handleNextPage}
                className="px-4 py-2 border border-gray-300 rounded bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed h-11 flex items-center justify-center min-w-[80px]"
                data-testid="next-page-button"
              >
                次へ
              </button>
            </div>
          )}
          
        </div>
      </main>

      {/* フッター */}
      <footer className="py-4 text-center text-xs text-gray-400">
        © 2026 勤怠・配置管理システム
      </footer>
    </div>
  );
}