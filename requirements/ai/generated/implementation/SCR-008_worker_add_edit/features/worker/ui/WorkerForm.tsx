'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/auth/sessionStore';
import { workerUseCase } from '../usecase/workerUsecase';
import { 
  QUALIFICATIONS_MASTER, 
  TRAININGS_MASTER, 
  Worker 
} from '../domain/worker';

// バリデーションスキーマの定義 (SCR-008-VL-001, SCR-008-VL-002)
const workerFormSchema = z.object({
  name: z.string().min(1, '氏名は必須です。'),
  contact: z.string()
    .min(1, '連絡先は必須です。')
    .regex(/^[\d-]{10,13}$/, '有効な形式で入力してください（数字とハイフン10〜13桁。例: 090-1234-5678）'),
  qualifications: z.array(z.string()),
  trainings: z.array(
    z.object({
      code: z.string().min(1, '講習を選択してください。'),
      taken_at: z.string().min(1, '受講日を入力してください。')
    })
  )
});

type WorkerFormValues = z.infer<typeof workerFormSchema>;

interface WorkerFormProps {
  mode: 'CREATE' | 'EDIT';
  workerId?: string;
}

export default function WorkerForm({ mode, workerId }: WorkerFormProps) {
  const router = useRouter();
  const { session, isLoading: sessionLoading, initialize } = useSessionStore();
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(mode === 'EDIT');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 認証初期化
  useEffect(() => {
    initialize();
  }, [initialize]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<WorkerFormValues>({
    resolver: zodResolver(workerFormSchema),
    defaultValues: {
      name: '',
      contact: '',
      qualifications: [],
      trainings: []
    }
  });

  const { fields: trainingFields, append: appendTraining, remove: removeTraining } = useFieldArray({
    control,
    name: 'trainings'
  });

  const selectedQualifications = watch('qualifications') || [];

  // 既存データ読み込み (SCR-008-FN-005, SCR-008-DT-001)
  useEffect(() => {
    if (mode === 'EDIT' && workerId) {
      setIsDataLoading(true);
      workerUseCase.getWorker(workerId).then((result) => {
        if (result.success) {
          const w = result.data;
          setValue('name', w.name);
          setValue('contact', w.contact || '');
          setValue('qualifications', w.qualifications);
          setValue('trainings', w.trainings);
        } else {
          setErrorMessage(result.error.message);
        }
        setIsDataLoading(false);
      });
    }
  }, [mode, workerId, setValue]);

  // 未認証リダイレクトガード (SCR-008-VL-003)
  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push('/login');
    }
  }, [session, sessionLoading, router]);

  if (sessionLoading || !session) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 animate-pulse">認証状態を確認しています...</p>
      </div>
    );
  }

  if (isDataLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 animate-pulse">作業員情報をロードしています...</p>
      </div>
    );
  }

  // 資格チェックボックス操作
  const handleQualChange = (code: string, checked: boolean) => {
    const current = [...selectedQualifications];
    if (checked) {
      if (!current.includes(code)) {
        setValue('qualifications', [...current, code]);
      }
    } else {
      setValue('qualifications', current.filter((item) => item !== code));
    }
  };

  // 登録・更新処理の実行 (SCR-008-DT-002, SCR-008-DT-003)
  const onSubmit = async (values: WorkerFormValues) => {
    setIsSubmitLoading(true);
    setErrorMessage(null);

    const contractorId = session.contractorId || 'contractor-abc'; // 所属企業フォールバック

    if (mode === 'CREATE') {
      const payload: Omit<Worker, 'worker_id' | 'created_at' | 'updated_at'> = {
        contractor_id: contractorId,
        name: values.name,
        contact: values.contact,
        qualifications: values.qualifications,
        trainings: values.trainings,
        status: 'ACTIVE'
      };

      const result = await workerUseCase.createWorker(payload);
      if (result.success) {
        showToast('作業員を新しく登録しました。');
        setTimeout(() => {
          router.push('/workers');
        }, 1500);
      } else {
        setErrorMessage(result.error.message);
        setIsSubmitLoading(false);
      }
    } else if (mode === 'EDIT' && workerId) {
      const payload: Partial<Worker> = {
        name: values.name,
        contact: values.contact,
        qualifications: values.qualifications,
        trainings: values.trainings
      };

      const result = await workerUseCase.updateWorker(workerId, payload);
      if (result.success) {
        showToast('作業員情報を更新しました。');
        setTimeout(() => {
          router.push('/workers');
        }, 1500);
      } else {
        setErrorMessage(result.error.message);
        setIsSubmitLoading(false);
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 md:p-8 relative">
      {/* トースト表示 */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform scale-100 font-medium">
          {toastMessage}
        </div>
      )}

      <h1 className="text-xl md:text-2xl font-bold text-gray-900 border-b pb-4 mb-6">
        {mode === 'CREATE' ? '作業員の新規登録' : '作業員情報の編集'}
      </h1>

      {errorMessage && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-sm border border-red-200">
          {errorMessage}
        </div>
      )}

      {/* フォーム縦並び配置 (SCR-008-UI-001) */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex flex-col">
        
        {/* 氏名入力欄 */}
        <div className="flex flex-col space-y-1">
          <label htmlFor="name" className="text-sm font-semibold text-gray-700">
            氏名 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            placeholder="山田 太郎"
            {...register('name')}
            className={`min-h-[44px] w-full px-4 rounded-lg border text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
            }`}
          />
          {errors.name && (
            <p className="text-red-600 text-sm font-medium mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* 連絡先入力欄 */}
        <div className="flex flex-col space-y-1">
          <label htmlFor="contact" className="text-sm font-semibold text-gray-700">
            連絡先（電話番号） <span className="text-red-500">*</span>
          </label>
          <input
            id="contact"
            type="text"
            placeholder="090-1234-5678"
            {...register('contact')}
            className={`min-h-[44px] w-full px-4 rounded-lg border text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              errors.contact ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
            }`}
          />
          {errors.contact && (
            <p className="text-red-600 text-sm font-medium mt-1">{errors.contact.message}</p>
          )}
        </div>

        {/* 資格有無入力 (SCR-008-FN-003) */}
        <div className="flex flex-col space-y-2">
          <span className="text-sm font-semibold text-gray-700">保有資格</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
            {QUALIFICATIONS_MASTER.map((qual) => {
              const isChecked = selectedQualifications.includes(qual.code);
              return (
                <label
                  key={qual.code}
                  className={`flex items-center min-h-[44px] p-3 rounded-lg border cursor-pointer select-none transition ${
                    isChecked ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleQualChange(qual.code, e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                  />
                  <span className="text-sm md:text-base font-medium text-gray-800">{qual.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 講習受講履歴 (SCR-008-FN-004) */}
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-sm font-semibold text-gray-700">安全特別教育・講習受講履歴</span>
            <button
              type="button"
              onClick={() => appendTraining({ code: '', taken_at: '' })}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs md:text-sm font-bold min-h-[40px] px-3 rounded-lg flex items-center transition"
            >
              ＋ 受講履歴を追加
            </button>
          </div>

          {trainingFields.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">登録されている受講履歴はありません。</p>
          ) : (
            <div className="space-y-4">
              {trainingFields.map((field, index) => (
                <div 
                  key={field.id} 
                  className="p-4 border border-gray-100 bg-gray-50 rounded-lg flex flex-col md:flex-row md:items-end gap-3"
                >
                  <div className="flex-1 flex flex-col space-y-1">
                    <label htmlFor={`trainings.${index}.code`} className="text-xs font-bold text-gray-500">講習種別</label>
                    <select
                      id={`trainings.${index}.code`}
                      {...register(`trainings.${index}.code` as const)}
                      className="min-h-[44px] w-full px-3 rounded-lg border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- 選択してください --</option>
                      {TRAININGS_MASTER.map((t) => (
                        <option key={t.code} value={t.code}>{t.name}</option>
                      ))}
                    </select>
                    {errors.trainings?.[index]?.code && (
                      <p className="text-red-600 text-xs font-medium mt-1">
                        {errors.trainings[index]?.code?.message}
                      </p>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col space-y-1">
                    <label htmlFor={`trainings.${index}.taken_at`} className="text-xs font-bold text-gray-500">受講日</label>
                    <input
                      id={`trainings.${index}.taken_at`}
                      type="date"
                      {...register(`trainings.${index}.taken_at` as const)}
                      className="min-h-[44px] w-full px-3 rounded-lg border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.trainings?.[index]?.taken_at && (
                      <p className="text-red-600 text-xs font-medium mt-1">
                        {errors.trainings[index]?.taken_at?.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeTraining(index)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold min-h-[44px] px-4 rounded-lg flex items-center justify-center transition border border-red-100 md:self-end"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ボタン配置 (SCR-008-UI-002, SCR-008-UI-004) */}
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0 pt-6 border-t mt-8">
          <button
            type="submit"
            disabled={isSubmitLoading}
            className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-lg flex items-center justify-center shadow transition disabled:bg-blue-300"
          >
            {isSubmitLoading ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            disabled={isSubmitLoading}
            onClick={() => router.push('/workers')}
            className="flex-1 min-h-[48px] bg-white hover:bg-gray-100 text-gray-700 font-semibold text-base rounded-lg border border-gray-300 flex items-center justify-center transition"
          >
            キャンセル
          </button>
        </div>

      </form>
    </div>
  );
}