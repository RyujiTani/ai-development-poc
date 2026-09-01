'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAttendanceStore } from '@/lib/store/attendanceStore';
import { Button } from '@/components/ui/button';

export default function PunchModePage() {
  const router = useRouter();
  const setPunchType = useAttendanceStore((state) => state.setPunchType);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // 認証チェック
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'CONTRACTOR_MANAGER') {
        setIsAuthenticated(false);
        router.replace('/login');
      } else {
        setIsAuthenticated(true);
      }
    }
  }, [router]);

  // 動的時刻更新
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const day = dayNames[date.getDay()];
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}年${mm}月${dd}日(${day}) ${hh}:${min}:${ss}`;
  };

  const handleSelectMode = (type: 'CLOCK_IN' | 'CLOCK_OUT') => {
    setPunchType(type);
    router.push('/worker-select');
  };

  const handleBack = () => {
    router.push('/contractor-home');
  };

  // 認証確認中、または未認証の場合は何も描画しない
  if (isAuthenticated === null || isAuthenticated === false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between p-4 md:p-8">
      {/* ヘッダーエリア */}
      <header className="max-w-md w-full mx-auto text-center my-4">
        <h1 className="text-xl font-bold text-gray-800">打刻モード選択</h1>
        <p className="text-xs text-gray-500 mt-1">外注先作業員 勤怠・配置管理</p>
      </header>

      {/* メインエリア */}
      <main className="flex-1 flex flex-col justify-center items-center max-w-md w-full mx-auto my-auto space-y-8">
        {/* 時刻表示部 */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
            打刻対象日時（目安）
          </div>
          <div className="text-lg md:text-xl font-mono font-bold text-blue-600">
            {currentTime ? formatDateTime(currentTime) : '読み込み中...'}
          </div>
        </div>

        {/* 選択ボタン */}
        <div className="w-full flex flex-col space-y-4">
          <button
            onClick={() => handleSelectMode('CLOCK_IN')}
            className="w-full min-h-[96px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl shadow-md transition-all duration-150 flex flex-col justify-center items-center p-6 text-center focus:outline-none focus:ring-4 focus:ring-emerald-200"
            aria-label="出勤"
          >
            <span className="text-2xl font-bold tracking-wider">出勤</span>
            <span className="text-xs text-emerald-100 mt-1">作業開始の打刻を行います</span>
          </button>

          <button
            onClick={() => handleSelectMode('CLOCK_OUT')}
            className="w-full min-h-[96px] bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-2xl shadow-md transition-all duration-150 flex flex-col justify-center items-center p-6 text-center focus:outline-none focus:ring-4 focus:ring-amber-200"
            aria-label="退勤"
          >
            <span className="text-2xl font-bold tracking-wider">退勤</span>
            <span className="text-xs text-amber-100 mt-1">作業終了の打刻を行います</span>
          </button>
        </div>
      </main>

      {/* フッターエリア */}
      <footer className="max-w-md w-full mx-auto mt-8 mb-4">
        <Button
          variant="outline"
          onClick={handleBack}
          className="w-full rounded-xl py-4 text-base font-semibold"
        >
          ホームへ戻る
        </Button>
      </footer>
    </div>
  );
}
