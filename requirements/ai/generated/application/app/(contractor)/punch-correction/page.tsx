"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getUserMeUseCase, UserMeResult } from "@/features/user/usecase/getUserMeUseCase";
import { getWorkersUseCase } from "@/features/worker/usecase/getWorkersUseCase";
import { getAttendanceRecordsUseCase } from "@/features/attendance/usecase/getAttendanceRecordsUseCase";
import { getAttendanceRecordByIdUseCase } from "@/features/attendance/usecase/getAttendanceRecordByIdUseCase";
import { submitPunchCorrectionUseCase } from "@/features/attendance/usecase/submitPunchCorrectionUseCase";
import { Worker } from "@/features/worker/domain/Worker";
import { AttendanceRecord } from "@/features/attendance/domain/AttendanceRecord";

const correctionSchema = z.object({
  mode: z.enum(["CREATE", "EDIT"]),
  attendanceId: z.string().optional(),
  workerId: z.string().min(1, { message: "作業員を選択してください" }),
  punchType: z.enum(["CLOCK_IN", "CLOCK_OUT"], { required_error: "打刻種別を選択してください" }),
  punchedAt: z.string().min(1, { message: "日時を入力してください" }),
  reason: z.string().trim().min(1, { message: "修正理由を入力してください" }),
}).superRefine((data, ctx) => {
  if (data.mode === "EDIT" && (!data.attendanceId || data.attendanceId === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "修正対象の打刻データを選択してください",
      path: ["attendanceId"],
    });
  }
});

type CorrectionFormValues = z.infer<typeof correctionSchema>;

