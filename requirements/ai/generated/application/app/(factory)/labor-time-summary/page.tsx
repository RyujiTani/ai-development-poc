"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getLaborSummaryUseCase, LaborSummaryItem } from "@/features/report/usecase/getLaborSummaryUseCase";
import { logger } from "@/lib/logger/logger";

const searchSchema = z.object({
  startDate: z.string().min(1, { message: "開始日は必須入力です" }),
  endDate: z.string().min(1, { message: "終了日は必須入力です" }),
  unit: z.enum(["daily", "monthly"]),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate) {
    if (new Date(data.startDate) > new Date(data.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "終了日は開始日以降の日付を入力してください",
        path: ["endDate"],
      });
    }
  }
});

type SearchFormValues = z.infer<typeof searchSchema>;

export default function LaborTimeSummaryPage() {
  const router = useRouter();
  const [userName] = useState<string>("管理者");

  const [laborRecords, setLaborRecords] = useState<LaborSummaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searching, setSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ページネーション
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      unit: "daily",
    },
  });

  const watchUnit = watch("unit");
  const watchStartDate = watch("startDate");
  const watchEndDate = watch("endDate");

  // 1. 認証チェックと初期日付設定
  useEffect(() => {
    const userId = sessionStorage.getItem("user_id");
    const role = sessionStorage.getItem("role");

    if (!userId || !role || role !== "FACTORY_ADMIN") {
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("role");
      router.replace("/admin-login");
      return;
    }

    // デフォルト日付: 当月1日〜本日 (JST)
    const jstOffset = 9 * 60 * 60 * 1000;
    const today = new Date(Date.now() + jstOffset);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const firstDayStr = `${yyyy}-${mm}-01`;
    const todayStr = today.toISOString().split("T")[0];

    setValue("startDate", firstDayStr);
    setValue("endDate", todayStr);

    loadInitialData(firstDayStr, todayStr);
  }, [router, setValue]);

  const loadInitialData = async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getLaborSummaryUseCase({
        start_date: start,
        end_date: end,
        unit: "daily",
      });
      if (result.success) {
        setLaborRecords(result.value);
      } else {
        if ("error" in result) {
          setError(result.error.message);
        } else {
          setError("データの読み込みに失敗しました。");
        }
      }
    } catch (err) {
      setError("データの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // 2. 検索実行
  const onSubmit = async (data: SearchFormValues) => {
    setSearching(true);
    setError(null);
    setCurrentPage(1);
    try {
      const result = await getLaborSummaryUseCase({
        start_date: data.startDate,
        end_date: data.endDate,
        unit: data.unit,
      });
      if (result.success) {
        setLaborRecords(result.value);
      } else {
        if ("error" in result) {
          setError(result.error.message);
        } else {
          setError("集計の実行に失敗しました。");
        }
      }
    } catch (err) {
      setError("集計の実行に失敗しました。");
    } finally {
      setSearching(false);
    }
  };

  // 3. CSVダウンロード処理
  const handleDownloadCSV = () => {
    if (laborRecords.length === 0) return;

    const headers = ["作業員名", "外注先名", watchUnit === "daily" ? "日付" : "年月", "労働時間(時間)"];
    const rows = laborRecords.map((r) => [
      r.worker_name,
      r.contractor_name,
      r.period,
      r.total_hours.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(",")),
    ].join("\r\n");

    // UTF-8 with BOM for Excel compatibility
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `labor_summary_${watchUnit}_${watchStartDate}_to_${watchEndDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("role");
    logger.info("ADMIN_LOGOUT");
    router.push("/admin-login");
  };

  // ページネーション計算
  const totalPages = Math.ceil(laborRecords.length / itemsPerPage);
  const displayedRecords = laborRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* ナビゲーションサイドバー */}
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
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg bg-blue-600 text-white"
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
            <h1 className="text-xl font-bold text-gray-900">労働時間集計</h1>
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
                className="hidden md:block text-xs font-medium text-red-600 hover:text-red-700"
                data-testid="logout-button"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>

        {/* モバイル用簡易ナビゲーション */}
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
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white"
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

          {/* 検索・絞り込みフィルタ (SCR-013-UI-001) */}
          <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    開始日 <span className="text-red-500 text-xs">*必須</span>
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    {...register("startDate")}
                    className={`block w-full rounded border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-11 ${
                      errors.startDate ? "border-red-500" : "border-gray-300"
                    }`}
                    data-testid="start-date-input"
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600" data-testid="start-date-error">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    終了日 <span className="text-red-500 text-xs">*必須</span>
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    {...register("endDate")}
                    className={`block w-full rounded border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-11 ${
                      errors.endDate ? "border-red-500" : "border-gray-300"
                    }`}
                    data-testid="end-date-input"
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-600" data-testid="end-date-error">
                      {errors.endDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    集計単位 <span className="text-red-500 text-xs">*必須</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 h-11">
                    <label className={`flex items-center justify-center rounded border px-3 cursor-pointer text-sm font-bold transition-all ${
                      watchUnit === "daily"
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}>
                      <input
                        type="radio"
                        value="daily"
                        {...register("unit")}
                        className="sr-only"
                        data-testid="unit-daily"
                      />
                      <span>日次</span>
                    </label>
                    <label className={`flex items-center justify-center rounded border px-3 cursor-pointer text-sm font-bold transition-all ${
                      watchUnit === "monthly"
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}>
                      <input
                        type="radio"
                        value="monthly"
                        {...register("unit")}
                        className="sr-only"
                        data-testid="unit-monthly"
                      />
                      <span>月次</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={searching}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-base font-bold text-white shadow-md hover:bg-blue-700 h-11 min-w-[120px] disabled:bg-gray-400"
                  data-testid="submit-button"
                >
                  {searching ? "集計中..." : "集計する"}
                </button>
              </div>
            </form>
          </section>

          {/* 集計結果テーブル (SCR-013-UI-002, SCR-013-UI-003, SCR-013-UI-005) */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-base font-bold text-gray-800">
                集計結果一覧 ({laborRecords.length}件)
              </h3>
              <button
                onClick={handleDownloadCSV}
                disabled={laborRecords.length === 0}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="csv-download-button"
              >
                📥 CSVダウンロード
              </button>
            </div>

            {laborRecords.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-medium" data-testid="empty-state">
                該当する集計データはありません。
              </div>
            ) : (
              <>
                {/* テーブル表示 (PC向け) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">作業員名</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">外注先名</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {watchUnit === "daily" ? "日付" : "年月"}
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">合計労働時間</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200" data-testid="summary-table-body">
                      {displayedRecords.map((record, index) => (
                        <tr key={`${record.worker_id}_${record.period}_${index}`} data-testid="summary-row">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-testid="worker-name">
                            {record.worker_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600" data-testid="contractor-name">
                            {record.contractor_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700" data-testid="period">
                            {record.period}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-gray-900" data-testid="total-hours">
                            {record.total_hours.toFixed(2)} 時間
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* モバイル向けカード表示 */}
                <div className="md:hidden divide-y divide-gray-200">
                  {displayedRecords.map((record, index) => (
                    <div key={`${record.worker_id}_${record.period}_${index}`} className="p-4 space-y-2 bg-white" data-testid="summary-card">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-base font-bold text-gray-900">{record.worker_name}</p>
                          <p className="text-xs text-gray-500">{record.contractor_name}</p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                          {record.period}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-dashed">
                        <span className="text-xs text-gray-400 font-medium">合計労働時間:</span>
                        <span className="text-sm font-bold text-gray-800">{record.total_hours.toFixed(2)} 時間</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ページネーションコントロール (SCR-013-UI-004) */}
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
                    <span className="text-sm text-gray-600 font-medium">
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
    </div>
  );
}