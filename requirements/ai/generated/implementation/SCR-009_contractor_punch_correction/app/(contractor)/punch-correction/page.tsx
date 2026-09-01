'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { seedInitialData } from '@/lib/db/indexedDb';
import { IndexedDBWorkerRepository } from '@/features/worker/repository/workerRepository';
import { IndexedDBAttendanceRepository } from '@/features/attendance/repository/attendanceRepository';
import { Worker } from '@/features/worker/domain/worker';
import { PunchType, AttendanceRecord, AttendanceCorrection } from '@/features/attendance/domain/attendance';

export default function PunchCorrectionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Form States
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [punchedAt, setPunchedAt] = useState<string>('');
  const [punchType, setPunchType] = useState<PunchType | ''>('');
  const [reason, setReason] = useState<string>('');

  // Error States
  const [errors, setErrors] = useState<{
    workerId?: string;
    punchedAt?: string;
    punchType?: string;
    reason?: string;
    global?: string;
  }>({});

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuthAndLoad() {
      const session = getSessionUser();
      if (!session || session.role !== 'CONTRACTOR_MANAGER' || !session.contractorId) {
        router.push('/login');
        return;
      }
      setContractorId(session.contractorId);
      setUserId(session.userId);

      try {
        await seedInitialData();
        const workerRepo = new IndexedDBWorkerRepository();
        const data = await workerRepo.getByContractorId(session.contractorId);
        setWorkers(data);

        // Set initial timezone-adjusted local time
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
        setPunchedAt(localISOTime);
      } catch (err) {
        console.error('Failed to load initial data:', err);
        setErrors({ global: 'データの読み込みに失敗しました。' });
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthAndLoad();
  }, [router]);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    let isValid = true;

    if (!selectedWorkerId) {
      newErrors.workerId = '作業員を選択してください';
      isValid = false;
    }

    if (!punchedAt) {
      newErrors.punchedAt = '有効な日時を入力してください';
      isValid = false;
    } else {
      const parsedDate = new Date(punchedAt);
      if (isNaN(parsedDate.getTime())) {
        newErrors.punchedAt = '有効な日時を入力してください';
        isValid = false;
      }
    }

    if (!punchType) {
      newErrors.punchType = '打刻種別を選択してください';
      isValid = false;
    }

    if (!reason.trim()) {
      newErrors.reason = '修正理由を入力してください';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (isSubmitting || !contractorId || !userId) return;

    setIsSubmitting(true);
    try {
      const attendanceId = crypto.randomUUID();
      const correctionId = crypto.randomUUID();
      const isoClockedAt = new Date(punchedAt).toISOString();

      const record: AttendanceRecord = {
        attendance_id: attendanceId,
        worker_id: selectedWorkerId,
        contractor_id: contractorId,
        punch_type: punchType as PunchType,
        clocked_at: isoClockedAt,
        punched_by: userId,
        photo_object_id: '',
        created_at: new Date().toISOString(),
      };

      const correction: AttendanceCorrection = {
        correction_id: correctionId,
        attendance_id: attendanceId,
        corrected_by: userId,
        reason: reason.trim(),
        after: {
          worker_id: selectedWorkerId,
          punch_type: punchType as PunchType,
          clocked_at: isoClockedAt,
        },
        corrected_at: new Date().toISOString(),
      };

      const attendanceRepo = new IndexedDBAttendanceRepository();
      await attendanceRepo.saveCorrection(correction, record);

      setToastMessage('打刻修正を登録しました');
      setTimeout(() => {
        router.push('/contractor/home');
      }, 1500);
    } catch (err) {
      console.error('Failed to submit correction:', err);
      setErrors({ global: '送信中にエラーが発生しました。' });
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/contractor/home');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg animate-pulse">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-md shadow-lg font-bold animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 py-4 px-6">
        <h1 className="text-xl font-bold text-gray-800 text-center md:text-left">
          外注先打刻修正フォーム
        </h1>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-lg mx-auto p-4 md:py-8">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.global && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold border border-red-200">
                {errors.global}
              </div>
            )}

            {/* 1. Worker Selection */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-bold text-lg">
                対象作業員 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedWorkerId}
                onChange={(e) => {
                  setSelectedWorkerId(e.target.value);
                  if (errors.workerId) setErrors((prev) => ({ ...prev, workerId: undefined }));
                }}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[56px]"
              >
                <option value="">-- 作業員を選択してください --</option>
                {workers.map((w) => (
                  <option key={w.worker_id} value={w.worker_id}>
                    {w.name}
                  </option>
                ))}
              </select>
              {errors.workerId && (
                <p className="text-red-500 text-sm font-semibold mt-1">{errors.workerId}</p>
              )}
            </div>

            {/* 2. Punch Date & Time */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-bold text-lg">
                打刻日時 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={punchedAt}
                onChange={(e) => {
                  setPunchedAt(e.target.value);
                  if (errors.punchedAt) setErrors((prev) => ({ ...prev, punchedAt: undefined }));
                }}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[56px]"
              />
              {errors.punchedAt && (
                <p className="text-red-500 text-sm font-semibold mt-1">{errors.punchedAt}</p>
              )}
            </div>

            {/* 3. Punch Type Selection */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-bold text-lg">
                打刻種別 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`flex items-center justify-center border-2 rounded-xl p-4 cursor-pointer text-lg font-bold transition-all min-h-[56px] ${
                    punchType === 'CLOCK_IN'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="punch_type"
                    value="CLOCK_IN"
                    checked={punchType === 'CLOCK_IN'}
                    onChange={() => {
                      setPunchType('CLOCK_IN');
                      if (errors.punchType) setErrors((prev) => ({ ...prev, punchType: undefined }));
                    }}
                    className="sr-only"
                  />
                  出勤
                </label>

                <label
                  className={`flex items-center justify-center border-2 rounded-xl p-4 cursor-pointer text-lg font-bold transition-all min-h-[56px] ${
                    punchType === 'CLOCK_OUT'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="punch_type"
                    value="CLOCK_OUT"
                    checked={punchType === 'CLOCK_OUT'}
                    onChange={() => {
                      setPunchType('CLOCK_OUT');
                      if (errors.punchType) setErrors((prev) => ({ ...prev, punchType: undefined }));
                    }}
                    className="sr-only"
                  />
                  退勤
                </label>
              </div>
              {errors.punchType && (
                <p className="text-red-500 text-sm font-semibold mt-1">{errors.punchType}</p>
              )}
            </div>

            {/* 4. Reason Textarea */}
            <div className="space-y-2">
              <label className="block text-gray-700 font-bold text-lg">
                修正・手動打刻の理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errors.reason) setErrors((prev) => ({ ...prev, reason: undefined }));
                }}
                rows={3}
                placeholder="打刻漏れのため、手動で実績を追加します。"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[100px]"
              />
              {errors.reason && (
                <p className="text-red-500 text-sm font-semibold mt-1">{errors.reason}</p>
              )}
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors shadow-md active:scale-95 disabled:opacity-50 min-h-[56px]"
              >
                {isSubmitting ? '送信中...' : '送信'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 px-6 rounded-lg text-lg transition-colors active:scale-95 disabled:opacity-50 min-h-[56px]"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center text-xs text-gray-400">
        &copy; 2026 外注作業員 勤怠・配置管理システム フロントエンドプロトタイプ
      </footer>
    </div>
  );
}