export default function PunchCorrectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryAttendanceId = searchParams ? searchParams.get("attendance_id") : null;

  const [user, setUser] = useState<UserMeResult | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      mode: queryAttendanceId ? "EDIT" : "CREATE",
      attendanceId: queryAttendanceId || "",
      workerId: "",
      punchType: "CLOCK_IN",
      punchedAt: "",
      reason: "",
    },
  });

  const selectedMode = watch("mode");
  const selectedAttendanceId = watch("attendanceId");

  // 未認証リダイレクト＆初期データロード
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

          // 自社作業員マスタのロード
          const workersResult = await getWorkersUseCase(userResult.value.contractorId);
          if (workersResult.success) {
            setWorkers(workersResult.value);
          } else {
            setErrorMessage("作業員情報の取得に失敗しました");
          }

          // 自社打刻履歴のロード (既存修正用)
          const recordsResult = await getAttendanceRecordsUseCase(userResult.value.contractorId);
          if (recordsResult.success) {
            setAttendanceRecords(recordsResult.value);
          }

          // クエリパラメータで打刻実績が渡されている場合はロードしてフォームに設定
          if (queryAttendanceId) {
            const recordResult = await getAttendanceRecordByIdUseCase(queryAttendanceId);
            if (recordResult.success) {
              const record = recordResult.value;
              // ローカル日時ピッカー用にISOを yyyy-MM-ddThh:mm 形式に変換
              const localDate = new Date(record.clocked_at);
              const formattedDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);

              reset({
                mode: "EDIT",
                attendanceId: record.attendance_id,
                workerId: record.worker_id,
                punchType: record.punch_type,
                punchedAt: formattedDate,
                reason: "",
              });
            } else {
              setErrorMessage("指定された打刻実績の取得に失敗しました");
            }
          }
        } else {
          setErrorMessage("ユーザー情報の取得に失敗しました");
        }
      } catch (err) {
        setErrorMessage("データの読み込み中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, queryAttendanceId, reset]);

  // 既存打刻選択時にフォームを自動設定
  useEffect(() => {
    if (selectedMode === "EDIT" && selectedAttendanceId) {
      const selectedRecord = attendanceRecords.find((r) => r.attendance_id === selectedAttendanceId);
      if (selectedRecord) {
        const localDate = new Date(selectedRecord.clocked_at);
        const formattedDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);

        setValue("workerId", selectedRecord.worker_id);
        setValue("punchType", selectedRecord.punch_type);
        setValue("punchedAt", formattedDate);
      }
    }
  }, [selectedMode, selectedAttendanceId, attendanceRecords, setValue]);

  const onSubmit = async (data: CorrectionFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const contractorId = sessionStorage.getItem("contractor_id") || "";
      const userId = sessionStorage.getItem("user_id") || "";

      // 入力された日時文字列をISO 8601形式へ変換
      const isoPunchedAt = new Date(data.punchedAt).toISOString();

      const result = await submitPunchCorrectionUseCase({
        attendanceId: data.mode === "EDIT" ? data.attendanceId : undefined,
        workerId: data.workerId,
        contractorId,
        punchType: data.punchType,
        punchedAt: isoPunchedAt,
        reason: data.reason,
        correctedBy: userId,
      });

      if (result.success) {
        setToastMessage(data.mode === "EDIT" ? "打刻実績を修正しました" : "打刻を手動登録しました");
        setTimeout(() => {
          router.push("/");
        }, 100);
      } else {
        setErrorMessage("error" in result ? result.error.message : "保存に失敗しました");
        setIsSubmitting(false);
      }
    } catch (err) {
      setErrorMessage("送信処理中にエラーが発生しました");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/");
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

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* 簡易トースト表示 */}
      {toastMessage && (
        <div
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-emerald-600 px-4 py-3 text-white shadow-md transition-all duration-300 font-bold"
          role="alert"
          data-testid="toast-message"
        >
          ✓ {toastMessage}
        </div>
      )}

      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none h-10 flex items-center justify-center min-w-[60px]"
            data-testid="header-back-button"
          >
            ← 戻る
          </button>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">打刻手動修正・登録</span>
            <span className="text-sm font-bold text-gray-800" data-testid="user-display-name">
              {user?.displayName} 様
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-lg bg-white rounded-lg shadow-sm p-5 sm:p-6 space-y-6">
          <div className="border-b pb-4">
            <h1 className="text-xl font-bold text-gray-900 md:text-2xl" data-testid="page-title">
              打刻情報の修正・手動登録
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              打刻漏れ時の手動打刻追加、または既存の打刻の修正を行います。
            </p>
          </div>

          {errorMessage && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200 font-medium" role="alert" data-testid="error-message">
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* モード選択 (新規手動登録 / 既存打刻修正) */}
            <div>
              <span className="block text-sm font-bold text-gray-700 mb-2">作業の種類</span>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center rounded-lg border p-3 cursor-pointer h-12 text-sm font-bold transition-all ${
                  selectedMode === "CREATE"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}>
                  <input
                    type="radio"
                    value="CREATE"
                    {...register("mode")}
                    className="sr-only"
                    onChange={(e) => {
                      setValue("mode", "CREATE");
                      setValue("attendanceId", "");
                      setValue("workerId", "");
                      setValue("punchType", "CLOCK_IN");
                      setValue("punchedAt", "");
                    }}
                    data-testid="mode-create"
                  />
                  <span>➕ 打刻を新規追加</span>
                </label>

                <label className={`flex items-center justify-center rounded-lg border p-3 cursor-pointer h-12 text-sm font-bold transition-all ${
                  selectedMode === "EDIT"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}>
                  <input
                    type="radio"
                    value="EDIT"
                    {...register("mode")}
                    className="sr-only"
                    onChange={(e) => {
                      setValue("mode", "EDIT");
                      setValue("workerId", "");
                      setValue("punchedAt", "");
                    }}
                    data-testid="mode-edit"
                  />
                  <span>✏️ 既存打刻の修正</span>
                </label>
              </div>
            </div>

            {/* 既存打刻レコードの選択 (EDITモード時のみ表示) */}
            {selectedMode === "EDIT" && (
              <div>
                <label htmlFor="attendanceId" className="block text-sm font-bold text-gray-700 mb-1">
                  修正対象の打刻実績 <span className="text-red-500 text-xs">*必須</span>
                </label>
                <select
                  id="attendanceId"
                  disabled={isSubmitting}
                  {...register("attendanceId")}
                  className={`block w-full rounded border px-3 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-12 bg-white ${
                    errors.attendanceId ? "border-red-500" : "border-gray-300"
                  }`}
                  data-testid="attendance-id-select"
                >
                  <option value="">-- 修正する打刻データを選択してください --</option>
                  {attendanceRecords.map((record) => {
                    const worker = workers.find((w) => w.worker_id === record.worker_id);
                    const formattedDate = new Date(record.clocked_at).toLocaleString("ja-JP");
                    const typeLabel = record.punch_type === "CLOCK_IN" ? "出勤" : "退勤";
                    return (
                      <option key={record.attendance_id} value={record.attendance_id}>
                        {worker?.name || `作業員ID:${record.worker_id}`} - {typeLabel} ({formattedDate})
                      </option>
                    );
                  })}
                </select>
                {errors.attendanceId && (
                  <p className="mt-1 text-sm text-red-600" data-testid="attendance-id-error">
                    {errors.attendanceId.message}
                  </p>
                )}
              </div>
            )}

            {/* 作業員の選択 (CREATE時のみ活性。EDIT時は対象打刻データ選択により自動セット) */}
            <div>
              <label htmlFor="workerId" className="block text-sm font-bold text-gray-700 mb-1">
                対象作業員 <span className="text-red-500 text-xs">*必須</span>
              </label>
              <select
                id="workerId"
                disabled={isSubmitting || selectedMode === "EDIT"}
                {...register("workerId")}
                className={`block w-full rounded border px-3 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-12 bg-white ${
                  selectedMode === "EDIT" ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""
                } ${errors.workerId ? "border-red-500" : "border-gray-300"}`}
                data-testid="worker-id-select"
              >
                <option value="">-- 作業員を選択してください --</option>
                {workers.map((worker) => (
                  <option key={worker.worker_id} value={worker.worker_id}>
                    {worker.name}
                  </option>
                ))}
              </select>
              {errors.workerId && (
                <p className="mt-1 text-sm text-red-600" data-testid="worker-id-error">
                  {errors.workerId.message}
                </p>
              )}
            </div>

            {/* 打刻種別 (出勤/退勤) */}
            <div>
              <span className="block text-sm font-bold text-gray-700 mb-2">
                打刻種別 <span className="text-red-500 text-xs">*必須</span>
              </span>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center rounded-lg border p-3 cursor-pointer h-12 text-sm font-bold transition-all ${
                  watch("punchType") === "CLOCK_IN"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}>
                  <input
                    type="radio"
                    value="CLOCK_IN"
                    disabled={isSubmitting}
                    {...register("punchType")}
                    className="sr-only"
                    data-testid="punch-type-in"
                  />
                  <span>🌅 出勤</span>
                </label>

                <label className={`flex items-center justify-center rounded-lg border p-3 cursor-pointer h-12 text-sm font-bold transition-all ${
                  watch("punchType") === "CLOCK_OUT"
                    ? "bg-amber-50 border-amber-500 text-amber-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}>
                  <input
                    type="radio"
                    value="CLOCK_OUT"
                    disabled={isSubmitting}
                    {...register("punchType")}
                    className="sr-only"
                    data-testid="punch-type-out"
                  />
                  <span>🌃 退勤</span>
                </label>
              </div>
              {errors.punchType && (
                <p className="mt-1 text-sm text-red-600" data-testid="punch-type-error">
                  {errors.punchType.message}
                </p>
              )}
            </div>

            {/* 打刻日時入力欄 */}
            <div>
              <label htmlFor="punchedAt" className="block text-sm font-bold text-gray-700 mb-1">
                打刻日時 <span className="text-red-500 text-xs">*必須</span>
              </label>
              <input
                id="punchedAt"
                type="datetime-local"
                disabled={isSubmitting}
                {...register("punchedAt")}
                className={`block w-full rounded border px-3 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-12 bg-white ${
                  errors.punchedAt ? "border-red-500" : "border-gray-300"
                }`}
                data-testid="punched-at-input"
              />
              {errors.punchedAt && (
                <p className="mt-1 text-sm text-red-600" data-testid="punched-at-error">
                  {errors.punchedAt.message}
                </p>
              )}
            </div>

            {/* 修正・追加理由 (テキストエリア形式) */}
            <div>
              <label htmlFor="reason" className="block text-sm font-bold text-gray-700 mb-1">
                登録・修正理由 <span className="text-red-500 text-xs">*必須</span>
              </label>
              <textarea
                id="reason"
                disabled={isSubmitting}
                placeholder="例: スマホ忘れによる打刻漏れ手動追加"
                rows={3}
                {...register("reason")}
                className={`block w-full rounded border px-3 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                  errors.reason ? "border-red-500" : "border-gray-300"
                }`}
                data-testid="reason-input"
              />
              {errors.reason && (
                <p className="mt-1 text-sm text-red-600" data-testid="reason-error">
                  {errors.reason.message}
                </p>
              )}
            </div>

            {/* アクションボタン (キャンセル・送信) */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-4 text-base font-bold text-gray-700 shadow-sm active:scale-95 hover:bg-gray-50 focus:outline-none h-14 disabled:opacity-50"
                data-testid="cancel-button"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center rounded-xl bg-blue-600 px-4 py-4 text-base font-bold text-white shadow-md active:scale-95 hover:bg-blue-700 focus:outline-none h-14 disabled:bg-gray-400 disabled:cursor-not-allowed"
                data-testid="submit-button"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    送信中...
                  </span>
                ) : (
                  "送信"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-gray-400">
        © 2026 勤怠・配置管理システム
      </footer>
    </div>
  );
}