"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Role } from "../domain/types";
import { Contractor } from "@/features/contractor/repository/contractorRepository";

const userFormSchemaNew = z.object({
  login_id: z.string().trim().min(1, "ユーザーIDを入力してください"),
  display_name: z.string().trim().min(1, "表示名を入力してください"),
  role: z.enum(["FACTORY_ADMIN", "CONTRACTOR_MANAGER"], {
    errorMap: () => ({ message: "権限種別を選択してください" }),
  }),
  password: z.string().trim().min(1, "パスワードを入力してください"),
  contractor_id: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "LOCKED", "DISABLED"]),
}).refine((data) => {
  if (data.role === "CONTRACTOR_MANAGER" && !data.contractor_id) {
    return false;
  }
  return true;
}, {
  message: "所属外注先企業を選択してください",
  path: ["contractor_id"],
});

const userFormSchemaEdit = z.object({
  login_id: z.string().trim().min(1, "ユーザーIDを入力してください"),
  display_name: z.string().trim().min(1, "表示名を入力してください"),
  role: z.enum(["FACTORY_ADMIN", "CONTRACTOR_MANAGER"], {
    errorMap: () => ({ message: "権限種別を選択してください" }),
  }),
  password: z.string().trim().optional(),
  contractor_id: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "LOCKED", "DISABLED"]),
}).refine((data) => {
  if (data.role === "CONTRACTOR_MANAGER" && !data.contractor_id) {
    return false;
  }
  return true;
}, {
  message: "所属外注先企業を選択してください",
  path: ["contractor_id"],
});

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    login_id: string;
    display_name: string;
    role: Role;
    password?: string;
    contractor_id: string | null;
    status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  }) => Promise<void>;
  user: User | null;
  contractors: Contractor[];
}

