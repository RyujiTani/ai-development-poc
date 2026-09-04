'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Worker } from '../domain/worker';

const trainingSchema = z.object({
  code: z.string().min(1, '講習コードを入力してください。'),
  taken_at: z.string().min(1, '受講日を選択してください。'),
});

const workerSchema = z.object({
  name: z.string().min(1, '氏名は必須入力です。'),
  contact: z.string().min(1, '連絡先は必須入力です。'),
  qualifications: z.array(z.string()),
  trainings: z.array(trainingSchema),
});

type WorkerFormValues = z.infer<typeof workerSchema>;

interface WorkerFormProps {
  initialData?: Worker | null;
  onSubmit: (values: WorkerFormValues) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

const AVAILABLE_QUALIFICATIONS = [
  { code: 'Q001', name: '足場の組立て等作業主任者' },
  { code: 'Q002', name: 'フルハーネス型安全衛生特別教育' },
  { code: 'Q003', name: '玉掛け技能講習' },
  { code: 'Q004', name: '高所作業車運転特別教育' },
];

export const WorkerForm: React.FC<WorkerFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitting,
}) => {
  const [newTrainingCode, setNewTrainingCode] = useState('');
  const [newTrainingDate, setNewTrainingDate] = useState('');
  const [trainingError, setTrainingError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkerFormValues>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      name: '',
      contact: '',
      qualifications: [],
      trainings: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'trainings',
  });

  const selectedQualifications = watch('qualifications') || [];

  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name);
      setValue('contact', initialData.contact || '');
      setValue('qualifications', initialData.qualifications || []);
      setValue('trainings', initialData.trainings || []);
    }
  }, [initialData, setValue]);

  const handleQualificationChange = (code: string) => {
    if (selectedQualifications.includes(code)) {
      setValue(
        'qualifications',
        selectedQualifications.filter((q) => q !== code)
      );
    } else {
      setValue('qualifications', [...selectedQualifications, code]);
    }
  };

  const handleAddTraining = () => {
    setTrainingError('');
    if (!newTrainingCode.trim()) {
      setTrainingError('講習コードを入力してください。');
      return;
    }
    if (!newTrainingDate) {
      setTrainingError('受講日を入力してください。');
      return;
    }
    append({ code: newTrainingCode, taken_at: newTrainingDate });
    setNewTrainingCode('');
    setNewTrainingDate('');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* 氏名 */}
        <div>
          <Input
            id="name"
            type="text"
            label="氏名"
            placeholder="例: 山田 太郎"
            disabled={submitting}
            error={errors.name?.message}
            className="h-12 text-base md:text-sm"
            {...register('name')}
          />
        </div>

        {/* 連絡先 */}
        <div>
          <Input
            id="contact"
            type="text"
            label="連絡先 (電話番号またはメール)"
            placeholder="例: 090-1234-5678"
            disabled={submitting}
            error={errors.contact?.message}
            className="h-12 text-base md:text-sm"
            {...register('contact')}
          />
        </div>

        {/* 資格情報 */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-3">保有資格</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVAILABLE_QUALIFICATIONS.map((q) => {
              const isChecked = selectedQualifications.includes(q.code);
              return (
                <div
                  key={q.code}
                  onClick={() => handleQualificationChange(q.code)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    isChecked
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 pointer-events-none"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">{q.name}</span>
                    <span className="text-xs text-gray-400">コード: {q.code}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 講習受講履歴 */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-4">
          <label className="block text-sm font-bold text-gray-700">講習受講履歴</label>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="w-full sm:flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">講習名/コード</label>
              <input
                type="text"
                value={newTrainingCode}
                onChange={(e) => setNewTrainingCode(e.target.value)}
                placeholder="例: T001"
                className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-base"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-xs font-semibold text-gray-500 mb-1">受講日</label>
              <input
                type="date"
                value={newTrainingDate}
                onChange={(e) => setNewTrainingDate(e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-base"
              />
            </div>
            <button
              type="button"
              onClick={handleAddTraining}
              className="w-full sm:w-auto h-12 px-5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 transition text-sm flex items-center justify-center gap-1 cursor-pointer min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              履歴に追加
            </button>
          </div>
          {trainingError && <p className="text-sm text-red-600">{trainingError}</p>}

          {fields.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">受講履歴は登録されていません。</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center justify-between py-2.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">{field.code}</span>
                    <span className="text-xs text-gray-500">受講日: {field.taken_at}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold p-2 cursor-pointer"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="w-full sm:flex-1 h-12 rounded-xl text-gray-600 hover:text-gray-900 border border-gray-300 bg-white hover:bg-gray-50 transition font-semibold flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
        >
          キャンセル
        </button>
        <Button
          id="save-button"
          type="submit"
          loading={submitting}
          disabled={submitting}
          className="w-full sm:flex-1 h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md transition flex items-center justify-center min-h-[44px]"
        >
          保存
        </Button>
      </div>
    </form>
  );
};