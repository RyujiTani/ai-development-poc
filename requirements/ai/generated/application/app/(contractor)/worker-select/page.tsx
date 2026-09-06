"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAttendanceStore } from "@/features/attendance/store/useAttendanceStore";
import { getDB } from "@/lib/db";
import { Worker } from "@/features/worker/domain/types";

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

export default function WorkerSelectPage() {
  const router = useRouter();
  const { punchMode, setSelectedWorkerIds } = useAttendanceStore();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuthAndLoadWorkers() {
      if (typeof sessionStorage === "undefined") {
        setIsLoading(false);
        return;
      }

      const storedId = sessionStorage.getItem("user_id");
      const storedRole = sessionStorage.getItem("role");
      const storedContractorId = sessionStorage.getItem("contractor_id");

      // 未認証リダイレクト（sessionStorageに有効なセッションが存在しない場合）
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

        // ログイン中の管理者に紐づく作業員のみ抽出（statusがACTIVEな作業員）
        const filteredWorkers = allWorkers
          .filter(
            (w) => w.contractor_id === storedContractorId && w.status === "ACTIVE"
          )
          // 氏名の五十音順に並び替え（AMB-001の仮仕様決定）
          .sort((a, b) => a.name.localeCompare(b.name, "ja"));

        setWorkers(filteredWorkers);
      } catch (error) {
        console.error("Failed to load workers", error);
        setErrorMessage("作業員データの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthAndLoadWorkers();
  }, [router]);

  const isAllSelected = workers.length > 0 && selectedIds.length === workers.length;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(workers.map((w) => w.worker_id));
    }
  };

  const handleToggleSelect = (workerId: string) => {
    setSelectedIds((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleNext = () => {
    if (selectedIds.length === 0) {
      setErrorMessage("作業員を1名以上選択してください");
      return;
    }
    setErrorMessage(null);
    setSelectedWorkerIds(selectedIds);
    router.push("/attendance/capture");
  };

  const handleBack = () => {
    router.push("/punch-mode");
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

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
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
            作業員選択
          </h1>
          <div className="w-[76px]" />
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 flex flex-col justify-start">
        {/* 打刻モード明示エリア */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-800">選択中の打刻モード:</span>
          <span className="px-3.5 py-1 bg-blue-600 text-white rounded-full text-sm font-extrabold shadow-sm">
            {punchMode === "CLOCK_IN" ? "出勤" : punchMode === "CLOCK_OUT" ? "退勤" : "未設定"}
          </span>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 font-bold" data-testid="error-message">
            {errorMessage}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* 一括選択用ヘッダー */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center">
            <label className="flex items-center space-x-3 cursor-pointer select-none w-full py-2">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleAll}
                className="h-6 w-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                style={{ minWidth: "24px", minHeight: "24px" }}
                data-testid="select-all-checkbox"
              />
              <span className="text-base font-bold text-slate-800">
                全員を選択する / 解除する
              </span>
            </label>
          </div>

          {/* 作業員リスト */}
          <div className="divide-y divide-slate-200 overflow-y-auto max-h-[360px]" data-testid="worker-list">
            {workers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-medium">
                登録されている有効な作業員がいません。
              </div>
            ) : (
              workers.map((worker) => {
                const isChecked = selectedIds.includes(worker.worker_id);
                return (
                  <div
                    key={worker.worker_id}
                    onClick={() => handleToggleSelect(worker.worker_id)}
                    className={`px-6 py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors active:bg-slate-100 ${
                      isChecked ? "bg-blue-50/40" : ""
                    }`}
                    style={{ minHeight: "56px" }}
                  >
                    <div className="flex items-center space-x-4 flex-1 py-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="h-6 w-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                        style={{ minWidth: "24px", minHeight: "24px" }}
                        data-testid={`worker-checkbox-${worker.worker_id}`}
                      />
                      <span className="text-lg font-bold text-slate-900 select-none">
                        {worker.name}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 次へボタン */}
        <div className="mt-8">
          <button
            onClick={handleNext}
            className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg font-bold shadow hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
            style={{ minHeight: "56px" }}
            data-testid="next-btn"
          >
            次へ進む ({selectedIds.length}名選択中)
          </button>
        </div>
      </main>
    </div>
  );
}