export default function UserFormModal({
  isOpen,
  onClose,
  onSave,
  user,
  contractors,
}: UserFormModalProps) {
  const isEdit = !!user;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(isEdit ? userFormSchemaEdit : userFormSchemaNew),
    defaultValues: {
      login_id: "",
      display_name: "",
      role: "FACTORY_ADMIN",
      password: "",
      contractor_id: "",
      status: "ACTIVE",
    },
  });

  const watchedRole = watch("role");

  useEffect(() => {
    if (isOpen) {
      if (user) {
        reset({
          login_id: user.login_id,
          display_name: user.display_name,
          role: user.role,
          password: "",
          contractor_id: user.contractor_id || "",
          status: user.status,
        });
      } else {
        reset({
          login_id: "",
          display_name: "",
          role: "FACTORY_ADMIN",
          password: "",
          contractor_id: "",
          status: "ACTIVE",
        });
      }
    }
  }, [isOpen, user, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: any) => {
    await onSave({
      login_id: data.login_id,
      display_name: data.display_name,
      role: data.role,
      password: data.password || undefined,
      contractor_id: data.role === "CONTRACTOR_MANAGER" ? data.contractor_id : null,
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
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" data-testid="user-modal-overlay">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900" data-testid="user-modal-title">
            {isEdit ? "管理者ユーザーの編集" : "管理者ユーザーの新規登録"}
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
            <label htmlFor="user-login-id" className="block text-sm font-semibold text-slate-700 mb-1">
              ユーザーID (ログインID) <span className="text-red-500 text-xs font-bold">(必須)</span>
            </label>
            <input
              id="user-login-id"
              type="text"
              placeholder="例: kojo_admin"
              {...register("login_id")}
              disabled={isSubmitting || isEdit}
              className={`block w-full rounded-lg border px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                isEdit ? "bg-slate-100 cursor-not-allowed border-slate-200" : (errors.login_id ? "border-red-300 ring-1 ring-red-300" : "border-slate-300")
              }`}
              style={{ minHeight: "44px" }}
              data-testid="login-id-input"
            />
            {errors.login_id && (
              <p className="mt-1 text-sm text-red-600 font-medium" data-testid="login-id-error">
                {errors.login_id.message as string}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="user-display-name" className="block text-sm font-semibold text-slate-700 mb-1">
              表示名 <span className="text-red-500 text-xs font-bold">(必須)</span>
            </label>
            <input
              id="user-display-name"
              type="text"
              placeholder="例: 工場管理 太郎"
              {...register("display_name")}
              disabled={isSubmitting}
              className={`block w-full rounded-lg border px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                errors.display_name ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
              }`}
              style={{ minHeight: "44px" }}
              data-testid="display-name-input"
            />
            {errors.display_name && (
              <p className="mt-1 text-sm text-red-600 font-medium" data-testid="display-name-error">
                {errors.display_name.message as string}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="user-role" className="block text-sm font-semibold text-slate-700 mb-1">
              権限種別 <span className="text-red-500 text-xs font-bold">(必須)</span>
            </label>
            <select
              id="user-role"
              {...register("role")}
              disabled={isSubmitting}
              className={`block w-full rounded-lg border px-3 py-2 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                errors.role ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
              }`}
              style={{ minHeight: "44px" }}
              data-testid="role-select"
            >
              <option value="FACTORY_ADMIN">工場側管理者</option>
              <option value="CONTRACTOR_MANAGER">外注先管理者</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600 font-medium" data-testid="role-error">
                {errors.role.message as string}
              </p>
            )}
          </div>

          {/* 外注先管理者の時のみ所属外注先企業セレクトボックスを表示 */}
          {watchedRole === "CONTRACTOR_MANAGER" && (
            <div data-testid="contractor-select-container">
              <label htmlFor="user-contractor-id" className="block text-sm font-semibold text-slate-700 mb-1">
                所属外注先企業 <span className="text-red-500 text-xs font-bold">(必須)</span>
              </label>
              <select
                id="user-contractor-id"
                {...register("contractor_id")}
                disabled={isSubmitting}
                className={`block w-full rounded-lg border px-3 py-2 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                  errors.contractor_id ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
                }`}
                style={{ minHeight: "44px" }}
                data-testid="contractor-id-select"
              >
                <option value="">所属企業を選択してください</option>
                {contractors.map((c) => (
                  <option key={c.contractor_id} value={c.contractor_id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.contractor_id && (
                <p className="mt-1 text-sm text-red-600 font-medium" data-testid="contractor-id-error">
                  {errors.contractor_id.message as string}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="user-password" className="block text-sm font-semibold text-slate-700 mb-1">
              パスワード {!isEdit && <span className="text-red-500 text-xs font-bold">(必須)</span>}
              {isEdit && <span className="text-slate-500 text-xs"> (変更時のみ入力)</span>}
            </label>
            <input
              id="user-password"
              type="password"
              placeholder={isEdit ? "変更する場合のみ入力" : "パスワードを入力してください"}
              {...register("password")}
              disabled={isSubmitting}
              className={`block w-full rounded-lg border px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent ${
                errors.password ? "border-red-300 ring-1 ring-red-300" : "border-slate-300"
              }`}
              style={{ minHeight: "44px" }}
              data-testid="password-input"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 font-medium" data-testid="password-error">
                {errors.password.message as string}
              </p>
            )}
          </div>

          {isEdit && (
            <div>
              <span className="block text-sm font-semibold text-slate-700 mb-2">
                ステータス
              </span>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex items-center justify-center border rounded-xl p-2 cursor-pointer select-none transition-all hover:bg-slate-50">
                  <input
                    type="radio"
                    value="ACTIVE"
                    {...register("status")}
                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    data-testid="status-active-radio"
                  />
                  <span className="ml-1 text-xs font-bold text-slate-800">有効</span>
                </label>
                <label className="flex items-center justify-center border rounded-xl p-2 cursor-pointer select-none transition-all hover:bg-slate-50">
                  <input
                    type="radio"
                    value="LOCKED"
                    {...register("status")}
                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    data-testid="status-locked-radio"
                  />
                  <span className="ml-1 text-xs font-bold text-slate-800">ロック</span>
                </label>
                <label className="flex items-center justify-center border rounded-xl p-2 cursor-pointer select-none transition-all hover:bg-slate-50">
                  <input
                    type="radio"
                    value="DISABLED"
                    {...register("status")}
                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    data-testid="status-disabled-radio"
                  />
                  <span className="ml-1 text-xs font-bold text-slate-800">無効</span>
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