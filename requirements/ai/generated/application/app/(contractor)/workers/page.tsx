"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDB } from "@/lib/db";
import { Worker } from "@/features/worker/domain/types";

// SVG Icons
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="3 6 5 3 21 3 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export default function WorkerListPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadWorkers = async () => {
    if (typeof sessionStorage === "undefined") {
      setIsLoading(false);
      return;
    }

    const storedId = sessionStorage.getItem("user_id");
    const storedRole = sessionStorage.getItem("role");
    const storedContractorId = sessionStorage.getItem("contractor_id");

    // 未認証・権限なしリダイレクト (SCR-007-VL-002)
    if (!storedId || storedRole !== "CONTRACTOR_MANAGER" || !storedContractorId) {
      router.push("/login");
      return;
    }

    try {
      const db = await getDB();
      const tx = db.transaction("workers", "readonly");
      const store = tx.objectStore("workers");
      const allWorkers: Worker[] = await store.getAll();
      await tx.done;

      // 該当 contractor_id でステータスが ACTIVE な作業員のみ抽出 (SCR-007-DT-001)
      const filtered = allWorkers
        .filter((w) => w.contractor_id === storedContractorId && w.status === "ACTIVE")
        .sort((a, b) => a.name.localeCompare(b.name, "ja"));

      setWorkers(filtered);
    } catch (error) {
      console.error("Failed to load workers", error);
      setToast({ type: "error", text: "作業員データの取得に失敗しました" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, [router]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleDelete = async (workerId: string, workerName: string) => {
    // 削除確認ダイアログ表示 (SCR-007-VL-001)
    const confirmed = window.confirm(`作業員「${workerName}」を本当に削除しますか？`);
    if (!confirmed) return;

    setIsDeleting(workerId);
    try {
      const db = await getDB();
      const tx = db.transaction("workers", "readwrite");
      const store = tx.objectStore("workers");
      const worker: Worker | undefined = await store.get(workerId);
      
      if (worker) {
        // 論理削除（退職更新、ステータスをRETIREDに設定） (SCR-007-DT-002)
        worker.status = "RETIRED";
        worker.retired_at = new Date().toISOString();
        worker.updated_at = new Date().toISOString();
        await store.put(worker);
      }
      await tx.done;

      setToast({ type: "success", text: `${workerName}さんを削除しました` });
      // 成功後に一覧再取得 (SCR-007-EV-003)
      await loadWorkers();
    } catch (error) {
      console.error("Failed to delete worker", error);
      setToast({ type: "error", text: "削除に失敗しました" });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBack = () => {
    router.push("/home"); // (SCR-007-EV-004)
  };

  const handleAddNew = () => {
    router.push("/workers/new"); // (SCR-007-EV-001)
  };

  const handleEdit = (workerId: string) => {
    router.push(`/workers/${workerId}/edit`); // (SCR-007-EV-002)
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
        <div className="flex items-center space-x-2 text-slate-600">
          <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-semibold text-lg">読み込み中...</span>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(workers.length / itemsPerPage);
  const paginatedWorkers = workers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen relative">
      {/* 簡易通知トーストUI */}
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

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center space-x-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ minHeight: "44px" }}
            aria-label="戻る"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>戻る</span>
          </button>
          <h1 className="text-lg font-bold text-slate-900">
            作業員一覧
          </h1>
          <button
            onClick={handleAddNew}
            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ minHeight: "44px" }}
            aria-label="新規追加"
            data-testid="add-new-btn"
          >
            <PlusIcon className="h-4 w-4" />
            <span>新規追加</span>
          </button>
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col justify-start">
        {workers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-medium shadow-sm">
            登録されている有効な作業員がいません。
          </div>
        ) : (
          <div className="space-y-4">
            {/* リスト形式での表示 (SCR-007-UI-001) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden" data-testid="worker-list-container">
              {paginatedWorkers.map((worker) => (
                <div
                  key={worker.worker_id}
                  className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  style={{ minHeight: "44px" }}
                  data-testid={`worker-item-${worker.worker_id}`}
                >
                  {/* 主要項目情報 */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-slate-900">
                        {worker.name}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
                      {/* 連絡先 */}
                      <div className="flex items-center space-x-1">
                        <span className="font-semibold text-slate-400 min-w-[50px]">連絡先:</span>
                        <span data-testid={`worker-contact-${worker.worker_id}`}>{worker.contact || "未登録"}</span>
                      </div>

                      {/* 資格 */}
                      <div className="flex items-start space-x-1">
                        <span className="font-semibold text-slate-400 min-w-[50px]">資格:</span>
                        <div className="flex flex-wrap gap-1" data-testid={`worker-qualifications-${worker.worker_id}`}>
                          {worker.qualifications.length > 0 ? (
                            worker.qualifications.map((q) => (
                              <span
                                key={q}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100"
                              >
                                {q}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">なし</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 講習受講履歴 */}
                    <div className="text-xs text-slate-500 flex flex-col gap-1 pt-1 border-t border-slate-100">
                      <span className="font-semibold text-slate-400">講習履歴:</span>
                      <div data-testid={`worker-trainings-${worker.worker_id}`}>
                        {worker.trainings.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {worker.trainings.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200"
                              >
                                {t.code} ({t.taken_at.split("T")[0]})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">講習履歴なし</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 操作ボタン：現場での屋外操作を考慮し、十分なタップ面積を確保 (SCR-007-UI-004, SCR-007-UI-006) */}
                  <div className="flex items-center justify-end gap-3 sm:self-center">
                    <button
                      onClick={() => handleEdit(worker.worker_id)}
                      className="flex items-center justify-center space-x-1 px-4 py-2 border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg text-sm font-bold transition-all shadow-sm"
                      style={{ minWidth: "80px", minHeight: "44px" }}
                      data-testid={`edit-btn-${worker.worker_id}`}
                      aria-label="編集"
                    >
                      <EditIcon className="h-4 w-4 text-slate-500" />
                      <span>編集</span>
                    </button>
                    <button
                      onClick={() => handleDelete(worker.worker_id, worker.name)}
                      disabled={isDeleting === worker.worker_id}
                      className="flex items-center justify-center space-x-1 px-4 py-2 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                      style={{ minWidth: "80px", minHeight: "44px" }}
                      data-testid={`delete-btn-${worker.worker_id}`}
                      aria-label="削除"
                    >
                      {isDeleting === worker.worker_id ? (
                        <svg className="animate-spin h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <TrashIcon className="h-4 w-4" />
                      )}
                      <span>削除</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ページネーション (SCR-007-UI-002) */}
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
                      全 <span className="font-bold">{workers.length}</span> 件中{" "}
                      <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span>{" "}
                      から{" "}
                      <span className="font-bold">
                        {Math.min(currentPage * itemsPerPage, workers.length)}
                      </span>{" "}
                      件を表示
                    </p>
                  </div>
                  <div>
                    <nav
                      className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                      aria-label="ページネーション"
                    >
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
    </div>
  );
}