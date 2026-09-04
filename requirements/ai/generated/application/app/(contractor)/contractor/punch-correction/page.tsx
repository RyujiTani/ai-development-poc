'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sessionManager, Session } from '../../../../lib/auth/session';
import { useToast } from '../../../../components/ui/toast';
import { logger } from '../../../../lib/logger/logger';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { IndexedDBWorkerRepository } from '../../../../features/worker/repository/workerRepository';
import { GetWorkersUseCase } from '../../../../features/worker/usecase/getWorkersUseCase';
import { Worker } from '../../../../features/worker/domain/worker';
import { IndexedDBAttendanceRepository, AttendanceRecord } from '../../../../features/attendance/repository/attendanceRepository';
import { GetWorkerAttendanceUseCase } from '../../../../features/attendance/usecase/getWorkerAttendanceUseCase';
import { CorrectAttendanceUseCase } from '../../../../features/attendance/usecase/correctAttendanceUseCase';

const correctionSchema = z.object({
  workerId: z.string().min(1, '作業員を選択してください。'),
  attendanceId: z.string().optional(),
  punchType: z.enum(['CLOCK_IN', 'CLOCK_OUT'], {
    errorMap: () => ({ message: '打刻種別を選択してください。' }),
  }),
  clockedAt: z.string().min(1, '日時を正しく入力してください。').refine((val) => {
    if (!val) return false;
    const date = new Date(val);
    const now = new Date();
    // 未来時刻のバリデーション (プロトタイプとして簡易的に現在から1分後までを許容)
    return date.getTime() <= now.getTime() + 60000;
  }, {
    message: '日時を正しく入力してください。',
  }),
  reason: z.string().min(1, '修正理由を入力してください。'),
});

type CorrectionFormValues = z.infer<typeof correctionSchema>;

