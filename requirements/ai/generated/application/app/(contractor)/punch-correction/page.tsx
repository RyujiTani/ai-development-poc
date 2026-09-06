"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getDB } from "@/lib/db";
import { Worker } from "@/features/worker/domain/types";
import { saveAttendanceCorrection } from "@/features/attendance/repository/attendanceRepository";

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

const correctionSchema = z.object({
  worker_id: z.string().min(1, "作業員を選択してください"),
  punch_type: z.enum(["CLOCK_IN", "CLOCK_OUT"], {
    errorMap: () => ({ message: "打刻種別を選択してください" }),
  }),
  punched_at_date: z.string().min(1, "日付を入力してください"),
  punched_at_time: z.string().min(1, "時刻を入力してください"),
  reason: z.string().trim().min(1, "修正理由を入力してください"),
});

type CorrectionFormValues = z.infer<typeof correctionSchema>;

function PunchCorrectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      worker_id: "",
      punch_type: "CLOCK_IN",
      punched_at_date: "",
      punched_at_time: "",
      reason: "",
    },
  });

  useEffect(() => {
    async function initPage() {
      if (typeof sessionStorage === "undefined") {
        setIsLoading(false);
        return;
      }

      const storedId = sessionStorage.getItem("user_id");
      const storedRole = sessionStorage.getItem("role");
      const storedContractorId = sessionStorage.getItem("contractor_id");

      // 未認証・権限なしリダイレクト (SCR-009-VL-005)
      if (!storedId || storedRole !== "CONTRACTOR_MANAGER" || !storedContractorId) {
        router.push("/login");
        return;
      }

      try {
        const db = await getDB();

        // 作業員リストロード
        const workerTx = db.transaction("workers", "readonly");
        const allWorkers: Worker[] = await workerTx.objectStore("workers").getAll();
        await workerTx.done;

        const filteredWorkers = allWorkers
          .filter((w) => w.contractor_id === storedContractorId && w.status === "ACTIVE")
          .sort((a, b) => a.name.localeCompare(b.name, "ja"));
        setWorkers(filteredWorkers);

        // 既存打刻レコード修正（編集モード）の処理
        const attendanceId = searchParams ? searchParams.get("attendance_id") : null;
        if (attendanceId) {
          const recordTx = db.transaction("attendance_records", "readonly");
          const record = await recordTx.objectStore("attendance_records").get(attendanceId);
          await recordTx.done;

          if (record) {
            // 認可チェック: 自社 contractor_id のデータのみ操作可能
            if (record.contractor_id !== storedContractorId) {
              setErrorMessage("この打刻レコードを編集する権限がありません。");
              setIsLoading(false);
              return;
            }

            setIsEditMode(true);
            setValue("worker_id", record.worker_id);
            setValue("punch_type", record.punch_type);

            const date = new Date(record.clocked_at);
            // ローカルタイムで日付・時刻文字列へ変換
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");
            const hh = String(date.getHours()).padStart(2, "0");
            const min = String(date.getMinutes()).padStart(2, "0");

            setValue("punched_at_date", `${yyyy}-${mm}-${dd}`);
            setValue("punched_at_time", `${hh}:${min}`);
          }
        }
      } catch (error) {
        console.error("Failed to load layout data", error);
        setErrorMessage("データの初期化に失敗しました。");
      } finally {
        setIsLoading(false);
      }
    }

    initPage();
  }, [router, searchParams, setValue]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const onSubmit = async (data: CorrectionFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const storedId = sessionStorage.getItem("user_id") || "";
      const storedContractorId = sessionStorage.getItem("contractor_id") || "";

      // 入力された日付と時刻を ISO8601 文字列に組み立てる
      const localDateTimeStr = `${data.punched_at_date}T${data.punched_at_time}`;
      const dateObj = new Date(localDateTimeStr);
      if (isNaN(dateObj.getTime())) {
        throw new Error("無効な日時形式です。");
      }
      const clockedAtISO = dateObj.toISOString();

      const attendanceId = searchParams ? searchParams.get("attendance_id") : undefined;

      await saveAttendanceCorrection({
        attendance_id: attendanceId || undefined,
        worker_id: data.worker_id,
        punch_type: data.punch_type,
        punched_at: clockedAtISO,
        reason: data.reason,
        userId: storedId,
        contractorId: storedContractorId,
      });

      setToast({ type: "success", text: "打刻修正を登録しました" });
      
      // 送信成功トースト表示から遷移までの間に余韻をもたせる
      setTimeout(() => {
        router.push("/home"); // SCR-009-EV-001
      }, 1000);
    } catch (error) {
      console.error("Failed to submit correction", error);
      setErrorMessage(error instanceof Error ? error.message : "打刻修正の登録に失敗しました。");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/home"); // SCR-009-EV-002
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
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen relative">
      {toast && (
        <div
          data-testid="toast-message"
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3.5 rounded-xl shadow-lg text-white text-base font-bold bg-emerald-600 max-w-sm text-center"
        >
          {toast.text}
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex items-center space-x-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            style={{ minHeight: "44px" }}
            aria-label="戻る"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>キャンセル</span>
          </button>
          <h1 className="text-lg font-bold text-slate-900">
            {isEditMode ? "打刻データの修正" : "手動打刻の登録"}
          </h1>
          <div className="w-[76px]" />
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:px-6 flex flex-col justify-start">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 font-bold" data-testid="error-message">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            {/* 対象作業員選択 */}
            <div>
              <label htmlFor="worker_id" className="block text-sm font-semibold text-slate-700">
                対象作業員 <span className="text-red-500 text-xs font-bold">(必須)</span>
              </label>
              <div className="mt-1">
                <select
                  id="worker_id"
                  {...register("worker_id")}
                  disabled={isSubmitting || isEditMode}
                  className={`block w-full rounded-lg border bg-white px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                    errors.worker_id ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
                  }`}
                  style={{ minHeight: "44px" }}
                  data-testid="worker-select"
                >
                  <option value="">作業員を選択してください</option>
                  {workers.map((worker) => (
                    <option key={worker.worker_id} value={worker.worker_id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.worker_id && (
                <p className="mt-1.5 text-sm text-red-600 font-medium" data-testid="error-worker-id">
                  {errors.worker_id.message}
                </p>
              )}
            </div>

            {/* 打刻種別 */}
            <div>
              <span className="block text-sm font-semibold text-slate-700 mb-2">
                打刻種別 <span className="text-red-500 text-xs font-bold">(必須)</span>
              </span>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className="flex items-center justify-center border rounded-xl p-4 cursor-pointer select-none transition-all hover:bg-slate-50"
                  style={{ minHeight: "50px" }}
                >
                  <input
                    type="radio"
                    value="CLOCK_IN"
                    {...register("punch_type")}
                    disabled={isSubmitting}
                    className="h-5 w-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                    data-testid="punch-type-in"
                  />
                  <span className="ml-2.5 text-base font-bold text-slate-800">出勤</span>
                </label>
                <label
                  className="flex items-center justify-center border rounded-xl p-4 cursor-pointer select-none transition-all hover:bg-slate-50"
                  style={{ minHeight: "50px" }}
                >
                  <input
                    type="radio"
                    value="CLOCK_OUT"
                    {...register("punch_type")}
                    disabled={isSubmitting}
                    className="h-5 w-5 text-orange-600 border-slate-300 focus:ring-blue-500"
                    data-testid="punch-type-out"
                  />
                  <span className="ml-2.5 text-base font-bold text-slate-800">退勤</span>
                </label>
              </div>
              {errors.punch_type && (
                <p className="mt-1.5 text-sm text-red-600 font-medium" data-testid="error-punch-type">
                  {errors.punch_type.message}
                </p>
              )}
            </div>

            {/* 打刻日時（日付/時刻） */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="punched_at_date" className="block text-sm font-semibold text-slate-700">
                  日付 <span className="text-red-500 text-xs font-bold">(必須)</span>
                </label>
                <div className="mt-1">
                  <input
                    id="punched_at_date"
                    type="date"
                    {...register("punched_at_date")}
                    disabled={isSubmitting}
                    className={`block w-full rounded-lg border px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                      errors.punched_at_date ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
                    }`}
                    style={{ minHeight: "44px" }}
                    data-testid="punched-at-date"
                  />
                </div>
                {errors.punched_at_date && (
                  <p className="mt-1.5 text-sm text-red-600 font-medium" data-testid="error-punched-at-date">
                    {errors.punched_at_date.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="punched_at_time" className="block text-sm font-semibold text-slate-700">
                  時刻 <span className="text-red-500 text-xs font-bold">(必須)</span>
                </label>
                <div className="mt-1">
                  <input
                    id="punched_at_time"
                    type="time"
                    {...register("punched_at_time")}
                    disabled={isSubmitting}
                    className={`block w-full rounded-lg border px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                      errors.punched_at_time ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
                    }`}
                    style={{ minHeight: "44px" }}
                    data-testid="punched-at-time"
                  />
                </div>
                {errors.punched_at_time && (
                  <p className="mt-1.5 text-sm text-red-600 font-medium" data-testid="error-punched-at-time">
                    {errors.punched_at_time.message}
                  </p>
                )}
              </div>
            </div>

            {/* 修正理由 */}
            <div>
              <label htmlFor="reason" className="block text-sm font-semibold text-slate-700">
                修正理由 <span className="text-red-500 text-xs font-bold">(必須)</span>
              </label>
              <div className="mt-1">
                <textarea
                  id="reason"
                  rows={3}
                  {...register("reason")}
                  disabled={isSubmitting}
                  className={`block w-full rounded-lg border px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                    errors.reason ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
                  }`}
                  placeholder="修正理由を入力してください (例: 打刻忘れ、端末不具合など)"
                  style={{ minHeight: "88px" }}
                  data-testid="reason-textarea"
                />
              </div>
              {errors.reason && (
                <p className="mt-1.5 text-sm text-red-600 font-medium" data-testid="error-reason">
                  {errors.reason.message}
                </p>
              )}
            </div>
          </div>

          {/* ボタン操作 */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="w-full sm:w-1/2 border-2 border-slate-300 bg-white text-slate-800 rounded-xl py-3.5 text-base font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center"
              style={{ minHeight: "50px" }}
              data-testid="cancel-btn"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-1/2 bg-blue-600 text-white rounded-xl py-3.5 text-base font-bold shadow hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center disabled:bg-blue-400 disabled:cursor-not-allowed"
              style={{ minHeight: "50px" }}
              data-testid="submit-btn"
            >
              {isSubmitting ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>送信中...</span>
                </span>
              ) : (
                "送信する"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function PunchCorrectionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
          <div className="flex items-center space-x-2 text-slate-600">
            <span className="font-semibold text-lg">読み込み中...</span>
          </div>
        </div>
      }
    >
      <PunchCorrectionContent />
    </Suspense>
  );
}