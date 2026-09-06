'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { initDB } from '@/lib/db/indexedDB';
import { User, Worker } from '@/features/attendance/domain/types';
import { attendanceRepository } from '@/features/attendance/repository/attendanceRepository';
import { workerRepository } from '@/features/worker/repository/workerRepository';
import { logger } from '@/lib/logger';
import { logoutMock } from '@/lib/auth/mockAuth';

const correctionSchema = z.object({
  worker_id: z.string().min(1, { message: '対象作業員は必須選択です' }),
  clocked_at: z.string().min(1, { message: '打刻日時を入力してください' }).refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  }, { message: '有効な日時を入力してください' }),
  punch_type: z.enum(['CLOCK_IN', 'CLOCK_OUT'], { errorMap: () => ({ message: '打刻種別を選択してください' }) }),
  reason: z.string().trim().min(1, { message: '修正理由は必須入力です' }),
});

type CorrectionFormValues = z.infer<typeof correctionSchema>;

export default function PunchCorrectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attendanceId = searchParams.get('attendance_id') || undefined;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      worker_id: '',
      clocked_at: '',
      punch_type: 'CLOCK_IN',
      reason: '',
    },
  });

  useEffect(() => {
    async function checkAuthAndLoadData() {
      if (typeof window === 'undefined' || !window.sessionStorage) return;

      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');
      const contractorId = sessionStorage.getItem('contractor_id');

      if (!userId || role !== 'CONTRACTOR_MANAGER' || !contractorId) {
        logger.warn('UNAUTHORIZED_ACCESS_ATTEMPT', { userId, role });
        router.push('/login');
        return;
      }

      try {
        const db = await initDB();

        // ユーザー情報の検証
        const userTx = db.transaction('users', 'readonly');
        const userStore = userTx.objectStore('users');
        const user = (await userStore.get(userId)) as User | undefined;

        if (!user || user.role !== 'CONTRACTOR_MANAGER' || user.status !== 'ACTIVE') {
          logger.warn('INVALID_USER_OR_ROLE', { userId });
          logoutMock();
          router.push('/login');
          return;
        }

        setCurrentUser(user);

        // 自社の作業員一覧を取得
        const activeWorkers = await workerRepository.getWorkersByContractor(contractorId);
        const filteredWorkers = activeWorkers
          .filter((w) => w.status === 'ACTIVE')
          .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        setWorkers(filteredWorkers);

        // 既存打刻データの修正ロード
        if (attendanceId) {
          logger.info('FETCH_ATTENDANCE_RECORD_START', { attendanceId });
          const record = await attendanceRepository.getAttendanceRecord(attendanceId);
          if (!record || record.contractor_id !== contractorId) {
            logger.warn('ATTENDANCE_RECORD_NOT_FOUND_OR_ACCESS_DENIED', { attendanceId, contractorId });
            setError('対象の打刻記録が見つからないか、アクセス権がありません。');
          } else {
            setValue('worker_id', record.worker_id);
            setValue('punch_type', record.punch_type);

            const dateObj = new Date(record.clocked_at);
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const hh = String(dateObj.getHours()).padStart(2, '0');
            const min = String(dateObj.getMinutes()).padStart(2, '0');
            setValue('clocked_at', `${yyyy}-${mm}-${dd}T${hh}:${min}`);

            logger.info('FETCH_ATTENDANCE_RECORD_SUCCESS', { attendanceId });
          }
        } else {
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const hh = String(now.getHours()).padStart(2, '0');
          const min = String(now.getMinutes()).padStart(2, '0');
          setValue('clocked_at', `${yyyy}-${mm}-${dd}T${hh}:${min}`);
        }
      } catch (err) {
        logger.error('LOAD_PUNCH_CORRECTION_PAGE_FAILED', { error: String(err) });
        setError('データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthAndLoadData();
  }, [router, attendanceId, setValue]);

  const onSubmit = async (data: CorrectionFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const contractorId = sessionStorage.getItem('contractor_id') || '';
    const userId = sessionStorage.getItem('user_id') || '';

    try {
      const isoClockedAt = new Date(data.clocked_at).toISOString();

      logger.info('SAVE_PUNCH_CORRECTION_START', { attendanceId });
      const result = await attendanceRepository.saveCorrection({
        attendanceId,
        workerId: data.worker_id,
        contractorId,
        punchType: data.punch_type,
        clockedAt: isoClockedAt,
        reason: data.reason,
        correctedBy: userId,
      });

      if (result.success) {
        logger.info('SAVE_PUNCH_CORRECTION_SUCCESS', { attendanceId });
        setSuccessMessage(attendanceId ? '打刻データの修正を完了しました' : '手動打刻の登録を完了しました');

        setTimeout(() => {
          router.push('/contractor/home');
        }, 1500);
      } else {
        throw new Error('保存処理に失敗しました');
      }
    } catch (err) {
      logger.error('SAVE_PUNCH_CORRECTION_FAILED', { error: String(err) });
      setError('送信に失敗しました。再試行してください。');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    logger.info('PUNCH_CORRECTION_CANCELLED');
    router.push('/contractor/home');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {attendanceId ? '打刻修正' : '手動打刻登録'}
            </h1>
            {currentUser && (
              <p className="text-sm text-gray-600 mt-1">
                所属: <span className="font-semibold">{currentUser.display_name}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleCancel}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-500 transition-colors"
            style={{ minHeight: '44px' }}
          >
            キャンセル
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 mx-auto max-w-md w-full px-4 py-6">
        <div className="bg-white rounded-xl shadow p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
              <span className="block sm:inline text-sm font-bold" data-testid="error-message">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6" role="alert">
              <span className="block sm:inline text-sm font-bold" data-testid="success-message">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 対象作業員 */}
            <div>
              <label htmlFor="worker_id" className="block text-sm font-bold text-gray-700 mb-1">
                対象作業員 <span className="text-red-500">*</span>
              </label>
              <select
                id="worker_id"
                disabled={!!attendanceId || isSubmitting}
                className={`block w-full rounded-md border-0 py-3 px-3 text-gray-900 ring-1 ring-inset ${
                  errors.worker_id ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300 focus:ring-blue-600'
                } focus:ring-2 focus:ring-inset text-base min-h-[44px] bg-white`}
                {...register('worker_id')}
              >
                <option value="">作業員を選択してください</option>
                {workers.map((worker) => (
                  <option key={worker.worker_id} value={worker.worker_id}>
                    {worker.name}
                  </option>
                ))}
              </select>
              {errors.worker_id && (
                <p className="mt-1 text-sm text-red-600" id="worker_id-error" data-testid="worker_id-error">
                  {errors.worker_id.message}
                </p>
              )}
            </div>

            {/* 打刻種別 */}
            <div>
              <span className="block text-sm font-bold text-gray-700 mb-2">
                打刻種別 <span className="text-red-500">*</span>
              </span>
              <div className="flex gap-4">
                <label className="flex-1 flex items-center p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer min-h-[44px]">
                  <input
                    type="radio"
                    value="CLOCK_IN"
                    disabled={isSubmitting}
                    className="h-6 w-6 border-gray-300 text-blue-600 focus:ring-blue-500"
                    {...register('punch_type')}
                  />
                  <span className="ml-3 text-base text-gray-900 font-bold">出勤</span>
                </label>
                <label className="flex-1 flex items-center p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer min-h-[44px]">
                  <input
                    type="radio"
                    value="CLOCK_OUT"
                    disabled={isSubmitting}
                    className="h-6 w-6 border-gray-300 text-red-600 focus:ring-red-500"
                    {...register('punch_type')}
                  />
                  <span className="ml-3 text-base text-gray-900 font-bold">退勤</span>
                </label>
              </div>
              {errors.punch_type && (
                <p className="mt-1 text-sm text-red-600" data-testid="punch_type-error">
                  {errors.punch_type.message}
                </p>
              )}
            </div>

            {/* 打刻日時 */}
            <div>
              <label htmlFor="clocked_at" className="block text-sm font-bold text-gray-700 mb-1">
                打刻日時 <span className="text-red-500">*</span>
              </label>
              <input
                id="clocked_at"
                type="datetime-local"
                disabled={isSubmitting}
                className={`block w-full rounded-md border-0 py-3 px-3 text-gray-900 ring-1 ring-inset ${
                  errors.clocked_at ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300 focus:ring-blue-600'
                } focus:ring-2 focus:ring-inset text-base min-h-[44px]`}
                {...register('clocked_at')}
              />
              {errors.clocked_at && (
                <p className="mt-1 text-sm text-red-600" id="clocked_at-error" data-testid="clocked_at-error">
                  {errors.clocked_at.message}
                </p>
              )}
            </div>

            {/* 修正理由 */}
            <div>
              <label htmlFor="reason" className="block text-sm font-bold text-gray-700 mb-1">
                修正理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                rows={3}
                placeholder="例: 打刻忘れのため手動追加"
                disabled={isSubmitting}
                className={`block w-full rounded-md border-0 py-3 px-3 text-gray-900 ring-1 ring-inset ${
                  errors.reason ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300 focus:ring-blue-600'
                } placeholder:text-gray-400 focus:ring-2 focus:ring-inset text-base min-h-[44px]`}
                {...register('reason')}
              />
              {errors.reason && (
                <p className="mt-1 text-sm text-red-600" id="reason-error" data-testid="reason-error">
                  {errors.reason.message}
                </p>
              )}
            </div>

            {/* アクションボタン */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:flex-1 rounded-xl bg-gray-200 py-4 text-center text-sm font-bold text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-50"
                style={{ minHeight: '56px' }}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:flex-1 rounded-xl bg-blue-600 py-4 text-center text-sm font-bold text-white hover:bg-blue-500 transition-colors disabled:bg-blue-400"
                style={{ minHeight: '56px' }}
              >
                {isSubmitting ? '送信中...' : '送信'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}