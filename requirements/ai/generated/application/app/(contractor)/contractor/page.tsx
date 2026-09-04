'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sessionManager, Session } from '../../../lib/auth/session';
import { useToast } from '../../../components/ui/toast';
import { logger } from '../../../lib/logger/logger';

export default function ContractorHomePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'CONTRACTOR_MANAGER') {
      logger.warn('unauthorized_access_redirect', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.push('/login');
      return;
    }
    setSession(currentSession);
    setLoading(false);
    logger.info('contractor_home_loaded', { user_id: currentSession.user_id });
  }, [router]);

  const handleLogout = () => {
    logger.info('contractor_logout', { user_id: session?.user_id });
    sessionManager.clearSession();
    showToast('ログアウトしました。', 'info');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-indigo-600 tracking-wider">勤怠・配置管理</span>
            <span className="text-sm font-bold text-gray-900 sm:text-base">外注先ポータル</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800">{session?.display_name} 様</p>
              <p className="text-xs text-gray-500">管理者</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 active:bg-red-100 transition duration-150 ease-in-out h-9 flex items-center justify-center cursor-pointer"
            >
              ログアウト
            </button>
          </div>
        </div>
        {/* スマホ用ユーザー名表示 */}
        <div className="bg-indigo-50 border-t border-indigo-100 px-4 py-2 sm:hidden flex justify-between items-center">
          <span className="text-xs text-indigo-700 font-medium">ログインユーザー:</span>
          <span className="text-xs font-bold text-indigo-900">{session?.display_name} 様</span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">
            外注先メニュー
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            行いたい操作を選択してください。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
          {/* 打刻ボタン */}
          <button
            id="punch-menu-button"
            onClick={() => {
              logger.info('navigate_to_punch_mode', { user_id: session?.user_id });
              router.push('/contractor/punch-mode');
            }}
            className="flex flex-col items-center justify-center bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl hover:border-indigo-200 active:bg-indigo-50/50 transition duration-200 ease-in-out text-center group min-h-[160px] sm:min-h-[200px] cursor-pointer"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition duration-150">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2 group-hover:text-indigo-600 transition">
              打刻（出勤・退勤）
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-[200px]">
              作業員の出勤・退勤を写真撮影付きで登録します。
            </p>
          </button>

          {/* 打刻修正ボタン */}
          <button
            id="punch-correction-menu-button"
            onClick={() => {
              logger.info('navigate_to_punch_correction', { user_id: session?.user_id });
              router.push('/contractor/punch-correction');
            }}
            className="flex flex-col items-center justify-center bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl hover:border-indigo-200 active:bg-indigo-50/50 transition duration-200 ease-in-out text-center group min-h-[160px] sm:min-h-[200px] cursor-pointer"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition duration-150">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2 group-hover:text-indigo-600 transition">
              打刻修正・手動登録
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-[200px]">
              打刻漏れの手動登録や、誤った打刻日時の修正を行います。
            </p>
          </button>

          {/* 作業員管理ボタン */}
          <button
            id="worker-management-menu-button"
            onClick={() => {
              logger.info('navigate_to_workers', { user_id: session?.user_id });
              router.push('/contractor/workers');
            }}
            className="flex flex-col items-center justify-center bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl hover:border-indigo-200 active:bg-indigo-50/50 transition duration-200 ease-in-out text-center group min-h-[160px] sm:min-h-[200px] cursor-pointer"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition duration-150">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2 group-hover:text-indigo-600 transition">
              作業員管理
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-[200px]">
              自社の現場作業員マスタの登録・変更・資格管理を行います。
            </p>
          </button>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-gray-400">
          &copy; 2026 勤怠・配置管理システム プロトタイプ版
        </div>
      </footer>
    </div>
  );
}