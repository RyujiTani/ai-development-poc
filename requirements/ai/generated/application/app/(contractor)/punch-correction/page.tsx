"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { correctionSchema, CorrectionFormValues } from '@/features/attendance/domain/correctionSchema';
import { IndexedDBUserRepository } from '@/features/user/repository/indexedDBUserRepository';
import { IndexedDBAttendanceRepository } from '@/features/attendance/repository/indexedDBAttendanceRepository';
import { IndexedDBWorkerRepository } from '@/features/worker/repository/indexedDBWorkerRepository';
import { GetWorkersUseCase } from '@/features/worker/usecase/getWorkersUseCase';
import { GetAttendanceRecordUseCase } from '@/features/attendance/usecase/getAttendanceRecordUseCase';
import { CorrectPunchUseCase } from '@/features/attendance/usecase/correctPunchUseCase';
import { User } from '@/features/user/domain/types';
import { Worker } from '@/features/worker/domain/types';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

function PunchCorrectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attendanceId = searchParams.get('attendance_id') || undefined;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      workerId: '',
      clockedAt: '',
      punchType: 'CLOCK_IN',
      reason: '',
    },
  });

  const formatISOToDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  useEffect(() => {
    const checkAuthAndInit = async () => {
      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'CONTRACTOR_MANAGER') {
        logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: '/punch-correction' });
        router.replace('/login');
        return;
      }

      try {
        const userRepository = new IndexedDBUserRepository();
        const user = await userRepository.findById(userId);

        if (!user || user.status !== 'ACTIVE' || !user.contractor_id) {
          logger.info('USER_OR_CONTRACTOR_NOT_FOUND', { userId });
          sessionStorage.clear();
          router.replace('/login');
          return;
        }

        setCurrentUser(user);
        setIsAuthenticated(true);

        const workerRepository = new IndexedDBWorkerRepository();
        const getWorkersUseCase = new GetWorkersUseCase(workerRepository);
        const workersResult = await getWorkersUseCase.execute(user.contractor_id);

        if (workersResult.success) {
          setWorkers(workersResult.value);
        } else if ('error' in workersResult) {
          setErrorMessage(workersResult.error.message);
        }

        if (attendanceId) {
          setEditMode(true);
          const attendanceRepository = new IndexedDBAttendanceRepository();
          const getAttendanceUseCase = new GetAttendanceRecordUseCase(attendanceRepository);
          const attendanceResult = await getAttendanceUseCase.execute(attendanceId, user.contractor_id);

          if (attendanceResult.success) {
            const record = attendanceResult.value;
            setValue('workerId', record.worker_id);
            setValue('punchType', record.punch_type);
            setValue('clockedAt', formatISOToDateTimeLocal(record.clocked_at));
          } else if ('error' in attendanceResult) {
            setErrorMessage(attendanceResult.error.message);
          }
        }
      } catch (error) {
        logger.error('AUTH_INIT_ERROR', error);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndInit();
  }, [router, attendanceId, setValue]);

  const onSubmit = async (data: CorrectionFormValues) => {
    if (isSubmitting || !currentUser?.contractor_id) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const attendanceRepository = new IndexedDBAttendanceRepository();
    const correctPunchUseCase = new CorrectPunchUseCase(attendanceRepository);

    try {
      const isoClockedAt = new Date(data.clockedAt).toISOString();
      const result = await correctPunchUseCase.execute({
        attendanceId,
        workerId: data.workerId,
        contractorId: currentUser.contractor_id,
        punchType: data.punchType,
        clockedAt: isoClockedAt,
        reason: data.reason,
        correctedBy: currentUser.user_id,
      });

      if (result.success) {
        toast.success('送信完了');
        router.push('/home');
      } else if ('error' in result) {
        setErrorMessage(result.error.message);
      }
    } catch (error) {
      logger.error('CORRECT_PUNCH_SUBMIT_ERROR', error);
      setErrorMessage('システムエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    logger.info('CORRECT_PUNCH_CANCELLED');
    router.push('/home');
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50" data-testid="loading">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="flex items-center justify-center h-10 w-10 rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="戻る"
              data-testid="back-btn"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl" data-testid="form-title">
              {editMode ? '打刻修正' : '手動打刻登録'}
            </h1>
          </div>
          <span className="text-sm font-medium text-gray-500">
            {currentUser?.display_name}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {errorMessage && (
          <div
            className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200"
            role="alert"
            data-testid="error-message"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-6">
            {/* 作業員選択 */}
            <div className="flex flex-col">
              <label htmlFor="workerId" className="block text-sm font-bold text-gray-700 mb-2">
                作業員 <span className="text-red-500 font-normal">(必須)</span>
              </label>
              <select
                id="workerId"
                disabled={editMode}
                {...register('workerId')}
                className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px] bg-white disabled:bg-gray-100"
                data-testid="worker-select"
              >
                <option value="">作業員を選択してください</option>
                {workers.map((worker) => (
                  <option key={worker.worker_id} value={worker.worker_id}>
                    {worker.name}
                  </option>
                ))}
              </select>
              {errors.workerId && (
                <p className="mt-1 text-sm text-red-600" id="workerId-error" data-testid="workerId-error">
                  {errors.workerId.message}
                </p>
              )}
            </div>

            {/* 打刻日時入力 */}
            <div className="flex flex-col">
              <label htmlFor="clockedAt" className="block text-sm font-bold text-gray-700 mb-2">
                打刻日時 <span className="text-red-500 font-normal">(必須)</span>
              </label>
              <input
                id="clockedAt"
                type="datetime-local"
                {...register('clockedAt')}
                className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px]"
                data-testid="clockedAt-input"
              />
              {errors.clockedAt && (
                <p className="mt-1 text-sm text-red-600" id="clockedAt-error" data-testid="clockedAt-error">
                  {errors.clockedAt.message}
                </p>
              )}
            </div>

            {/* 打刻種別選択 */}
            <div className="flex flex-col">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                打刻種別 <span className="text-red-500 font-normal">(必須)</span>
              </label>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <label className="flex items-center justify-center gap-3 cursor-pointer border-2 rounded-lg p-3 min-h-[44px] select-none hover:bg-gray-50 border-gray-200">
                  <input
                    type="radio"
                    value="CLOCK_IN"
                    {...register('punchType')}
                    className="h-6 w-6 text-indigo-600 focus:ring-indigo-500"
                    data-testid="punchType-clockin"
                  />
                  <span className="text-sm font-bold text-gray-700">出勤</span>
                </label>
                <label className="flex items-center justify-center gap-3 cursor-pointer border-2 rounded-lg p-3 min-h-[44px] select-none hover:bg-gray-50 border-gray-200">
                  <input
                    type="radio"
                    value="CLOCK_OUT"
                    {...register('punchType')}
                    className="h-6 w-6 text-indigo-600 focus:ring-indigo-500"
                    data-testid="punchType-clockout"
                  />
                  <span className="text-sm font-bold text-gray-700">退勤</span>
                </label>
              </div>
              {errors.punchType && (
                <p className="mt-1 text-sm text-red-600" id="punchType-error" data-testid="punchType-error">
                  {errors.punchType.message}
                </p>
              )}
            </div>

            {/* 修正理由入力 */}
            <div className="flex flex-col">
              <label htmlFor="reason" className="block text-sm font-bold text-gray-700 mb-2">
                修正理由 <span className="text-red-500 font-normal">(必須)</span>
              </label>
              <textarea
                id="reason"
                rows={4}
                {...register('reason')}
                placeholder="例: 打刻を失念したため手動で登録します。"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[88px]"
                data-testid="reason-input"
              />
              {errors.reason && (
                <p className="mt-1 text-sm text-red-600" id="reason-error" data-testid="reason-error">
                  {errors.reason.message}
                </p>
              )}
            </div>
          </div>

          {/* 保存・キャンセルボタン */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 h-12 rounded-md border border-gray-300 bg-white text-base font-bold text-gray-700 shadow-sm hover:bg-gray-50 flex items-center justify-center min-h-[44px]"
              data-testid="cancel-btn"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-md bg-indigo-600 text-base font-bold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center min-h-[44px] disabled:bg-indigo-400"
              data-testid="submit-btn"
            >
              {isSubmitting ? '送信中...' : '送信'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function PunchCorrectionPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <PunchCorrectionContent />
    </Suspense>
  );
}