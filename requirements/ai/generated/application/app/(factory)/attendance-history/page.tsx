"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAdminAttendanceHistoryUseCase, AdminAttendanceHistoryItem } from "@/features/attendance/usecase/getAdminAttendanceHistoryUseCase";
import { getPhotoBlobUseCase } from "@/features/attendance/usecase/getPhotoBlobUseCase";
import { getContractorsUseCase, ContractorDto } from "@/features/attendance/usecase/getContractorsUseCase";
import { submitPunchCorrectionUseCase } from "@/features/attendance/usecase/submitPunchCorrectionUseCase";
import { logger } from "@/lib/logger/logger";

// 修正用Zodスキーマ (SCR-012-VL-002)
const correctionSchema = z.object({
  clockedAt: z.string().min(1, { message: "打刻日時を入力してください" }),
  punchType: z.enum(["CLOCK_IN", "CLOCK_OUT"], { required_error: "打刻種別を選択してください" }),
  reason: z.string().trim().min(1, { message: "修正理由は必須入力です" }),
});

type CorrectionFormValues = z.infer<typeof correctionSchema>;

// サムネイル画像用のコンポーネント (SCR-012-FN-004, SCR-012-UT-002)
const ThumbnailImage = ({ photoObjectId, onClick }: { photoObjectId: string; onClick: () => void }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (photoObjectId === "MANUAL_CORRECTION") return;

    let active = true;
    let objectUrl: string | null = null;

    getPhotoBlobUseCase(photoObjectId).then((result) => {
      if (active && result.success) {
        objectUrl = URL.createObjectURL(result.value);
        setUrl(objectUrl);
      }
    });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoObjectId]);

  if (photoObjectId === "MANUAL_CORRECTION") {
    return <span className="text-xs text-gray-400 italic">なし(手動)</span>;
  }

  if (!url) {
    return <div className="h-10 w-10 bg-gray-200 animate-pulse rounded" />;
  }

  return (
    <img
      src={url}
      alt="Thumbnail"
      onClick={onClick}
      className="h-10 w-10 object-cover rounded cursor-pointer border border-gray-200 hover:opacity-80 transition-opacity"
      data-testid="thumbnail-image"
    />
  );
};

