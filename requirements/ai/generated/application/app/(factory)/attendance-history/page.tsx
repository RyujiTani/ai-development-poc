"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { saveAttendanceCorrection } from "@/features/attendance/repository/attendanceRepository";
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

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const BuildingIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
  </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

// Form schema for correction
const correctionSchema = z.object({
  punch_type: z.enum(["CLOCK_IN", "CLOCK_OUT"], {
    errorMap: () => ({ message: "打刻種別を選択してください" }),
  }),
  date: z.string().min(1, "日付を入力してください"),
  time: z.string().min(1, "時刻を入力してください"),
  reason: z.string().trim().min(1, "修正理由は必須です"),
});

type CorrectionFormValues = z.infer<typeof correctionSchema>;

export default function AttendanceHistoryPage() {
  const router = useRouter();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // States
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [contractorsList, setContractorsList] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedContractorId, setSelectedContractorId] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modals state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // UseForm hook for correction
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      punch_type: "CLOCK_IN",
      date: "",
      time: "",
      reason: "",
    },
  });

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

  // Set initial today date
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  // Fetch / Load data from IndexedDB
  const loadData = async (date: string, contractorId: string) => {
    if (!date) return;
    try {
      const db = await getDB();

      // contractors
      const contractorsTx = db.transaction("contractors", "readonly");
      const allContractors = await contractorsTx.objectStore("contractors").getAll();
      await contractorsTx.done;
      setContractorsList(allContractors.filter((c) => c.status === "ACTIVE"));

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

      // Filtering by local date and contractor id
      const filtered = allRecords.filter((r) => {
        const d = new Date(r.clocked_at);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const localDateStr = `${y}-${m}-${day}`;

        const matchesDate = localDateStr === date;
        const matchesContractor = contractorId === "ALL" || r.contractor_id === contractorId;
        return matchesDate && matchesContractor;
      });

      // Enriching details
      const enriched = [];
      for (const r of filtered) {
        const worker = workersMap.get(r.worker_id);
        const contractor = contractorsMap.get(r.contractor_id);

        let photoUrl = null;
        if (r.photo_object_id) {
          const photoTx = db.transaction("photo_blobs", "readonly");
          const photoRecord = await photoTx.objectStore("photo_blobs").get(r.photo_object_id);
          await photoTx.done;
          if (photoRecord && photoRecord.blob) {
            photoUrl = URL.createObjectURL(photoRecord.blob);
          }
        }

        enriched.push({
          ...r,
          worker_name: worker ? worker.name : "不明な作業員",
          contractor_name: contractor ? contractor.name : "不明な外注先",
          photo_url: photoUrl,
        });
      }

      // Sort by clocked_at descending
      enriched.sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime());

      // Set state and revoke previous URLs
      setAttendanceRecords((prev) => {
        prev.forEach((r) => {
          if (r.photo_url) {
            URL.revokeObjectURL(r.photo_url);
          }
        });
        return enriched;
      });
    } catch (err) {
      console.error("Failed to load attendance history", err);
    }
  };

  // Trigger reloading on filter change
  useEffect(() => {
    if (!isAuthLoading && selectedDate) {
      loadData(selectedDate, selectedContractorId);
      setCurrentPage(1);
    }
  }, [isAuthLoading, selectedDate, selectedContractorId]);

  // Clean up Object URLs on unmount
  useEffect(() => {
    return () => {
      attendanceRecords.forEach((r) => {
        if (r.photo_url) {
          URL.revokeObjectURL(r.photo_url);
        }
      });
    };
  }, [attendanceRecords]);

  // Logout handle
  const handleLogout = () => {
    logout();
    router.push("/admin-login");
  };

  // Open photo modal helper
  const openPhotoModal = (url: string) => {
    setActivePhotoUrl(url);
    setIsPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    setIsPhotoModalOpen(false);
    setActivePhotoUrl(null);
  };

  // Open correction modal helper
  const openCorrectionModal = (record: any) => {
    setEditingRecord(record);
    const d = new Date(record.clocked_at);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");

    reset({
      punch_type: record.punch_type,
      date: `${y}-${m}-${day}`,
      time: `${hh}:${min}`,
      reason: "",
    });
    setIsCorrectionModalOpen(true);
  };

  // Submit correction handle
  const onCorrectionSubmit = async (data: CorrectionFormValues) => {
    try {
      const storedId = sessionStorage.getItem("user_id") || "user-admin";
      const localDateTimeStr = `${data.date}T${data.time}`;
      const dateObj = new Date(localDateTimeStr);
      if (isNaN(dateObj.getTime())) {
        alert("無効な日時形式です。");
        return;
      }
      const clockedAtISO = dateObj.toISOString();

      await saveAttendanceCorrection({
        attendance_id: editingRecord.attendance_id,
        worker_id: editingRecord.worker_id,
        punch_type: data.punch_type,
        punched_at: clockedAtISO,
        reason: data.reason,
        userId: storedId,
        contractorId: editingRecord.contractor_id,
      });

      setIsCorrectionModalOpen(false);
      await loadData(selectedDate, selectedContractorId);
    } catch (err) {
      console.error("Failed to save correction", err);
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
    { name: "打刻履歴確認", href: "/attendance-history", icon: ClipboardListIcon, active: true },
    { name: "労働時間集計", href: "/labor-summary", icon: CalendarDaysIcon },
    { name: "外注先企業登録", href: "/contractor-register", icon: Building2Icon },
    { name: "管理者ユーザー登録", href: "/admin-users", icon: UserPlus2Icon },
  ];

  // Pagination calculation
  const totalPages = Math.ceil(attendanceRecords.length / itemsPerPage);
  const paginatedRecords = attendanceRecords.slice(
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
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl tracking-tight">
            打刻履歴確認
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            日別・外注先別に作業員の打刻実績および撮影写真の確認が行えます。
          </p>
        </div>

        {/* フィルタ条件領域 (SCR-012-UI-001) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="filter-date" className="block text-sm font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <CalendarIcon className="h-4 w-4 text-slate-400" />
              <span>対象日付</span>
            </label>
            <input
              id="filter-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              style={{ minHeight: "44px" }}
              data-testid="date-filter"
            />
          </div>

          <div className="flex-1">
            <label htmlFor="filter-contractor" className="block text-sm font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <BuildingIcon className="h-4 w-4 text-slate-400" />
              <span>外注先企業</span>
            </label>
            <select
              id="filter-contractor"
              value={selectedContractorId}
              onChange={(e) => setSelectedContractorId(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              style={{ minHeight: "44px" }}
              data-testid="contractor-filter"
            >
              <option value="ALL">すべて表示</option>
              {contractorsList.map((c) => (
                <option key={c.contractor_id} value={c.contractor_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* テーブル形式での打刻履歴一覧表示 (SCR-012-UI-002, SCR-012-UI-003) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-sm font-bold text-slate-600">作業員名</th>
                  <th className="px-6 py-3 text-sm font-bold text-slate-600">外注先</th>
                  <th className="px-6 py-3 text-sm font-bold text-slate-600">打刻日時</th>
                  <th className="px-6 py-3 text-sm font-bold text-slate-600">種別</th>
                  <th className="px-6 py-3 text-sm font-bold text-slate-600">撮影写真</th>
                  <th className="px-6 py-3 text-sm font-bold text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white" data-testid="attendance-table-body">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                      指定された条件に合致する打刻履歴はありません。
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => (
                    <tr key={record.attendance_id} className="hover:bg-slate-50/50 transition-colors" data-testid={`attendance-row-${record.attendance_id}`}>
                      <td className="px-6 py-4 text-base font-bold text-slate-900" data-testid={`row-worker-name-${record.attendance_id}`}>
                        {record.worker_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600" data-testid={`row-contractor-name-${record.attendance_id}`}>
                        {record.contractor_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-mono">
                        {new Date(record.clocked_at).toLocaleString("ja-JP", {
                          hour12: false,
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {record.punch_type === "CLOCK_IN" ? (
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold shadow-sm" data-testid="status-clock-in">
                            出勤
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold shadow-sm" data-testid="status-clock-out">
                            退勤
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {record.photo_url ? (
                          <div
                            onClick={() => openPhotoModal(record.photo_url)}
                            className="w-16 h-12 border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-85 transition-opacity relative"
                            data-testid={`photo-thumbnail-${record.attendance_id}`}
                          >
                            <img
                              src={record.photo_url}
                              alt="サムネイル"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">写真なし</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => openCorrectionModal(record)}
                          className="flex items-center space-x-1 px-3 py-1.5 border border-slate-300 hover:border-slate-400 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                          style={{ minHeight: "36px" }}
                          data-testid={`correct-btn-${record.attendance_id}`}
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                          <span>修正</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ページネーション (SCR-012-UI-004) */}
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
                    全 <span className="font-bold">{attendanceRecords.length}</span> 件中{" "}
                    <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> から{" "}
                    <span className="font-bold">
                      {Math.min(currentPage * itemsPerPage, attendanceRecords.length)}
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

      {/* 写真拡大モーダル (SCR-012-FN-005) */}
      {isPhotoModalOpen && activePhotoUrl && (
        <div
          onClick={closePhotoModal}
          className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 animate-fade-in"
          data-testid="photo-modal-overlay"
        >
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={closePhotoModal}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-800/80 hover:bg-slate-800 text-white rounded-full shadow-md transition-colors"
              aria-label="モーダルを閉じる"
              data-testid="close-photo-modal-btn"
            >
              <XIcon className="h-6 w-6" />
            </button>
            <div className="aspect-video w-full flex items-center justify-center">
              <img
                src={activePhotoUrl}
                alt="撮影写真（拡大）"
                className="max-h-[80vh] object-contain w-full h-full"
                data-testid="photo-modal-image"
              />
            </div>
          </div>
        </div>
      )}

      {/* 打刻修正モーダル (SCR-012-FN-006) */}
      {isCorrectionModalOpen && editingRecord && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
          data-testid="correction-modal-overlay"
        >
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900" data-testid="correction-modal-title">
                打刻修正 : {editingRecord.worker_name}
              </h2>
              <button
                onClick={() => setIsCorrectionModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                aria-label="閉じる"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onCorrectionSubmit)} className="space-y-4">
              {/* 打刻種別 */}
              <div>
                <span className="block text-sm font-semibold text-slate-700 mb-2">
                  打刻種別 <span className="text-red-500 text-xs font-bold">(必須)</span>
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center justify-center border rounded-xl p-3 cursor-pointer select-none transition-all hover:bg-slate-50">
                    <input
                      type="radio"
                      value="CLOCK_IN"
                      {...register("punch_type")}
                      className="h-5 w-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                      data-testid="modal-punch-type-in"
                    />
                    <span className="ml-2 text-sm font-bold text-slate-800">出勤</span>
                  </label>
                  <label className="flex items-center justify-center border rounded-xl p-3 cursor-pointer select-none transition-all hover:bg-slate-50">
                    <input
                      type="radio"
                      value="CLOCK_OUT"
                      {...register("punch_type")}
                      className="h-5 w-5 text-orange-600 border-slate-300 focus:ring-blue-500"
                      data-testid="modal-punch-type-out"
                    />
                    <span className="ml-2 text-sm font-bold text-slate-800">退勤</span>
                  </label>
                </div>
              </div>

              {/* 日時設定 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-date" className="block text-sm font-semibold text-slate-700 mb-1">
                    日付 <span className="text-red-500 text-xs font-bold">(必須)</span>
                  </label>
                  <input
                    id="modal-date"
                    type="date"
                    {...register("date")}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    style={{ minHeight: "44px" }}
                    data-testid="modal-date-input"
                  />
                </div>
                <div>
                  <label htmlFor="modal-time" className="block text-sm font-semibold text-slate-700 mb-1">
                    時刻 <span className="text-red-500 text-xs font-bold">(必須)</span>
                  </label>
                  <input
                    id="modal-time"
                    type="time"
                    {...register("time")}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    style={{ minHeight: "44px" }}
                    data-testid="modal-time-input"
                  />
                </div>
              </div>

              {/* 修正理由 */}
              <div>
                <label htmlFor="modal-reason" className="block text-sm font-semibold text-slate-700 mb-1">
                  修正理由 <span className="text-red-500 text-xs font-bold">(必須)</span>
                </label>
                <textarea
                  id="modal-reason"
                  rows={3}
                  {...register("reason")}
                  placeholder="修正・手動登録の理由を詳しく入力してください。"
                  className={`block w-full rounded-lg border px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                    errors.reason ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
                  }`}
                  style={{ minHeight: "80px" }}
                  data-testid="modal-reason-textarea"
                />
                {errors.reason && (
                  <p className="mt-1 text-sm text-red-600 font-medium" data-testid="modal-reason-error">
                    {errors.reason.message}
                  </p>
                )}
              </div>

              {/* 操作ボタン */}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="w-1/2 border-2 border-slate-300 bg-white text-slate-800 rounded-xl py-2.5 text-sm font-bold hover:bg-slate-50 transition-colors"
                  style={{ minHeight: "44px" }}
                  data-testid="modal-cancel-btn"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-bold shadow hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center disabled:bg-blue-400"
                  style={{ minHeight: "44px" }}
                  data-testid="modal-submit-btn"
                >
                  {isSubmitting ? "送信中..." : "保存する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}