export default function PunchCorrectionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      workerId: '',
      attendanceId: '',
      punchType: 'CLOCK_IN',
      clockedAt: '',
      reason: '',
    },
  });

  const selectedWorkerId = watch('workerId');
  const selectedAttendanceId = watch('attendanceId');

  // 1. 認証ガード & 作業員一覧の取得
  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'CONTRACTOR_MANAGER') {
      logger.warn('unauthorized_access_redirect_from_punch_correction', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.push('/login');
      return;
    }
    setSession(currentSession);

    const fetchWorkers = async () => {
      try {
        const workerRepo = new IndexedDBWorkerRepository();
        const useCase = new GetWorkersUseCase(workerRepo);
        const result = await useCase.execute(currentSession.contractor_id || '');
        if (result.success) {
          setWorkers(result.value);
        } else {
          showToast(result.error.message, 'error');
        }
      } catch (err) {
        logger.error('failed_to_fetch_workers_for_correction', err);
        showToast('作業員一覧の取得に失敗しました。', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
    logger.info('punch_correction_loaded', { user_id: currentSession.user_id });
  }, [router, showToast]);

  // 2. 選択された作業員の打刻履歴の取得
  useEffect(() => {
    if (!selectedWorkerId) {
      setRecords([]);
      setValue('attendanceId', '');
      return;
    }

    const fetchRecords = async () => {
      try {
        const attendanceRepo = new IndexedDBAttendanceRepository();
        const useCase = new GetWorkerAttendanceUseCase(attendanceRepo);
        const result = await useCase.execute(selectedWorkerId);
        if (result.success) {
          setRecords(result.value);
        }
      } catch (err) {
        logger.error('failed_to_fetch_attendance_for_worker', err, { worker_id: selectedWorkerId });
      }
    };

    fetchRecords();
    setValue('attendanceId', ''); // 作業員切り替え時に打刻選択をクリア
  }, [selectedWorkerId, setValue]);

  // 3. 選択された打刻データの自動フォーム反映
  useEffect(() => {
    if (!selectedAttendanceId) {
      // 新規登録モード: 現在日時をセット
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
      setValue('clockedAt', localISOTime);
      setValue('punchType', 'CLOCK_IN');
      return;
    }

    const selectedRecord = records.find((r) => r.attendance_id === selectedAttendanceId);
    if (selectedRecord) {
      const date = new Date(selectedRecord.clocked_at);
      const offset = date.getTimezoneOffset() * 60000;
      const formatted = new Date(date.getTime() - offset).toISOString().slice(0, 16);
      setValue('clockedAt', formatted);
      setValue('punchType', selectedRecord.punch_type);
    }
  }, [selectedAttendanceId, records, setValue]);

  // 4. 保存・送信
  const onSubmit = async (data: CorrectionFormValues) => {
    if (!session) return;
    setSubmitting(true);
    try {
      const attendanceRepo = new IndexedDBAttendanceRepository();
      const useCase = new CorrectAttendanceUseCase(attendanceRepo);

      // local datetime-local 形式から ISO8601 に変換
      const isoClockedAt = new Date(data.clockedAt).toISOString();

      const result = await useCase.execute({
        attendanceId: data.attendanceId || undefined,
        workerId: data.workerId,
        contractorId: session.contractor_id || '',
        punchType: data.punchType,
        clockedAt: isoClockedAt,
        reason: data.reason,
        correctedBy: session.user_id,
      });

      if (result.success) {
        showToast('打刻情報を送信しました。', 'success');
        router.push('/contractor');
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      logger.error('punch_correction_submission_failed', err);
      showToast('データの送信に失敗しました。', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    logger.info('punch_correction_canceled', { user_id: session?.user_id });
    router.push('/contractor');
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition h-10 w-10 flex items-center justify-center cursor-pointer"
              aria-label="戻る"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-indigo-600 tracking-wider">勤怠・配置管理</span>
              <span className="text-sm font-bold text-gray-900 sm:text-base">打刻修正・手動登録</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">{session?.display_name} 様</p>
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">打刻データの修正・登録</h1>
          <p className="text-sm text-gray-500 mt-1">
            打刻忘れの手動登録、または誤った打刻実績の修正を行えます。
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* 作業員選択 */}
            <div>
              <label htmlFor="workerId" className="block text-sm font-bold text-gray-700 mb-1.5">
                対象作業員 <span className="text-red-500 text-xs font-normal">(必須)</span>
              </label>
              <select
                id="workerId"
                disabled={submitting}
                className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 text-base focus:outline-none transition duration-150 ease-in-out cursor-pointer disabled:bg-gray-100"
                {...register('workerId')}
              >
                <option value="">作業員を選択してください</option>
                {workers.map((w) => (
                  <option key={w.worker_id} value={w.worker_id}>
                    {w.name}
                  </option>
                ))}
              </select>
              {errors.workerId && (
                <p className="mt-1.5 text-sm text-red-600">{errors.workerId.message}</p>
              )}
            </div>

            {/* 対象打刻の選択 */}
            {selectedWorkerId && (
              <div>
                <label htmlFor="attendanceId" className="block text-sm font-bold text-gray-700 mb-1.5">
                  処理種別 / 修正対象打刻
                </label>
                <select
                  id="attendanceId"
                  disabled={submitting}
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 text-base focus:outline-none transition duration-150 ease-in-out cursor-pointer disabled:bg-gray-100"
                  {...register('attendanceId')}
                >
                  <option value="">【新規登録】手動で新しく打刻を追加する</option>
                  {records.map((r) => {
                    const typeLabel = r.punch_type === 'CLOCK_IN' ? '出勤' : '退勤';
                    const dateStr = new Date(r.clocked_at).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    return (
                      <option key={r.attendance_id} value={r.attendance_id}>
                        {`【修正】${dateStr} - ${typeLabel}`}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* 打刻種別 */}
            <div>
              <span className="block text-sm font-bold text-gray-700 mb-3">打刻種別</span>
              <div className="flex gap-4">
                <label className="flex-1 flex items-center justify-center h-14 rounded-xl border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition px-4 gap-2 font-bold text-gray-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:text-indigo-900">
                  <input
                    type="radio"
                    value="CLOCK_IN"
                    disabled={submitting}
                    className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                    {...register('punchType')}
                  />
                  出勤
                </label>
                <label className="flex-1 flex items-center justify-center h-14 rounded-xl border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition px-4 gap-2 font-bold text-gray-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:text-indigo-900">
                  <input
                    type="radio"
                    value="CLOCK_OUT"
                    disabled={submitting}
                    className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                    {...register('punchType')}
                  />
                  退勤
                </label>
              </div>
              {errors.punchType && (
                <p className="mt-1.5 text-sm text-red-600">{errors.punchType.message}</p>
              )}
            </div>

            {/* 打刻日時 */}
            <div>
              <Input
                id="clockedAt"
                type="datetime-local"
                label="打刻日時"
                disabled={submitting}
                error={errors.clockedAt?.message}
                className="h-12 text-base"
                {...register('clockedAt')}
              />
            </div>

            {/* 修正理由 */}
            <div>
              <label htmlFor="reason" className="block text-sm font-bold text-gray-700 mb-1.5">
                修正理由 / 登録理由 <span className="text-red-500 text-xs font-normal">(必須)</span>
              </label>
              <textarea
                id="reason"
                disabled={submitting}
                rows={3}
                placeholder="例: 打刻し忘れたため手動登録します / 打刻時間を誤ったため修正します"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 text-base focus:outline-none transition duration-150 ease-in-out disabled:bg-gray-100"
                {...register('reason')}
              />
              {errors.reason && (
                <p className="mt-1.5 text-sm text-red-600">{errors.reason.message}</p>
              )}
            </div>

            {/* ボタン */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="w-full sm:flex-1 h-12 rounded-xl text-gray-600 hover:text-gray-900 border border-gray-300 bg-white hover:bg-gray-50 transition font-semibold flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                キャンセル
              </button>
              <Button
                id="submit-button"
                type="submit"
                loading={submitting}
                disabled={submitting}
                className="w-full sm:flex-1 h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md transition flex items-center justify-center min-h-[44px]"
              >
                送信
              </Button>
            </div>

          </form>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-gray-400">
          &copy; 2026 勤怠・配置管理システム プロトタイプ版
        </div>
      </footer>
    </div>
  );
}