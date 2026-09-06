"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserMeUseCase, UserMeResult } from "@/features/user/usecase/getUserMeUseCase";
import { useAttendanceStore } from "@/features/attendance/store/attendanceStore";
import { getWorkersUseCase } from "@/features/worker/usecase/getWorkersUseCase";
import { Worker } from "@/features/worker/domain/Worker";

export default function WorkerSelectPage() {
  const router = useRouter();
  const { punchType, selectedWorkerIds, setSelectedWorkerIds } = useAttendanceStore();
  
  const [user, setUser] = useState<UserMeResult | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // ページネーション状態 (SCR-004-UI-006)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 認証とユーザー情報のロード (SCR-004-VL-002, SCR-004-DT-001)
  useEffect(() => {
    const userId = sessionStorage.getItem("user_id");
    const role = sessionStorage.getItem("role");

    if (!userId || !role || role !== "CONTRACTOR_MANAGER") {
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("contractor_id");
      router.replace("/login");
      return;
    }

    const loadData = async () => {
      try {
        const userResult = await getUserMeUseCase(userId);
        if (userResult.success) {
          setUser(userResult.value);
          
          // 所属企業のACTIVEな作業員のロード (SCR-004-FN-001, SCR-004-DT-001)
          const workersResult = await getWorkersUseCase(userResult.value.contractorId);
          if (workersResult.success) {
            setWorkers(workersResult.value);
          } else {
            setError("error" in workersResult ? workersResult.error.message : "作業員の取得に失敗しました");
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

    loadData();
  }, [router]);

  // 全選択・解除 (SCR-004-FN-003, SCR-004-UI-002)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = workers.map((w) => w.worker_id);
      setSelectedWorkerIds(allIds);
    } else {
      setSelectedWorkerIds([]);
    }
    setValidationError(null);
  };

  // 個別選択・解除 (SCR-004-FN-002)
  const handleToggleWorker = (workerId: string) => {
    if (selectedWorkerIds.includes(workerId)) {
      setSelectedWorkerIds(selectedWorkerIds.filter((id) => id !== workerId));
    } else {
      setSelectedWorkerIds([...selectedWorkerIds, workerId]);
    }
    setValidationError(null);
  };

  // 次へ (SCR-004-VL-001, SCR-004-EV-001, SCR-004-DT-002)
  const handleNext = () => {
    if (selectedWorkerIds.length === 0) {
      setValidationError("打刻対象の作業員を1名以上選択してください");
      return;
    }
    router.push("/capture-submit");
  };

  // 戻る (SCR-004-EV-002)
  const handleBack = () => {
    router.push("/punch-mode");
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

  // ページネーション計算 (SCR-004-UI-006)
  const totalPages = Math.ceil(workers.length / itemsPerPage);
  const displayedWorkers = workers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isAllSelected = workers.length > 0 && workers.every((w) => selectedWorkerIds.includes(w.worker_id));

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none h-10 flex items-center justify-center min-w-[60px]"
            data-testid="back-button"
          >
            ← 戻る
          </button>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">作業員選択</span>
            <span className="text-sm font-bold text-gray-800" data-testid="user-display-name">
              {user?.displayName} 様
            </span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-lg space-y-6">
          {/* 打刻モード明示表示 (SCR-004-UI-003) */}
          <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
            <span className="text-sm font-bold text-gray-700">現在の打刻モード:</span>
            {punchType === "CLOCK_IN" ? (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800" data-testid="punch-mode-badge">
                出勤
              </span>
            ) : punchType === "CLOCK_OUT" ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800" data-testid="punch-mode-badge">
                退勤
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-800" data-testid="punch-mode-badge">
                未選択
              </span>
            )}
          </div>

          {/* バリデーションエラー表示 (SCR-004-VL-001) */}
          {validationError && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200 animate-pulse font-medium" role="alert" data-testid="validation-error">
              ⚠️ {validationError}
            </div>
          )}

          {/* 一括選択UIの配置 (SCR-004-UI-002) */}
          <div className="bg-white p-3 rounded-t-lg border-b border-gray-200 flex items-center">
            <label className="flex items-center space-x-3 cursor-pointer select-none w-full min-h-[44px]">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="form-checkbox h-6 w-6 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                data-testid="select-all-checkbox"
              />
              <span className="text-base font-bold text-gray-800">
                すべて選択 / 解除
              </span>
            </label>
          </div>

          {/* 作業員リスト (SCR-004-UI-001, SCR-004-UI-005) */}
          <div className="bg-white rounded-b-lg shadow-sm divide-y divide-gray-100 overflow-hidden">
            {displayedWorkers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                登録されている作業員がいません。
              </div>
            ) : (
              displayedWorkers.map((worker) => {
                const isSelected = selectedWorkerIds.includes(worker.worker_id);
                return (
                  <div
                    key={worker.worker_id}
                    onClick={() => handleToggleWorker(worker.worker_id)}
                    className={`flex items-center justify-between p-4 cursor-pointer active:bg-gray-50 transition-colors ${
                      isSelected ? "bg-blue-50/40" : ""
                    }`}
                    data-testid={`worker-row-${worker.worker_id}`}
                  >
                    <div className="flex items-center space-x-4 min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // 行全体タップのため、状態の変更は親divのonClickでハンドル
                        className="form-checkbox h-6 w-6 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        data-testid={`worker-checkbox-${worker.worker_id}`}
                      />
                      <div className="flex flex-col">
                        <span className="text-base font-medium text-gray-900">
                          {worker.name}
                        </span>
                        {worker.qualifications && worker.qualifications.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {worker.qualifications.map((q) => (
                              <span
                                key={q}
                                className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600"
                              >
                                {q === "QUAL_001" ? "有資格" : q}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ページネーションコントロール (SCR-004-UI-006) */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-2 py-4" data-testid="pagination-controls">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 border border-gray-300 rounded bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed h-11 flex items-center justify-center min-w-[80px]"
                data-testid="prev-page-button"
              >
                前へ
              </button>
              <span className="text-sm text-gray-600 font-medium">
                {currentPage} / {totalPages} ページ
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-4 py-2 border border-gray-300 rounded bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed h-11 flex items-center justify-center min-w-[80px]"
                data-testid="next-page-button"
              >
                次へ
              </button>
            </div>
          )}

          {/* 次へ進むアクション領域 (SCR-004-UI-005) */}
          <div className="pt-4">
            <button
              onClick={handleNext}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-4 text-lg font-bold text-white shadow-md active:scale-95 hover:bg-blue-700 focus:outline-none h-14"
              data-testid="submit-button"
            >
              次へ（撮影へ進む） ({selectedWorkerIds.length}名選択中)
            </button>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="py-4 text-center text-xs text-gray-400">
        © 2026 勤怠・配置管理システム
      </footer>
    </div>
  );
}