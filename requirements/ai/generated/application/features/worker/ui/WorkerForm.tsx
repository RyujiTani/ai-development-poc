"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getUserMeUseCase, UserMeResult } from "@/features/user/usecase/getUserMeUseCase";
import { getWorkerByIdUseCase } from "@/features/worker/usecase/getWorkerByIdUseCase";
import { saveWorkerUseCase } from "@/features/worker/usecase/saveWorkerUseCase";

const trainingSchema = z.object({
  code: z.string().min(1, { message: "講習コードまたは講習名を入力してください" }),
  taken_at: z.string().min(1, { message: "受講日を入力してください" }),
});

const workerSchema = z.object({
  name: z.string().min(1, { message: "氏名を入力してください" }),
  contact: z
    .string()
    .min(1, { message: "連絡先を入力してください" })
    .regex(/^[0-9-]{10,13}$/, { message: "有効な電話番号（10〜13桁の数字またはハイフン）を入力してください" }),
  qualifications: z.array(z.string()),
  trainings: z.array(trainingSchema),
  status: z.enum(["ACTIVE", "RETIRED"]),
});

type WorkerFormValues = z.infer<typeof workerSchema>;

interface WorkerFormProps {
  workerId?: string;
}

export default function WorkerForm({ workerId }: WorkerFormProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserMeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<WorkerFormValues>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      name: "",
      contact: "",
      qualifications: [],
      trainings: [],
      status: "ACTIVE",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "trainings",
  });

  const qualifications = watch("qualifications") || [];

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

          if (workerId) {
            const workerResult = await getWorkerByIdUseCase(workerId);
            if (workerResult.success) {
              const worker = workerResult.value;
              reset({
                name: worker.name,
                contact: worker.contact || "",
                qualifications: worker.qualifications || [],
                trainings: worker.trainings || [],
                status: worker.status || "ACTIVE",
              });
            } else {
              setErrorMessage("error" in workerResult ? workerResult.error.message : "作業員の取得に失敗しました");
            }
          }
        } else {
          setErrorMessage("error" in userResult ? userResult.error.message : "ユーザー情報の取得に失敗しました");
        }
      } catch (err) {
        setErrorMessage("データの読み込み中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [workerId, router, reset]);

  const onSubmit = async (data: WorkerFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const contractorId = sessionStorage.getItem("contractor_id") || "";
      const userId = sessionStorage.getItem("user_id") || "";

      const result = await saveWorkerUseCase({
        workerId: workerId,
        contractorId,
        name: data.name,
        contact: data.contact,
        qualifications: data.qualifications,
        trainings: data.trainings.map((t) => ({
          code: t.code ?? "",
          taken_at: t.taken_at ?? "",
        })),
        status: data.status,
        userId,
      });

      if (result.success) {
        sessionStorage.setItem("worker_toast", workerId ? "作業員情報を更新しました" : "作業員を新規追加しました");
        router.push("/workers");
      } else {
        setErrorMessage("error" in result ? result.error.message : "保存に失敗しました");
      }
    } catch (err) {
      setErrorMessage("保存処理中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/workers");
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
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none h-10 flex items-center justify-center min-w-[60px] disabled:opacity-50"
            data-testid="header-back-button"
          >
            ← 戻る
          </button>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">作業員管理</span>
            <span className="text-sm font-bold text-gray-800" data-testid="user-display-name">
              {user?.displayName} 様
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-lg bg-white rounded-lg shadow-sm p-5 sm:p-6 space-y-6">
          <div className="border-b pb-4">
            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
              {workerId ? "作業員情報の編集" : "作業員の新規追加"}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              作業員の基本情報、保有資格、安全講習の受講履歴を入力してください。
            </p>
          </div>

          {errorMessage && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200 font-medium animate-pulse">
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-1">
                氏名 <span className="text-red-500 text-xs">*必須</span>
              </label>
              <input
                id="name"
                type="text"
                disabled={isSubmitting}
                data-testid="name-input"
                placeholder="例: 田中 太郎"
                {...register("name")}
                className={`block w-full rounded border px-3 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? "border-red-500" : "border-gray-300"
                } h-12 md:h-12`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600" data-testid="name-error">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="contact" className="block text-sm font-bold text-gray-700 mb-1">
                連絡先 (電話番号) <span className="text-red-500 text-xs">*必須</span>
              </label>
              <input
                id="contact"
                type="text"
                disabled={isSubmitting}
                data-testid="contact-input"
                placeholder="例: 090-1234-5678"
                {...register("contact")}
                className={`block w-full rounded border px-3 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.contact ? "border-red-500" : "border-gray-300"
                } h-12 md:h-12`}
              />
              {errors.contact && (
                <p className="mt-1 text-sm text-red-600" data-testid="contact-error">
                  {errors.contact.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">保有資格</label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer p-3 rounded hover:bg-gray-50 border">
                  <input
                    type="checkbox"
                    value="QUAL_001"
                    disabled={isSubmitting}
                    checked={qualifications.includes("QUAL_001")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setValue("qualifications", [...qualifications, "QUAL_001"]);
                      } else {
                        setValue("qualifications", qualifications.filter((q) => q !== "QUAL_001"));
                      }
                    }}
                    className="h-6 w-6 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-base text-gray-800 font-medium">有資格者（足場） (QUAL_001)</span>
                </label>

                <div className="p-3 border rounded-lg bg-gray-50">
                  <label htmlFor="custom-qualifications" className="block text-xs font-medium text-gray-500 mb-1">
                    その他の資格コード (任意、複数ある場合はカンマ区切り)
                  </label>
                  <input
                    id="custom-qualifications"
                    type="text"
                    disabled={isSubmitting}
                    placeholder="例: QUAL_002, QUAL_003"
                    className="block w-full rounded border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 bg-white"
                    value={qualifications.filter((q) => q !== "QUAL_001").join(", ")}
                    onChange={(e) => {
                      const customs = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s !== "");
                      const finalQuals = qualifications.includes("QUAL_001") ? ["QUAL_001", ...customs] : customs;
                      setValue("qualifications", finalQuals);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">講習受講履歴</label>
              
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg bg-gray-50 space-y-3 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-700">履歴 #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={isSubmitting}
                        className="text-red-600 hover:text-red-800 text-sm font-medium h-10 px-3 flex items-center justify-center border border-red-200 bg-white rounded active:scale-95 disabled:opacity-50"
                      >
                        削除
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">講習コード / 講習名</label>
                        <input
                          disabled={isSubmitting}
                          {...register(`trainings.${index}.code` as const)}
                          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 bg-white"
                          placeholder="例: TRN_001"
                        />
                        {errors.trainings?.[index]?.code && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.trainings[index]?.code?.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">受講日</label>
                        <input
                          type="date"
                          disabled={isSubmitting}
                          {...register(`trainings.${index}.taken_at` as const)}
                          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 h-11 bg-white"
                        />
                        {errors.trainings?.[index]?.taken_at && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.trainings[index]?.taken_at?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => append({ code: "TRN_001", taken_at: new Date().toISOString().split("T")[0] })}
                  className="w-full flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-3 text-sm font-bold text-blue-600 hover:bg-gray-50 h-12 active:scale-95 disabled:opacity-50"
                >
                  ＋ 講習受講履歴を追加
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-bold text-gray-700 mb-1">ステータス</label>
              <select
                id="status"
                disabled={isSubmitting}
                {...register("status")}
                className="block w-full rounded border border-gray-300 px-3 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-12"
              >
                <option value="ACTIVE">在籍 (ACTIVE)</option>
                <option value="RETIRED">離職 (RETIRED)</option>
              </select>
            </div>

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
                data-testid="save-button"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    保存中...
                  </span>
                ) : (
                  "保存する"
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