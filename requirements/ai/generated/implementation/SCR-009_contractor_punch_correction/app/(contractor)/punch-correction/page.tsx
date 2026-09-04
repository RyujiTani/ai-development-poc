'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sessionStore, UserSession } from '@/lib/auth/sessionStore';
import { punchCorrectionUseCase } from '@/features/attendance/usecase/punchCorrectionUseCase';
import { Worker, PunchType } from '@/features/attendance/domain/types';

// トースト通知の簡易実装
const showToast = (message: string) => {
  const container = document.getElementById('toast-container') || document.createElement('div');
  container.id = 'toast-container';
  container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none';
  if (!document.body.contains(container)) {
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'bg-slate-900 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium animate-bounce pointer-events-auto';
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
};

export default function PunchCorrectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attendanceId = searchParams.get('attendance_id') || undefined;

  const [session, setSession] = useState<UserSession | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  // フォームステート
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [punchType, setPunchType] = useState<PunchType>('CLOCK_IN');
  const [clockedDate, setClockedDate] = useState('');
  const [clockedTime, setClockedTime] = useState('');
  const [reason, setReason] = useState('');

  // エラーステート
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // 開発中の利便性のため、未ログイン時にテストセッションを仕込む設定
    const currentSession = sessionStore.getSession();
    if (!currentSession || currentSession.role !== 'CONTRACTOR_MANAGER') {
      // 本来リダイレクト
      router.push('/login');
      return;
    }
    setSession(currentSession);

    // データロード
    const loadInitialData = async () => {
      try {
        if (currentSession.contractorId) {
          const list = await punchCorrectionUseCase.getWorkers(currentSession.contractorId);
          setWorkers(list);
        }

        if (attendanceId) {
          // 既存打刻修正モード
          const record = await punchCorrectionUseCase.getExistingAttendance(attendanceId);
          if (record) {
            setSelectedWorkerId(record.worker_id);
            setPunchType(record.punch_type);
            
            // clocked_at から日付と時刻にパース
            const dateObj = new Date(record.clocked_at);
            // 日本時間にフォーマット
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const date = String(dateObj.getDate()).padStart(2, '0');
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');

            setClockedDate(`${year}-${month}-${date}`);
            setClockedTime(`${hours}:${minutes}`);
          }
        } else {
          // 新規手動登録モード: 現在日時をセット
          const dateObj = new Date();
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const date = String(dateObj.getDate()).padStart(2, '0');
          const hours = String(dateObj.getHours()).padStart(2, '0');
          const minutes = String(dateObj.getMinutes()).padStart(2, '0');

          setClockedDate(`${year}-${month}-${date}`);
          setClockedTime(`${hours}:${minutes}`);
        }
      } catch (err) {
        console.error('Data load error', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [attendanceId, router]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedWorkerId) {
      newErrors.worker = '作業員を選択してください';
    }
    if (!clockedDate || !clockedTime) {
      newErrors.datetime = '打刻日時を正しく入力してください';
    } else {
      // 有効な日時かチェック
      const combined = new Date(`${clockedDate}T${clockedTime}`);
      if (isNaN(combined.getTime())) {
        newErrors.datetime = '打刻日時を正しく入力してください';
      }
    }
    if (!punchType) {
      newErrors.punchType = '打刻種別を選択してください';
    }
    if (!reason.trim()) {
      newErrors.reason = '修正理由を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (!validate()) {
      return;
    }

    try {
      const combinedDateTime = new Date(`${clockedDate}T${clockedTime}`).toISOString();
      await punchCorrectionUseCase.submitCorrection({
        workerId: selectedWorkerId,
        punchType,
        punchedAt: combinedDateTime,
        reason,
        attendanceId,
        correctedBy: session.userId,
        contractorId: session.contractorId || '',
      });

      showToast(attendanceId ? '打刻情報を修正しました' : '打刻漏れを手動登録しました');
      router.push('/contractor/home');
    } catch (err) {
      console.error(err);
      showToast('エラーが発生しました。保存できませんでした。');
    }
  };

  const handleCancel = () => {
    router.push('/contractor/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 animate-pulse text-base font-semibold">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden md:max-w-lg">
        <header className="bg-slate-900 px-6 py-4">
          <h1 className="text-white text-lg font-bold flex items-center gap-2">
            <span>🛡️</span>
            {attendanceId ? '打刻内容の修正' : '打刻漏れ手動登録'}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            操作者: {session?.displayName}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 作業員選択 */}
          <div className="space-y-2">
            <label htmlFor="worker-select" className="block text-sm font-semibold text-slate-700">
              対象作業員 <span className="text-red-500 font-bold">*</span>
            </label>
            <select
              id="worker-select"
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              disabled={!!attendanceId} // 修正時は対象作業員の変更は不可とする
              className={`block w-full rounded-lg border-2 p-3 text-base ${
                errors.worker ? 'border-red-500 bg-red-50' : 'border-slate-200'
              } focus:border-slate-900 focus:outline-none min-h-[44px] disabled:bg-slate-100 disabled:text-slate-500`}
            >
              <option value="">-- 作業員を選択してください --</option>
              {workers.map((w) => (
                <option key={w.worker_id} value={w.worker_id}>
                  {w.name}
                </option>
              ))}
            </select>
            {errors.worker && <p className="text-red-500 text-xs font-semibold">{errors.worker}</p>}
          </div>

          {/* 打刻種別 */}
          <div className="space-y-2">
            <span className="block text-sm font-semibold text-slate-700">
              打刻種別 <span className="text-red-500 font-bold">*</span>
            </span>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPunchType('CLOCK_IN')}
                className={`py-3 text-center rounded-lg text-base font-bold min-h-[44px] transition-all border-2 ${
                  punchType === 'CLOCK_IN'
                    ? 'bg-emerald-500 border-emerald-600 text-white shadow'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                📥 出勤
              </button>
              <button
                type="button"
                onClick={() => setPunchType('CLOCK_OUT')}
                className={`py-3 text-center rounded-lg text-base font-bold min-h-[44px] transition-all border-2 ${
                  punchType === 'CLOCK_OUT'
                    ? 'bg-amber-500 border-amber-600 text-white shadow'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                📤 退勤
              </button>
            </div>
            {errors.punchType && <p className="text-red-500 text-xs font-semibold">{errors.punchType}</p>}
          </div>

          {/* 打刻日時 */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              打刻日時 <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                value={clockedDate}
                onChange={(e) => setClockedDate(e.target.value)}
                className={`block w-full rounded-lg border-2 p-3 text-base min-h-[44px] ${
                  errors.datetime ? 'border-red-500 bg-red-50 font-medium' : 'border-slate-200'
                } focus:border-slate-900 focus:outline-none`}
              />
              <input
                type="time"
                value={clockedTime}
                onChange={(e) => setClockedTime(e.target.value)}
                className={`block w-full rounded-lg border-2 p-3 text-base min-h-[44px] ${
                  errors.datetime ? 'border-red-500 bg-red-50 font-medium' : 'border-slate-200'
                } focus:border-slate-900 focus:outline-none`}
              />
            </div>
            {errors.datetime && <p className="text-red-500 text-xs font-semibold">{errors.datetime}</p>}
          </div>

          {/* 修正理由 */}
          <div className="space-y-2">
            <label htmlFor="reason-textarea" className="block text-sm font-semibold text-slate-700">
              理由・備考 <span className="text-red-500 font-bold">*</span>
            </label>
            <textarea
              id="reason-textarea"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例：打刻漏れのため。スマホを忘れたため。"
              className={`block w-full rounded-lg border-2 p-3 text-base ${
                errors.reason ? 'border-red-500 bg-red-50' : 'border-slate-200'
              } focus:border-slate-900 focus:outline-none placeholder-slate-400`}
            />
            {errors.reason && <p className="text-red-500 text-xs font-semibold">{errors.reason}</p>}
          </div>

          {/* アクションボタン */}
          <div className="pt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg text-base font-bold min-h-[44px] hover:bg-slate-50 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-slate-900 text-white rounded-lg text-base font-bold min-h-[44px] hover:bg-slate-800 transition shadow"
            >
              送信
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}