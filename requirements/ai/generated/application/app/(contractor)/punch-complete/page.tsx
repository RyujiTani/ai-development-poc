"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getUserMeUseCase, UserMeResult } from "@/features/user/usecase/getUserMeUseCase";

function PunchCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<UserMeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // クエリパラメータから打刻モードと対象人数を取得 (SCR-006-DT-001, SCR-006-ST-001)
  const mode = searchParams.get("mode") as "CLOCK_IN" | "CLOCK_OUT" | null;
  const countStr = searchParams.get("count");
  const count = countStr ? parseInt(countStr, 10) : 0;

  useEffect(() => {
    const userId = sessionStorage.getItem("user_id");
    const role = sessionStorage.getItem("role");

    // 未認証リダイレクト (SCR-006-VL-001)
    if (!userId || !role || role !== "CONTRACTOR_MANAGER") {
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("contractor_id");
      router.replace("/login");
      return;
    }

    const loadUser = async () => {
      try {
        const result = await getUserMeUseCase(userId);
        if (result.success) {
          setUser(result.value);
        } else {
          setErrorMessage("error" in result ? result.error.message : "ユーザー情報の取得に失敗しました");
        }
      } catch (err) {
        setErrorMessage("ユーザー情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  // ホームへ戻るボタン押下時のアクション (SCR-006-EV-001)
  const handleHomeTransition = () => {
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
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="text-xs text-gray-500 font-medium">勤怠・配置管理システム</div>
          <div className="text-right">
            <span className="text-sm font-bold text-gray-800" data-testid="user-display-name">
              {user?.displayName} 様
            </span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ - 画面中央配置 (SCR-006-UI-001, SCR-006-UI-003) */}
      <main className="flex-1 flex items-center justify-center px-4 py-6" role="main">
        <div className="w-full max-w-lg space-y-6 text-center bg-white p-8 rounded-lg shadow-sm">
          {/* 送信完了メッセージ (SCR-006-FN-001, SCR-006-UI-001) */}
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl mx-auto mb-2">
              ✓
            </div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="complete-message">
              打刻データの送信が完了しました
            </h1>
            <p className="text-sm text-gray-500">
              撮影された証拠写真と打刻履歴はシステムに安全に保存されました。
            </p>
          </div>

          {/* 前画面から引き渡された送信成功情報の表示 (SCR-006-DT-001, SCR-006-ST-001) */}
          {mode && (
            <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto border border-gray-100 text-left space-y-2" data-testid="punch-summary">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1">送信サマリー</h2>
              <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-gray-500 font-medium">打刻種別:</span>
                {mode === "CLOCK_IN" ? (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800" data-testid="summary-punch-type">
                    出勤
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800" data-testid="summary-punch-type">
                    退勤
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">対象人数:</span>
                <span className="font-bold text-gray-800" data-testid="summary-worker-count">
                  {count}名
                </span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200" role="alert" data-testid="error-message">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* ホームへ戻るボタン (SCR-006-FN-002, SCR-006-UI-002) */}
          <div className="pt-4">
            <button
              onClick={handleHomeTransition}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-4 text-lg font-bold text-white shadow-md active:scale-95 hover:bg-blue-700 focus:outline-none h-14"
              data-testid="home-button"
            >
              ホームへ戻る
            </button>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="py-4 text-center text-xs text-gray-400">
        © 2026 勤怠・配置管理システム
      </footer>
    </div>
  );
}

export default function PunchCompletePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-100" data-testid="loading-state">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    }>
      <PunchCompleteContent />
    </Suspense>
  );
}