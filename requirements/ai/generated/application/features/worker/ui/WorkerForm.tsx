"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

const AVAILABLE_QUALIFICATIONS = [
  { code: "QUAL-01", name: "一般安全衛生講習" },
  { code: "QUAL-02", name: "職長・安全衛生責任者" },
  { code: "QUAL-03", name: "足場の組立て等作業従事者" },
  { code: "QUAL-04", name: "高所作業車運転" },
  { code: "QUAL-05", name: "玉掛け技術講習" },
];

const AVAILABLE_TRAININGS = [
  { code: "TRAIN-01", name: "安全教育講習A" },
  { code: "TRAIN-02", name: "危険予知訓練B" },
  { code: "TRAIN-03", name: "特別安全教育" },
];

const workerSchema = z.object({
  name: z.string().trim().min(1, "氏名を入力してください"),
  contact: z.string().trim().min(1, "連絡先を入力してください"),
  qualifications: z.array(z.string()),
  trainings: z.array(
    z.object({
      code: z.string().trim().min(1, "講習コードを選択してください"),
      taken_at: z.string().min(1, "受講日を入力してください"),
    })
  ),
});

type WorkerFormValues = z.infer<typeof workerSchema>;

interface WorkerFormProps {
  mode: "new" | "edit";
  workerId?: string;
}

