'use client';

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Worker } from '../domain/worker';

export interface WorkerFormData {
  name: string;
  contact: string;
  qualifications: string[];
  trainings: Array<{ code: string; taken_at: string }>;
}

interface WorkerFormProps {
  initialData?: Worker | null;
  onSubmit: (data: WorkerFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const QUALIFICATION_OPTIONS = [
  { code: 'QA01', name: '安全衛生責任者' },
  { code: 'QA02', name: 'フォークリフト運転業務' },
  { code: 'QA03', name: '玉掛け技能' },
  { code: 'QA04', name: '足場の組立て等作業主任者' },
  { code: 'QA05', name: '高所作業車運転業務' },
];

const TRAINING_OPTIONS = [
  { code: 'TR01', name: '新規入場者教育' },
  { code: 'TR02', name: '特別安全教育' },
  { code: 'TR03', name: '職長・安全衛生責任者教育' },
];

export function WorkerForm({ initialData, onSubmit, onCancel, isSubmitting }: WorkerFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkerFormData>({
    defaultValues: {
      name: initialData?.name || '',
      contact: initialData?.contact || '',
      qualifications: initialData?.qualifications || [],
      trainings: initialData?.trainings || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'trainings',
  });

  const watchedQualifications = watch('qualifications') || [];

  const handleQualificationChange = (code: string, checked: boolean) => {
    if (checked) {
      setValue('qualifications', [...watchedQualifications, code]);
    } else {
      setValue('qualifications', watchedQualifications.filter((q) => q !== code));
    }
  };

  const handleFormSubmit = async (data: WorkerFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* 氏名 */}
      <div className="flex flex-col space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          氏名 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          className={`w-full h-12 px-4 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${
            errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
          }`}
          placeholder="例: 山田 太郎"
          {...register('name', {
            required: '氏名を入力してください',
            validate: (value) => value.trim() !== '' || '氏名を入力してください',
          })}
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1 animate-pulse" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* 連絡先 */}
      <div className="flex flex-col space-y-2">
        <label htmlFor="contact" className="text-sm font-medium text-gray-700">
          連絡先 <span className="text-red-500">*</span>
        </label>
        <input
          id="contact"
          type="text"
          className={`w-full h-12 px-4 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${
            errors.contact ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
          }`}
          placeholder="例: 090-1234-5678"
          {...register('contact', {
            required: '連絡先を入力してください',
            pattern: {
              value: /^(0\d{1,4}-\d{1,4}-\d{3,4}|\d{10,11})$/,
              message: '適切な電話番号の形式で入力してください (例: 090-1234-5678)',
            },
          })}
        />
        {errors.contact && (
          <p className="text-sm text-red-600 mt-1" role="alert">
            {errors.contact.message}
          </p>
        )}
      </div>

      {/* 保有資格 */}
      <div className="flex flex-col space-y-2">
        <span className="text-sm font-medium text-gray-700">保有資格</span>
        <div className="bg-white border border-gray-300 rounded-md p-4 space-y-3 shadow-sm">
          {QUALIFICATION_OPTIONS.map((option) => {
            const isChecked = watchedQualifications.includes(option.code);
            return (
              <label
                key={option.code}
                className="flex items-center space-x-3 cursor-pointer min-h-[44px] select-none hover:bg-gray-50 rounded px-2 -mx-2"
              >
                <input
                  type="checkbox"
                  className="w-6 h-6 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  checked={isChecked}
                  onChange={(e) => handleQualificationChange(option.code, e.target.checked)}
                />
                <span className="text-base text-gray-800">{option.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 講習受講履歴 */}
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center min-h-[44px]">
          <span className="text-sm font-medium text-gray-700">講習受講履歴</span>
          <button
            type="button"
            onClick={() => append({ code: 'TR01', taken_at: '' })}
            className="h-11 px-4 bg-blue-50 text-blue-600 rounded-md text-sm font-medium border border-blue-200 hover:bg-blue-100 transition-colors flex items-center"
          >
            + 講習を追加
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="p-4 border border-gray-200 rounded-md bg-gray-50 space-y-3 relative"
            >
              <div className="flex flex-col space-y-2">
                <label htmlFor={`trainings.${index}.code`} className="text-xs font-semibold text-gray-500">
                  講習種別 {index + 1}
                </label>
                <select
                  id={`trainings.${index}.code`}
                  className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white text-base focus:ring-2 focus:ring-blue-500"
                  {...register(`trainings.${index}.code` as const, {
                    required: '講習を選択してください',
                  })}
                >
                  {TRAINING_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor={`trainings.${index}.taken_at`} className="text-xs font-semibold text-gray-500">受講日</label>
                <input
                  id={`trainings.${index}.taken_at`}
                  type="date"
                  className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white text-base focus:ring-2 focus:ring-blue-500"
                  {...register(`trainings.${index}.taken_at` as const, {
                    required: '受講日を入力してください',
                  })}
                />
                {errors.trainings?.[index]?.taken_at && (
                  <p className="text-xs text-red-600 mt-1" role="alert">
                    {errors.trainings[index]?.taken_at?.message}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute top-2 right-2 h-10 px-3 text-red-600 hover:bg-red-50 rounded text-sm border border-red-200 flex items-center"
              >
                削除
              </button>
            </div>
          ))}

          {fields.length === 0 && (
            <p className="text-sm text-gray-500 bg-white border border-dashed border-gray-300 rounded-md p-6 text-center">
              登録されている講習受講履歴はありません。
            </p>
          )}
        </div>
      </div>

      {/* ボタン配置 */}
      <div className="flex space-x-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 h-12 border border-gray-300 text-gray-700 bg-white rounded-md text-base font-semibold hover:bg-gray-50 active:bg-gray-100 transition-all flex items-center justify-center shadow-sm"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-12 bg-blue-600 text-white rounded-md text-base font-semibold hover:bg-blue-700 active:bg-blue-800 transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center space-x-2">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              <span>保存中...</span>
            </span>
          ) : (
            '保存'
          )}
        </button>
      </div>
    </form>
  );
}