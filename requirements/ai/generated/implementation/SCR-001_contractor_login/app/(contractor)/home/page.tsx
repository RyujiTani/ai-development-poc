"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/auth/session";

export default function ContractorHomePage() {
  const router = useRouter();
  const [session, setSession] = useState<{ userId: string | null; role: string | null; displayName: string | null } | null>(null);

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession.userId || currentSession.role !== "CONTRACTOR_MANAGER") {
      router.push("/login");
    } else {
      setSession(currentSession);
    }
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              外注先ホーム画面 (SCR-002)
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              レグインユーザー: {session.displayName}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 h-10"
          >
            ログアウト
          </button>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-lg border p-6 hover:shadow-md transition">
            <h2 className="text-lg font-bold text-gray-900">打刻モード選択</h2>
            <p className="text-sm text-gray-500 mt-2">
              作業員の出勤・退勤の打刻を行います。
            </p>
            <button className="mt-4 w-full bg-indigo-600 text-white rounded py-2 hover:bg-indigo-700 font-medium h-12">
              打刻を開始したりする
            </button>
          </div>
          <div className="rounded-lg border p-6 hover:shadow-md transition">
            <h2 className="text-lg font-bold text-gray-900">作業員マスタ管理</h2>
            <p className="text-sm text-gray-500 mt-2">
              自社作業員の登録・編集・削除を行います。
            </p>
            <button className="mt-4 w-full bg-gray-800 text-white rounded py-2 hover:bg-gray-900 font-medium h-12">
              作業員を管理する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
"}, {