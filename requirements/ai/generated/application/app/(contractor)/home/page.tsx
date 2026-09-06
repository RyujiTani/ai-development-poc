"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IndexedDBUserRepository } from '@/features/user/repository/indexedDBUserRepository';
import { User } from '@/features/user/domain/types';
import { logger } from '@/lib/logger';

const LogOutIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const CalendarDaysIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </svg>
);

const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function ContractorHomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'CONTRACTOR_MANAGER') {
        logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: '/home' });
        router.replace('/login');
        return;
      }

      try {
        const userRepository = new IndexedDBUserRepository();
        const user = await userRepository.findById(userId);
        if (!user) {
          logger.info('USER_NOT_FOUND_REDIRECT', { userId });
          sessionStorage.clear();
          router.replace('/login');
          return;
        }

        if (user.status !== 'ACTIVE') {
          logger.info('INACTIVE_USER_REDIRECT', { userId });
          sessionStorage.clear();
          router.replace('/login');
          return;
        }

        setCurrentUser(user);
      } catch (error) {
        logger.error('FETCH_USER_ERROR', error, { userId });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = () => {
    logger.info('LOGOUT_EVENT', { user_id: currentUser?.user_id });
    sessionStorage.removeItem('user_id');
    sessionStorage.removeItem('role');
    router.push('/login');
  };

  const navigateToPunchMode = () => {
    logger.info('NAVIGATE_TO_PUNCH_MODE', { user_id: currentUser?.user_id });
    router.push('/punch-mode');
  };

  const navigateToWorkers = () => {
    logger.info('NAVIGATE_TO_WORKERS', { user_id: currentUser?.user_id });
    router.push('/workers');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー領域 */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">外注先勤怠・配置管理</p>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
              {currentUser.display_name}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 h-10 px-4 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <LogOutIcon className="h-4 w-4 text-gray-500" />
            <span>ログアウト</span>
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 sm:px-6 lg:px-8 flex flex-col justify-center">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            メニューを選択してください
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* 打刻メニュー */}
          <button
            onClick={navigateToPunchMode}
            className="flex flex-col items-center justify-center p-8 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-500 transition-all duration-200 group h-48 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <CalendarDaysIcon className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">
              打刻
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              作業員の出勤・退勤を記録します
            </p>
          </button>

          {/* 作業員管理メニュー */}
          <button
            onClick={navigateToWorkers}
            className="flex flex-col items-center justify-center p-8 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-500 transition-all duration-200 group h-48 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <UsersIcon className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">
              作業員管理
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              自社作業員の追加・確認・編集を行います
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}