export default function WorkerForm({ mode, workerId }: WorkerFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(mode === "edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkerFormValues>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      name: "",
      contact: "",
      qualifications: [],
      trainings: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "trainings",
  });

  const watchedQualifications = watch("qualifications") || [];

  useEffect(() => {
    async function checkAuthAndLoadData() {
      if (typeof sessionStorage === "undefined") {
        setIsLoading(false);
        return;
      }

      const storedId = sessionStorage.getItem("user_id");
      const storedRole = sessionStorage.getItem("role");
      const storedContractorId = sessionStorage.getItem("contractor_id");

      // 未認証・権限なしリダイレクト (SCR-008-VL-003)
      if (!storedId || storedRole !== "CONTRACTOR_MANAGER" || !storedContractorId) {
        router.push("/login");
        return;
      }

      setIsLoading(false);

      if (mode === "edit" && workerId) {
        try {
          const db = await getDB();
          const tx = db.transaction("workers", "readonly");
          const store = tx.objectStore("workers");
          const worker: Worker | undefined = await store.get(workerId);
          await tx.done;

          if (worker) {
            // 自社 contractor_id のデータのみ取得可能（認可フィルタ必須）(SCR-008-DT-001)
            if (worker.contractor_id !== storedContractorId) {
              setErrorMessage("この作業員の編集権限がありません。");
              setIsLoadingData(false);
              return;
            }

            setValue("name", worker.name);
            setValue("contact", worker.contact || "");
            setValue("qualifications", worker.qualifications);
            setValue("trainings", worker.trainings.map(t => ({
              code: t.code,
              taken_at: t.taken_at ? t.taken_at.split("T")[0] : "", // yyyy-MM-ddに変換
            })));
          } else {
            setErrorMessage("作業員が見つかりません。");
          }
        } catch (error) {
          console.error("Failed to load worker details", error);
          setErrorMessage("作業員データの取得に失敗しました。");
        } finally {
          setIsLoadingData(false);
        }
      }
    }

    checkAuthAndLoadData();
  }, [mode, workerId, setValue, router]);

  const handleQualificationToggle = (code: string) => {
    const current = [...watchedQualifications];
    const index = current.indexOf(code);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(code);
    }
    setValue("qualifications", current);
  };

  const onSubmit = async (data: WorkerFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const storedContractorId = sessionStorage.getItem("contractor_id") || "";
      const db = await getDB();
      const tx = db.transaction("workers", "readwrite");
      const store = tx.objectStore("workers");
      const now = new Date().toISOString();

      if (mode === "new") {
        // 新規登録 (SCR-008-DT-002)
        const newWorkerId = `worker-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
        const newWorker: Worker = {
          worker_id: newWorkerId,
          contractor_id: storedContractorId,
          name: data.name,
          contact: data.contact,
          qualifications: data.qualifications,
          trainings: data.trainings.map((t) => ({
            code: t.code,
            taken_at: new Date(t.taken_at).toISOString(),
          })),
          status: "ACTIVE",
          created_at: now,
          updated_at: now,
        };
        await store.put(newWorker);
      } else if (mode === "edit" && workerId) {
        // 既存更新 (SCR-008-DT-003)
        const existingWorker: Worker | undefined = await store.get(workerId);
        if (!existingWorker) {
          throw new Error("作業員データが見つかりません。");
        }
        if (existingWorker.contractor_id !== storedContractorId) {
          throw new Error("この作業員を編集する権限がありません。");
        }

        const updatedWorker: Worker = {
          ...existingWorker,
          name: data.name,
          contact: data.contact,
          qualifications: data.qualifications,
          trainings: data.trainings.map((t) => ({
            code: t.code,
            taken_at: new Date(t.taken_at).toISOString(),
          })),
          updated_at: now,
        };
        await store.put(updatedWorker);
      }

      await tx.done;
      router.push("/workers"); // (SCR-008-EV-001 / SCR-008-EV-002)
    } catch (error) {
      console.error("Failed to save worker", error);
      setErrorMessage(error instanceof Error ? error.message : "作業員の保存に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/workers"); // (SCR-008-EV-003)
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
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="flex items-center space-x-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ minHeight: "44px" }}
            aria-label="戻る"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>キャンセル</span>
          </button>
          <h1 className="text-lg font-bold text-slate-900">
            {mode === "new" ? "作業員登録" : "作業員編集"}
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

        {isLoadingData ? (
          <div className="flex justify-center py-12">
            <div className="flex items-center space-x-2 text-slate-600">
              <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="font-semibold text-base">作業員データをロード中...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* フォーム縦並び配置 (SCR-008-UI-001) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              {/* 氏名入力 */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-slate-700"
                >
                  氏名 <span className="text-red-500 text-xs font-bold">(必須)</span>
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    type="text"
                    {...register("name")}
                    disabled={isSubmitting}
                    className={`block w-full rounded-lg border px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                      errors.name ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
                    }`}
                    placeholder="山田 太郎"
                    style={{ minHeight: "44px" }} // (SCR-008-UI-004)
                    data-testid="worker-name-input"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-600 font-medium" data-testid="error-name">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* 連絡先入力 */}
              <div>
                <label
                  htmlFor="contact"
                  className="block text-sm font-semibold text-slate-700"
                >
                  連絡先 <span className="text-red-500 text-xs font-bold">(必須)</span>
                </label>
                <div className="mt-1">
                  <input
                    id="contact"
                    type="text"
                    {...register("contact")}
                    disabled={isSubmitting}
                    className={`block w-full rounded-lg border px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                      errors.contact ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
                    }`}
                    placeholder="09012345678"
                    style={{ minHeight: "44px" }} // (SCR-008-UI-004)
                    data-testid="worker-contact-input"
                  />
                </div>
                {errors.contact && (
                  <p className="mt-1.5 text-sm text-red-600 font-medium" data-testid="error-contact">
                    {errors.contact.message}
                  </p>
                )}
              </div>

              {/* 資格有無入力 */}
              <div>
                <span className="block text-sm font-semibold text-slate-700 mb-2">
                  保有資格
                </span>
                {/* スマホ向け大きいタップUI (SCR-008-UI-004) */}
                <div className="grid grid-cols-1 gap-2.5" data-testid="qualifications-container">
                  {AVAILABLE_QUALIFICATIONS.map((q) => {
                    const isChecked = watchedQualifications.includes(q.code);
                    return (
                      <label
                        key={q.code}
                        onClick={() => handleQualificationToggle(q.code)}
                        className={`flex items-center space-x-3 border rounded-xl px-4 py-3.5 cursor-pointer select-none transition-all ${
                          isChecked
                            ? "bg-blue-50/50 border-blue-400 font-semibold text-blue-900"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                        style={{ minHeight: "44px" }}
                        data-testid={`qualification-checkbox-${q.code}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="h-6 w-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                          style={{ minWidth: "24px", minHeight: "24px" }}
                        />
                        <span className="text-base">{q.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 講習受講履歴入力 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-sm font-semibold text-slate-700">
                    講習受講履歴
                  </span>
                  <button
                    type="button"
                    onClick={() => append({ code: "", taken_at: "" })}
                    disabled={isSubmitting}
                    className="flex items-center space-x-1 px-3 py-1.5 border border-blue-300 rounded-lg text-xs font-bold text-blue-600 bg-white hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    style={{ minHeight: "36px" }}
                    data-testid="add-training-btn"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    <span>追加</span>
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400 font-medium">
                    受講履歴は登録されていません。
                  </div>
                ) : (
                  <div className="space-y-4" data-testid="trainings-container">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col space-y-3 relative"
                        data-testid={`training-item-${index}`}
                      >
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          disabled={isSubmitting}
                          className="absolute top-3 right-3 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          style={{ minWidth: "36px", minHeight: "36px" }}
                          aria-label="削除"
                          data-testid={`remove-training-btn-${index}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>

                        <div className="w-11/12 space-y-3">
                          {/* 講習コード選択 */}
                          <div>
                            <label
                              htmlFor={`trainings.${index}.code`}
                              className="block text-xs font-semibold text-slate-500"
                            >
                              講習名
                            </label>
                            <select
                              id={`trainings.${index}.code`}
                              {...register(`trainings.${index}.code` as const)}
                              disabled={isSubmitting}
                              className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                                errors.trainings?.[index]?.code
                                  ? "border-red-300 ring-1 ring-red-300"
                                  : "border-slate-300"
                              }`}
                              style={{ minHeight: "44px" }}
                              data-testid={`training-code-select-${index}`}
                            >
                              <option value="">選択してください</option>
                              {AVAILABLE_TRAININGS.map((t) => (
                                <option key={t.code} value={t.code}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            {errors.trainings?.[index]?.code && (
                              <p className="mt-1 text-xs text-red-600 font-medium">
                                {errors.trainings?.[index]?.code?.message}
                              </p>
                            )}
                          </div>

                          {/* 受講日 */}
                          <div>
                            <label
                              htmlFor={`trainings.${index}.taken_at`}
                              className="block text-xs font-semibold text-slate-500"
                            >
                              受講日
                            </label>
                            <input
                              id={`trainings.${index}.taken_at`}
                              type="date"
                              {...register(`trainings.${index}.taken_at` as const)}
                              disabled={isSubmitting}
                              className={`mt-1 block w-full rounded-lg border px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                                errors.trainings?.[index]?.taken_at
                                  ? "border-red-300 ring-1 ring-red-300"
                                  : "border-slate-300"
                              }`}
                              style={{ minHeight: "44px" }}
                              data-testid={`training-taken-at-input-${index}`}
                            />
                            {errors.trainings?.[index]?.taken_at && (
                              <p className="mt-1 text-xs text-red-600 font-medium">
                                {errors.trainings?.[index]?.taken_at?.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 保存・キャンセルボタン配置 (SCR-008-UI-002) */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:w-1/2 border-2 border-slate-300 bg-white text-slate-800 rounded-xl py-3.5 text-base font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                style={{ minHeight: "50px" }}
                data-testid="cancel-btn"
              >
                <span>キャンセル</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-1/2 bg-blue-600 text-white rounded-xl py-3.5 text-base font-bold shadow hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                style={{ minHeight: "50px" }}
                data-testid="save-btn"
              >
                {isSubmitting ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>保存中...</span>
                  </span>
                ) : (
                  <span>保存する</span>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}