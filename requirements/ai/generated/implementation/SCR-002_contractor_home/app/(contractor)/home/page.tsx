'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IndexedDBUserRepository } from '@/features/user/repository/userRepository';
import { GetUserUseCase } from '@/features/user/usecase/getUserUseCase';
import { initializeSeedData } from '@/lib/db/indexedDB';
import { User } from '@/features/user/domain/user';

export default function ContractorHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoadUser = async () => {
      if (typeof window === 'undefined') return;

      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      // 未認証リダイレクト (SCR-002-VL-001)
      if (!userId || role !== 'CONTRACTOR_MANAGER') {
        router.push('/login');
        return;
      }

      try {
        // 初期シードデータ投入処理
        await initializeSeedData();

        // ログイン中のユーザー情報を取得する (SCR-002-DT-001)
        const repository = new IndexedDBUserRepository();
        const useCase = new GetUserUseCase(repository);
        const result = await useCase.execute(userId);

        if (result.success) {
          setUser(result.value);
        } else {
          setErrorMsg(result.error.message);
        }
      } catch (err: any) {
        setErrorMsg('ユーザー情報のロード中に予期せぬエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoadUser();
  }, [router]);

  // ログアウト処理 (SCR-002-FN-003)
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user_id');
      sessionStorage.removeItem('role');
    }
    router.push('/login');
  };

  if (isLoading) {
    return ( 
      <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="loading-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-gray-500 text-sm font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ログインユーザー名表示付きヘッダー (SCR-002-UI-003) */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase">外注管理者</span>
          <h1 className="text-sm font-bold text-gray-800">メニュー</h1>
        </div>
        <div className="flex items-center space-x-3">
          {user && (
            <span className="text-sm text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full font-medium shadow-inner">
              🏢 {user.display_name}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-red-600 border border-red-200 bg-white hover:bg-red-50 px-3 py-1.5 rounded-lg transition font-medium focus:ring-2 focus:ring-red-500 cursor-pointer flex items-center justify-center active:scale-95 shadow-sm"
            style={{ minHeight: '48px', minWidth: '80px' }} 
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* メインメニュー領域 */}
      <main className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto px-6 py-10 space-y-8">
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm shadow-sm">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="text-center space-y-2">
          <p className="text-gray-500 text-sm font-medium">ご利用になる操作メニューを選択してください</p>
        </div>

        {/* 大きなメニューボタン配置 (SCR-002-UI-001) */}
        <div className="flex flex-col space-y-5">
          {/* 打刻メニューボタン (SCR-002-FN-001) */}
          <button
            onClick={() => router.push('/contractor/punch-mode')}
            className="w-full flex items-center justify-between p-6 bg-white border border-gray-200 hover:border-blue-400 rounded-2xl shadow-sm hover:shadow-md transition text-left group focus:ring-2 focus:ring-blue-500 cursor-pointer active:scale-[0.99]"
            style={{ minHeight: '96px' }} 
          >
            <div className="flex items-center space-x-5">
              <div className="p-4 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-100 transition shadow-inner">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-7 h-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-800 tracking-tight">打刻</span>
                <span className="block text-xs text-gray-400 mt-1">作業員の出勤・退勤の打刻を開始します</span>
              </div>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
                  strokeWidth={2.5}
              stroke="currentColor"
              className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {/* 作業員管理ボタン (SCR-002-FN-002) */}
          <button
            onClick={() => router.push('/contractor/workers')}
            className="w-full flex items-center justify-between p-6 bg-white border border-gray-200 hover:border-blue-400 rounded-2xl shadow-sm hover:shadow-md transition text-left group focus:ring-2 focus:ring-blue-500 cursor-pointer active:scale-[0.99]"
            style={{ minHeight: '96px' }} 
          >
            <div className="flex items-center space-x-5">
              <div className="p-4 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-100 transition shadow-inner">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-7 h-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                  />
                </svg>
              </div>
              <div>
                <span className="block text-lg font-bold text-gray-800 tracking-tight">作業員管理</span>
                <span className="block text-xs text-gray-400 mt-1">作業員の新規登録・変更・確認を行います</span>
              </div>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
                  strokeWidth={2.5}
              stroke="currentColor"
              className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-gray-100 py-4 border-t border-gray-200 mt-auto">
        <p className="text-center text-[10px] text-gray-400 tracking-wide">
          &copy; 2026 外注作業員 勤怠・配置管理システム
        </p>
      </footer>
    </div>
  );
}
"
    },
    {