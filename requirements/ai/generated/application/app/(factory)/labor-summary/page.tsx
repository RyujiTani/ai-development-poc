"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

interface SummaryRecord {
  worker_id: string;
  worker_name: string;
  contractor_id: string;
  contractor_name: string;
  date?: string;
  total_hours: number;
}

const summarySchema = z.object({
  startDate: z.string().min(1, "開始日を入力してください"),
  endDate: z.string().min(1, "終了日を入力してください"),
  unit: z.enum(["daily", "monthly"]),
}).refine((data) => {
  if (!data.startDate || !data.endDate) return true;
  return new Date(data.startDate) <= new Date(data.endDate);
}, {
  message: "終了日は開始日以降の日付を指定してください",
  path: ["endDate"],
});

type SummaryFormValues = z.infer<typeof summarySchema>;

export default function LaborSummaryPage() {
  const router = useRouter();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [summaryRecords, setSummaryRecords] = useState<SummaryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SummaryFormValues>({
    resolver: zodResolver(summarySchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      unit: "daily",
    },
  });

  const watchUnit = watch("unit");

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

  const handleLogout = () => {
    logout();
    router.push("/admin-login");
  };

  const onCalculate = async (data: SummaryFormValues) => {
    setIsLoading(true);
    try {
      const db = await getDB();

      // contractors
      const contractorsTx = db.transaction("contractors", "readonly");
      const allContractors = await contractorsTx.objectStore("contractors").getAll();
      await contractorsTx.done;

      // workers
      const workersTx = db.transaction("workers", "readonly");
      const allWorkers = await workersTx.objectStore("workers").getAll();
      await workersTx.done;

      const workersMap = new Map(allWorkers.map((w) => [w.worker_id, w]));
      const contractorsMap = new Map(allContractors.map((c) => [c.contractor_id, c]));

      // attendance_records
      const attendanceTx = db.transaction("attendance_records", "readonly");
      const allRecords = await attendanceTx.objectStore("attendance_records").getAll();
      await attendanceTx.done;

      // 作業員ごとに打刻レコードをマッピング
      const recordsByWorker = new Map<string, any[]>();
      allRecords.forEach((r) => {
        const arr = recordsByWorker.get(r.worker_id) || [];
        arr.push(r);
        recordsByWorker.set(r.worker_id, arr);
      });

      const calculatedPairs: {
        worker_id: string;
        contractor_id: string;
        date: string;
        month: string;
        hours: number;
      }[] = [];

      recordsByWorker.forEach((records, workerId) => {
        // 時刻昇順ソート
        records.sort((a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime());

        let i = 0;
        while (i < records.length - 1) {
          const current = records[i];
          const next = records[i + 1];
          if (current.punch_type === "CLOCK_IN" && next.punch_type === "CLOCK_OUT") {
            const inTime = new Date(current.clocked_at).getTime();
            const outTime = new Date(next.clocked_at).getTime();
            const diffMs = outTime - inTime;
            if (diffMs > 0) {
              const hours = diffMs / (1000 * 60 * 60);
              const inDate = new Date(current.clocked_at);
              
              // タイムゾーンの不整合を防ぐため、Asia/Tokyo基準で日付・年月を取得する
              const formatter = new Intl.DateTimeFormat("ja-JP", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              });
              const formatted = formatter.format(inDate); // "yyyy/MM/dd"
              const dateStr = formatted.replace(/\//g, "-"); // "yyyy-MM-dd"
              const monthStr = dateStr.substring(0, 7); // "yyyy-MM"

              calculatedPairs.push({
                worker_id: workerId,
                contractor_id: current.contractor_id,
                date: dateStr,
                month: monthStr,
                hours,
              });
            }
            i += 2;
          } else {
            i += 1;
          }
        }
      });

      // 集計
      if (data.unit === "daily") {
        const dailySummaryMap = new Map<string, SummaryRecord>();
        calculatedPairs.forEach((p) => {
          if (p.date >= data.startDate && p.date <= data.endDate) {
            const key = `${p.worker_id}_${p.date}`;
            const worker = workersMap.get(p.worker_id);
            const contractor = contractorsMap.get(p.contractor_id);
            const workerName = worker ? worker.name : "不明な作業員";
            const contractorName = contractor ? contractor.name : "不明な外注先";

            const existing = dailySummaryMap.get(key);
            if (existing) {
              existing.total_hours += p.hours;
            } else {
              dailySummaryMap.set(key, {
                worker_id: p.worker_id,
                worker_name: workerName,
                contractor_id: p.contractor_id,
                contractor_name: contractorName,
                date: p.date,
                total_hours: p.hours,
              });
            }
          }
        });

        const dailySummary = Array.from(dailySummaryMap.values());
        dailySummary.forEach((r) => {
          r.total_hours = Math.round(r.total_hours * 100) / 100;
        });
        dailySummary.sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.worker_name.localeCompare(b.worker_name));
        setSummaryRecords(dailySummary);
      } else {
        const monthlySummaryMap = new Map<string, SummaryRecord>();
        calculatedPairs.forEach((p) => {
          if (p.date >= data.startDate && p.date <= data.endDate) {
            const key = `${p.worker_id}_${p.month}`;
            const worker = workersMap.get(p.worker_id);
            const contractor = contractorsMap.get(p.contractor_id);
            const workerName = worker ? worker.name : "不明な作業員";
            const contractorName = contractor ? contractor.name : "不明な外注先";

            const existing = monthlySummaryMap.get(key);
            if (existing) {
              existing.total_hours += p.hours;
            } else {
              monthlySummaryMap.set(key, {
                worker_id: p.worker_id,
                worker_name: workerName,
                contractor_id: p.contractor_id,
                contractor_name: contractorName,
                date: p.month,
                total_hours: p.hours,
              });
            }
          }
        });

        const monthlySummary = Array.from(monthlySummaryMap.values());
        monthlySummary.forEach((r) => {
          r.total_hours = Math.round(r.total_hours * 100) / 100;
        });
        monthlySummary.sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.worker_name.localeCompare(b.worker_name));
        setSummaryRecords(monthlySummary);
      }
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to calculate labor summary", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (summaryRecords.length === 0) return;

    const unit = watchUnit;
    const headers = ["作業員名", "外注先名", unit === "daily" ? "日付" : "年月", "実労働時間(時間)"];
    const csvRows = [headers.join(",")];

    summaryRecords.forEach((r) => {
      const row = [
        `"${r.worker_name.replace(/"/g, '""')}"`,
        `"${r.contractor_name.replace(/"/g, '""')}"`,
        `"${(r.date || "").replace(/"/g, '""')}"`,
        r.total_hours.toFixed(2),
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // UTF-8 BOM付き
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `labor_summary_${unit}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    { name: "労働時間集計", href: "/labor-summary", icon: CalendarDaysIcon, active: true },
    { name: "外注先企業登録", href: "/contractor-register", icon: Building2Icon },
    { name: "管理者ユーザー登録", href: "/admin-users", icon: UserPlus2Icon },
  ];

  const totalPages = Math.ceil(summaryRecords.length / itemsPerPage);
  const paginatedRecords = summaryRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
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
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl tracking-tight">
              労働時間集計
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              指定期間（日次・月次）における作業員ごとの実労働時間を集計します。
            </p>
          </div>
          {summaryRecords.length > 0 && (
            <button
              onClick={handleDownloadCSV}
              className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-colors"
              style={{ minHeight: "40px" }}
              data-testid="csv-download-btn"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>CSVダウンロード</span>
            </button>
          )}
        </div>

        {/* 集計条件フォーム (SCR-013-UI-001) */}
        <form onSubmit={handleSubmit(onCalculate)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-semibold text-slate-700 mb-1">
                開始日 <span className="text-red-500 text-xs font-bold">(必須)</span>
              </label>
              <input
                id="startDate"
                type="date"
                {...register("startDate")}
                className={`block w-full rounded-lg border px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                  errors.startDate ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
                }`}
                style={{ minHeight: "44px" }}
                data-testid="start-date-input"
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600 font-medium" data-testid="error-start-date">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-semibold text-slate-700 mb-1">
                終了日 <span className="text-red-500 text-xs font-bold">(必須)</span>
              </label>
              <input
                id="endDate"
                type="date"
                {...register("endDate")}
                className={`block w-full rounded-lg border px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                  errors.endDate ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
                }`}
                style={{ minHeight: "44px" }}
                data-testid="end-date-input"
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600 font-medium" data-testid="error-end-date">
                  {errors.endDate.message}
                </p>
              )}
            </div>

            <div>
              <span className="block text-sm font-semibold text-slate-700 mb-2">
                集計単位
              </span>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center justify-center border rounded-xl p-2 cursor-pointer select-none transition-all hover:bg-slate-50">
                  <input
                    type="radio"
                    value="daily"
                    {...register("unit")}
                    className="h-5 w-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                    data-testid="unit-daily-radio"
                  />
                  <span className="ml-2 text-sm font-bold text-slate-800">日次</span>
                </label>
                <label className="flex items-center justify-center border rounded-xl p-2 cursor-pointer select-none transition-all hover:bg-slate-50">
                  <input
                    type="radio"
                    value="monthly"
                    {...register("unit")}
                    className="h-5 w-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                    data-testid="unit-monthly-radio"
                  />
                  <span className="ml-2 text-sm font-bold text-slate-800">月次</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2.5 text-base font-bold shadow transition-colors disabled:bg-blue-400"
              style={{ minHeight: "44px" }}
              data-testid="calculate-btn"
            >
              {isLoading ? (
                <span>集計中...</span>
              ) : (
                <>
                  <SearchIcon className="h-5 w-5" />
                  <span>集計する</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* 集計結果テーブル (SCR-013-UI-002) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-sm font-bold text-slate-600">作業員名</th>
                  <th className="px-6 py-3 text-sm font-bold text-slate-600">外注先</th>
                  {watchUnit === "daily" ? (
                    <th className="px-6 py-3 text-sm font-bold text-slate-600">日付</th>
                  ) : (
                    <th className="px-6 py-3 text-sm font-bold text-slate-600">年月</th>
                  )}
                  <th className="px-6 py-3 text-sm font-bold text-slate-600">実労働時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white" data-testid="summary-table-body">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-medium">
                      集計対象のデータはありません。集計条件を指定して「集計する」をクリックしてください。
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record, index) => (
                    <tr key={`${record.worker_id}_${record.date || index}`} className="hover:bg-slate-50/50 transition-colors" data-testid="summary-row">
                      <td className="px-6 py-4 text-base font-bold text-slate-900" data-testid="row-worker-name">
                        {record.worker_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600" data-testid="row-contractor-name">
                        {record.contractor_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-mono" data-testid="row-date">
                        {record.date}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 font-mono" data-testid="row-hours">
                        {record.total_hours.toFixed(2)} 時間
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ページネーション (SCR-013-UI-004) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
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
                    全 <span className="font-bold">{summaryRecords.length}</span> 件中{" "}
                    <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> から{" "}
                    <span className="font-bold">
                      {Math.min(currentPage * itemsPerPage, summaryRecords.length)}
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
      </main>
    </div>
  );
}