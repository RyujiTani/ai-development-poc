'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { CorrectAttendanceUseCase } from '../usecase/correctAttendanceUseCase';
import { IndexedDBAttendanceRepository } from '../repository/attendanceRepository';

const correctionSchema = z.object({
  punchType: z.enum(['CLOCK_IN', 'CLOCK_OUT'], {
    errorMap: () => ({ message: '打刻種別を選択してください。' }),
  }),
  clockedAt: z.string().min(1, '日時を正しく入力してください。'),
  reason: z.string().min(1, '修正理由は必須入力です。'),
});

type CorrectionFormValues = z.infer<typeof correctionSchema>;

interface CorrectionModalProps {
  record: {
    attendance_id: string;
    worker_id: string;
    worker_name: string;
    contractor_id: string;
    punch_type: 'CLOCK_IN' | 'CLOCK_OUT';
    clocked_at: string;
  };
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({ record, userId, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      punchType: record.punch_type,
      clockedAt: '',
      reason: '',
    },
  });

  useEffect(() => {
    const date = new Date(record.clocked_at);
    const offset = date.getTimezoneOffset() * 60000;
    const formatted = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    setValue('clockedAt', formatted);
  }, [record, setValue]);

  const onSubmit = async (data: CorrectionFormValues) => {
    setSubmitting(true);
    try {
      const repo = new IndexedDBAttendanceRepository();
      const useCase = new CorrectAttendanceUseCase(repo);

      const isoClockedAt = new Date(data.clockedAt).toISOString();

      const result = await useCase.execute({
        attendanceId: record.attendance_id,
        workerId: record.worker_id,
        contractorId: record.contractor_id,
        punchType: data.punchType,
        clockedAt: isoClockedAt,
        reason: data.reason,
        correctedBy: userId,
      });

      if (result.success) {
        onSuccess();
      } else {
        alert(result.error.message);
      }
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900">打刻データの修正</h3>
          <p className="text-sm text-gray-500 mt-1">対象：{record.worker_name}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 打刻種別 */}
          <div>
            <span className="block text-sm font-bold text-gray-700 mb-2">打刻種別</span>
            <div className="flex gap-4">
              <label className="flex-1 flex items-center justify-center h-12 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition px-3 gap-2 font-bold text-gray-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:text-indigo-900 text-sm">
                <input
                  type="radio"
                  value="CLOCK_IN"
                  disabled={submitting}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                  {...register('punchType')}
                />
                出勤
              </label>
              <label className="flex-1 flex items-center justify-center h-12 rounded-lg border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition px-3 gap-2 font-bold text-gray-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:text-indigo-900 text-sm">
                <input
                  type="radio"
                  value="CLOCK_OUT"
                  disabled={submitting}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                  {...register('punchType')}
                />
                退勤
              </label>
            </div>
          </div>

          {/* 打刻日時 */}
          <div>
            <Input
              id="clockedAt"
              type="datetime-local"
              label="打刻日時"
              disabled={submitting}
              error={errors.clockedAt?.message}
              className="h-12 text-sm"
              {...register('clockedAt')}
            />
          </div>

          {/* 修正理由 */}
          <div>
            <label htmlFor="reason" className="block text-sm font-bold text-gray-700 mb-1.5">
              修正理由 <span className="text-red-500 text-xs font-normal">(必須)</span>
            </label>
            <textarea
              id="reason"
              disabled={submitting}
              rows={3}
              placeholder="修正が必要な理由を入力してください"
              className={`w-full px-4 py-3 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition duration-150 ease-in-out disabled:bg-gray-100 ${
                errors.reason ? 'border-red-500' : 'border-gray-300'
              }`}
              {...register('reason')}
            />
            {errors.reason && (
              <p className="mt-1 text-xs text-red-600 font-medium">{errors.reason.message}</p>
            )}
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 h-12 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer"
            >
              キャンセル
            </button>
            <Button
              id="save-button"
              type="submit"
              loading={submitting}
              disabled={submitting}
              className="flex-1 h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md transition flex items-center justify-center"
            >
              保存
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};