// 拡大表示モーダルコンポーネント (SCR-012-FN-005, SCR-012-EV-002, SCR-012-UT-002)
const PhotoModal = ({ photoObjectId, onClose }: { photoObjectId: string; onClose: () => void }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    getPhotoBlobUseCase(photoObjectId).then((result) => {
      if (active && result.success) {
        objectUrl = URL.createObjectURL(result.value);
        setUrl(objectUrl);
      }
    });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoObjectId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
      data-testid="photo-modal"
    >
      <div
        className="relative max-w-3xl max-h-[90vh] bg-white p-2 rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {url ? (
          <img
            src={url}
            alt="Enlarged punch"
            className="max-w-full max-h-[80vh] object-contain rounded"
            data-testid="enlarged-photo"
          />
        ) : (
          <div className="h-64 w-64 flex items-center justify-center text-gray-500">読み込み中...</div>
        )}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center font-bold text-lg"
          data-testid="close-modal-button"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default function AttendanceHistoryPage() {
  const router = useRouter();
  const [userName] = useState<string>("管理者");

  // State (SCR-012-ST-001, SCR-012-ST-002, SCR-012-ST-003, SCR-012-ST-004)
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterContractorId, setFilterContractorId] = useState<string>("");
  
  const [punches, setPunches] = useState<AdminAttendanceHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [contractors, setContractors] = useState<ContractorDto[]>([]);

  // モーダル表示状態
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [editingPunch, setEditingPunch] = useState<AdminAttendanceHistoryItem | null>(null);
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ページネーション状態 (SCR-012-UI-004)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // 1. 認証と初期ロード
  useEffect(() => {
    const userId = sessionStorage.getItem("user_id");
    const role = sessionStorage.getItem("role");

    // 認証ガード (SCR-012-VL-003, SCR-012-E2E-001)
    if (!userId || !role || role !== "FACTORY_ADMIN") {
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("role");
      router.replace("/admin-login");
      return;
    }

    // デフォルト日付を本日に設定 (JST)
    const jstOffset = 9 * 60 * 60 * 1000;
    const todayStr = new Date(Date.now() + jstOffset).toISOString().split("T")[0];
    setFilterDate(todayStr);

    loadInitialData(todayStr);
  }, [router]);

  const loadInitialData = async (initialDate: string) => {
    setLoading(true);
    try {
      // 外注先企業リスト取得 (SCR-012-DT-004)
      const contractorResult = await getContractorsUseCase();
      if (contractorResult.success) {
        setContractors(contractorResult.value);
      }

      // 打刻履歴取得 (SCR-012-DT-001)
      const punchesResult = await getAdminAttendanceHistoryUseCase({
        date: initialDate,
      });
      if (punchesResult.success) {
        setPunches(punchesResult.value.punches);
      } else {
        if ("error" in punchesResult) {
          setError(punchesResult.error.message);
        } else {
          setError("打刻履歴の取得に失敗しました。");
        }
      }
    } catch (err) {
      setError("データの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // 2. 検索フィルタ適用 (SCR-012-EV-001, SCR-012-VL-001)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 日付バリデーション (SCR-012-VL-001)
    if (filterDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(filterDate) || isNaN(Date.parse(filterDate))) {
        alert("有効な日付形式（YYYY-MM-DD）で入力してください。");
        return;
      }
    }

    setLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      const punchesResult = await getAdminAttendanceHistoryUseCase({
        date: filterDate || undefined,
        contractorId: filterContractorId || undefined,
      });

      if (punchesResult.success) {
        setPunches(punchesResult.value.punches);
      } else {
        if ("error" in punchesResult) {
          setError(punchesResult.error.message);
        } else {
          setError("打刻履歴の取得に失敗しました。");
        }
      }
    } catch (err) {
      setError("打刻履歴の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // フィルタクリア
  const handleClearFilters = async () => {
    setFilterDate("");
    setFilterContractorId("");
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      const punchesResult = await getAdminAttendanceHistoryUseCase({});
      if (punchesResult.success) {
        setPunches(punchesResult.value.punches);
      } else {
        if ("error" in punchesResult) {
          setError(punchesResult.error.message);
        } else {
          setError("打刻履歴の取得に失敗しました。");
        }
      }
    } catch (err) {
      setError("打刻履歴の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // 3. 打刻修正フォーム設定 (SCR-012-EV-003)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
  });

  const openCorrectionDialog = (punch: AdminAttendanceHistoryItem) => {
    setEditingPunch(punch);
    
    // ISO8601日時を datetime-local 形式 (yyyy-MM-ddThh:mm) に変換
    const localDate = new Date(punch.clocked_at);
    const formattedDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    reset({
      clockedAt: formattedDate,
      punchType: punch.punch_type,
      reason: "",
    });
  };

  // 4. 打刻修正保存 (SCR-012-EV-004, SCR-012-DT-003)
  const onSubmitCorrection = async (data: CorrectionFormValues) => {
    if (!editingPunch || isSubmittingCorrection) return;
    setIsSubmittingCorrection(true);

    const userId = sessionStorage.getItem("user_id") || "";

    try {
      const isoPunchedAt = new Date(data.clockedAt).toISOString();

      const result = await submitPunchCorrectionUseCase({
        attendanceId: editingPunch.attendance_id,
        workerId: editingPunch.worker_id,
        contractorId: editingPunch.contractor_id,
        punchType: data.punchType,
        punchedAt: isoPunchedAt,
        reason: data.reason,
        correctedBy: userId,
        actorRole: "FACTORY_ADMIN", // 工場管理者として修正を登録
      });

      if (result.success) {
        showToast("打刻実績を修正しました。");
        setEditingPunch(null);
        
        // 修正後に一覧を再ロード
        const reloadResult = await getAdminAttendanceHistoryUseCase({
          date: filterDate || undefined,
          contractorId: filterContractorId || undefined,
        });
        if (reloadResult.success) {
          setPunches(reloadResult.value.punches);
        }
      } else {
        alert("修正の保存に失敗しました。");
      }
    } catch (err) {
      alert("保存処理中にエラーが発生しました。");
    } finally {
      setIsSubmittingCorrection(false);
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

  // ページネーションの計算 (SCR-012-UI-004)
  const totalPages = Math.ceil(punches.length / itemsPerPage);
  const displayedPunches = punches.slice(
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
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg bg-blue-600 text-white"
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
            <h1 className="text-xl font-bold text-gray-900">打刻履歴確認</h1>
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

        {/* モバイル用簡易ナビゲーション (dashboard/page.tsx と一貫) */}
        <div className="md:hidden bg-slate-950 p-2 flex overflow-x-auto gap-2 border-b border-slate-800">
          <a
            href="/dashboard"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded text-slate-300 bg-slate-900 hover:text-white"
          >
            📊 ダッシュボード
          </a>
          <a
            href="/attendance-history"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white"
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

          {/* 検索・絞り込みフィルタ (SCR-012-UI-001) */}
          <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <label htmlFor="filter-date" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  打刻日付 (YYYY-MM-DD)
                </label>
                <input
                  id="filter-date"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-11"
                  data-testid="filter-date-input"
                />
              </div>

              <div className="flex-1">
                <label htmlFor="filter-contractor" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  外注先企業
                </label>
                <select
                  id="filter-contractor"
                  value={filterContractorId}
                  onChange={(e) => setFilterContractorId(e.target.value)}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white h-11"
                  data-testid="filter-contractor-select"
                >
                  <option value="">-- すべての外注先 --</option>
                  {contractors.map((c) => (
                    <option key={c.contractor_id} value={c.contractor_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 md:flex-none inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-base font-bold text-white shadow-md hover:bg-blue-700 h-11 min-w-[100px]"
                  data-testid="search-button"
                >
                  検索
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="flex-1 md:flex-none inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 h-11 min-w-[100px]"
                  data-testid="clear-button"
                >
                  クリア
                </button>
              </div>
            </form>
          </section>

          {/* 履歴リスト領域 - レスポンシブ対応 (SCR-012-UI-002, SCR-012-UI-003, SCR-012-UI-005) */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center" data-testid="loading-indicator">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
                <p className="text-gray-500 text-sm mt-3 font-medium">履歴を取得中...</p>
              </div>
            ) : punches.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-medium" data-testid="empty-state">
                該当する打刻履歴はありません。
              </div>
            ) : (
              <>
                {/* 1. PC向けテーブル表示 (SCR-012-UI-002) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">作業員名</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">外注先名</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">打刻種別</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">打刻日時</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">写真</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">アクション</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200" data-testid="punch-table-body">
                      {displayedPunches.map((punch) => (
                        <tr key={punch.attendance_id} data-testid={`punch-row-${punch.attendance_id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-testid={`worker-name-${punch.attendance_id}`}>
                            {punch.worker_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600" data-testid={`contractor-name-${punch.attendance_id}`}>
                            {punch.contractor_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" data-testid={`punch-type-${punch.attendance_id}`}>
                            {punch.punch_type === "CLOCK_IN" ? (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">出勤</span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">退勤</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700" data-testid={`clocked-at-${punch.attendance_id}`}>
                            {new Date(punch.clocked_at).toLocaleString("ja-JP")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" data-testid={`photo-col-${punch.attendance_id}`}>
                            <ThumbnailImage
                              photoObjectId={punch.photo_object_id}
                              onClick={() => setActivePhotoId(punch.photo_object_id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openCorrectionDialog(punch)}
                              className="text-blue-600 hover:text-blue-900 font-bold"
                              data-testid={`edit-button-${punch.attendance_id}`}
                            >
                              修正
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 2. モバイル向けカード表示 (SCR-012-UI-005) */}
                <div className="md:hidden divide-y divide-gray-200">
                  {displayedPunches.map((punch) => (
                    <div key={punch.attendance_id} className="p-4 space-y-3 bg-white" data-testid={`punch-card-${punch.attendance_id}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-base font-bold text-gray-900">{punch.worker_name}</p>
                          <p className="text-xs text-gray-500">{punch.contractor_name}</p>
                        </div>
                        {punch.punch_type === "CLOCK_IN" ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">出勤</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">退勤</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm font-mono text-gray-700">
                          {new Date(punch.clocked_at).toLocaleString("ja-JP")}
                        </div>
                        <ThumbnailImage
                          photoObjectId={punch.photo_object_id}
                          onClick={() => setActivePhotoId(punch.photo_object_id)}
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => openCorrectionDialog(punch)}
                          className="w-full sm:w-auto inline-flex justify-center items-center rounded border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 h-10"
                          data-testid={`mobile-edit-button-${punch.attendance_id}`}
                        >
                          修正
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ページネーションコントロール (SCR-012-UI-004) */}
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

      {/* 写真拡大モーダル (SCR-012-EV-002) */}
      {activePhotoId && (
        <PhotoModal
          photoObjectId={activePhotoId}
          onClose={() => setActivePhotoId(null)}
        />
      )}

      {/* 打刻修正モーダルダイアログ (SCR-012-EV-003, SCR-012-EV-004, SCR-012-FN-006, SCR-012-VL-002) */}
      {editingPunch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          role="dialog"
          aria-modal="true"
          data-testid="correction-modal"
        >
          <div
            className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b pb-4">
              <h2 className="text-lg font-bold text-gray-900">
                打刻の修正 (作業員: {editingPunch.worker_name})
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                打刻日時や打刻種別の修正を行い、理由を入力してください。
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmitCorrection)} className="space-y-4">
              <div>
                <label htmlFor="clockedAt" className="block text-sm font-bold text-gray-700 mb-1">
                  打刻日時 <span className="text-red-500 text-xs">*必須</span>
                </label>
                <input
                  id="clockedAt"
                  type="datetime-local"
                  {...register("clockedAt")}
                  className={`block w-full rounded border px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 bg-white ${
                    errors.clockedAt ? "border-red-500" : "border-gray-300"
                  }`}
                  data-testid="correction-date-input"
                />
                {errors.clockedAt && (
                  <p className="mt-1 text-sm text-red-600" data-testid="correction-date-error">
                    {errors.clockedAt.message}
                  </p>
                )}
              </div>

              <div>
                <span className="block text-sm font-bold text-gray-700 mb-2">
                  打刻種別 <span className="text-red-500 text-xs">*必須</span>
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-center rounded-lg border border-gray-300 p-3 cursor-pointer h-11 text-sm font-bold hover:bg-gray-50">
                    <input
                      type="radio"
                      value="CLOCK_IN"
                      {...register("punchType")}
                      className="mr-2"
                      data-testid="correction-type-in"
                    />
                    <span>🌅 出勤</span>
                  </label>
                  <label className="flex items-center justify-center rounded-lg border border-gray-300 p-3 cursor-pointer h-11 text-sm font-bold hover:bg-gray-50">
                    <input
                      type="radio"
                      value="CLOCK_OUT"
                      {...register("punchType")}
                      className="mr-2"
                      data-testid="correction-type-out"
                    />
                    <span>🌃 退勤</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-bold text-gray-700 mb-1">
                  修正理由 <span className="text-red-500 text-xs">*必須</span>
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  placeholder="例: 早出の代理修正のため"
                  {...register("reason")}
                  className={`block w-full rounded border px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                    errors.reason ? "border-red-500" : "border-gray-300"
                  }`}
                  data-testid="correction-reason-input"
                />
                {errors.reason && (
                  <p className="mt-1 text-sm text-red-600" data-testid="correction-reason-error">
                    {errors.reason.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingPunch(null)}
                  disabled={isSubmittingCorrection}
                  className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none h-12"
                  data-testid="cancel-correction-button"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection}
                  className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-md hover:bg-blue-700 focus:outline-none h-12 disabled:bg-gray-400"
                  data-testid="submit-correction-button"
                >
                  {isSubmittingCorrection ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}