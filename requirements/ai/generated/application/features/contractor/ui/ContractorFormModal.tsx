"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Contractor } from "../repository/contractorRepository";

const contractorFormSchema = z.object({
  name: z.string().trim().min(1, "企業名は必須入力です"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type ContractorFormValues = z.infer<typeof contractorFormSchema>;

interface ContractorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; status: 'ACTIVE' | 'INACTIVE' }) => Promise<void>;
  contractor: Contractor | null;
}

export default function ContractorFormModal({
  isOpen,
  onClose,
  onSave,
  contractor,
}: ContractorFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContractorFormValues>({
    resolver: zodResolver(contractorFormSchema),
    defaultValues: {
      name: "",
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (contractor) {
        reset({
          name: contractor.name,
          status: contractor.status,
        });
      } else {
        reset({
          name: "",
          status: "ACTIVE",
        });
      }
    }
  }, [isOpen, contractor, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: ContractorFormValues) => {
    await onSave({
      name: data.name,
      status: data.status,
    });
  };

  const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 animate-fade-in" data-testid="contractor-modal-overlay">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900" data-testid="contractor-modal-title">
            {contractor ? "外注先企業の編集" : "外注先企業の新規登録"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
            aria-label="閉じる"
            data-testid="modal-close-btn"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="contractor-name" className="block text-sm font-semibold text-slate-700 mb-1">
              企業名 <span className="text-red-500 text-xs font-bold">(必須)</span>
            </label>
            <input
              id="contractor-name"
              type="text"
              placeholder="株式会社 ○○建設"
              {...register("name")}
              disabled={isSubmitting}
              className={`block w-full rounded-lg border px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                errors.name ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
              }`}
              style={{ minHeight: "44px" }}
              data-testid="contractor-name-input"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 font-medium" data-testid="contractor-name-error">
                {errors.name.message}
              </p>
            )}
          </div>

          {contractor && (
            <div>
              <span className="block text-sm font-semibold text-slate-700 mb-2">
                ステータス
              </span>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center justify-center border rounded-xl p-3 cursor-pointer select-none transition-all hover:bg-slate-50">
                  <input
                    type="radio"
                    value="ACTIVE"
                    {...register("status")}
                    className="h-5 w-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                    data-testid="status-active-radio"
                  />
                  <span className="ml-2 text-sm font-bold text-slate-800">有効</span>
                </label>
                <label className="flex items-center justify-center border rounded-xl p-3 cursor-pointer select-none transition-all hover:bg-slate-50">
                  <input
                    type="radio"
                    value="INACTIVE"
                    {...register("status")}
                    className="h-5 w-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                    data-testid="status-inactive-radio"
                  />
                  <span className="ml-2 text-sm font-bold text-slate-800">無効</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
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
              data-testid="modal-save-btn"
            >
              {isSubmitting ? "送信中..." : "保存する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}