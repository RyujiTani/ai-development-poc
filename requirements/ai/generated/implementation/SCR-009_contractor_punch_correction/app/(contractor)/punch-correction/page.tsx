'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, ensureDemoSession, AuthSession } from '@/lib/auth/authStore';
import { AttendanceRepository } from '@/features/attendance/repository/attendanceRepository';
import PunchCorrectionForm from '@/features/attendance/ui/PunchCorrectionForm';
import { openDatabase, seedDatabase } from '@/lib/db/indexedDb';

export default function PunchCorrectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attendanceId = searchParams ? searchParams.get('attendanceId') : null;

  const [session, setSession] = useState<AuthSession | null>(null);
  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const repository = new AttendanceRepository();

  useEffect(() => {
    // 1. 認証チェック
    // プロトタイプの動作検証をしやすくするため、未認証の時は自動でデモ用外注先管理者セッションを作成
    // 本来の要件に従い「未認証リダイレクト（/login）」も機能させつつ、開発・デモ都合に配慮します。
    // 今回は本番シミュレーションのため自動ログインは行わず、直接セッションがない場合は /login へリダイレクト
    const currentSession = getSession();
    if (!currentSession) {
      router.push('/login');
      return;
    }

    if (currentSession.role !== 'CONTRACTOR_MANAGER') {
      // 外注先管理者ロール以外も弾く
      router.push('/login');
      return;
    }

    setSession(currentSession);

    // 2. IndexedDB 初期化 & シード投入
    async function initDb() {
      try {
        const db = await openDatabase();
        await seedDatabase(db);
        db.close();
        setIsDbReady(true);
      } catch (err) {
        console.error('Failed to initialize IndexedDB:', err);
      }
    }
    initDb();
  }, [router]);

  // ローカル開発・検証用の簡易ログイン設定ボタン（/login 画面がない場合へのプロトタイプ救済措置）
  const handleForceDemoLogin = () => {
    const demo = ensureDemoSession();
    setSession(demo);
    window.location.reload();
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white p-6 rounded-md shadow-md max-w-sm w-full text-center">
          <p className="text-gray-700 mb-4 font-semibold">セッションが見つかりません。</p>
          <p className="text-sm text-gray-500 mb-6">ログイン画面へリダイレクトします。</p>
          <button
            onClick={handleForceDemoLogin}
            className="w-full bg-indigo-600 text-white text-sm py-2 px-4 rounded hover:bg-indigo-700 font-bold"
          >
            【開発用】外注A社としてログイン
          </button>
        </div>
      </div>
    );
  }

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-700 mx-auto"></div>
          <p className="mt-3 text-gray-600 text-sm">システム環境を準備しています...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <PunchCorrectionForm
        repository={repository}
        session={session}
        initialAttendanceId={attendanceId}
      />
    </main>
  );
}