import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { workerFormSchema, WorkerFormData } from '../domain/worker';
import { WorkerRepository } from '../repository/workerRepository';
import { getSession } from '@/lib/auth/session';
import { toast } from '@/lib/toast';
import { initializeSeedData } from '@/lib/db/indexedDb';

interface WorkerFormProps {
  workerId?: string;
}

export default function WorkerForm({ workerId }: WorkerFormProps) {
  const router = useRouter();
  const isEditMode = !!workerId;
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [qualInput, setQualInput] = useState('');
  const [contractorId, setContractorId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors }
  } = useForm<WorkerFormData>({
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

  const qualifications = watch('qualifications');

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'CONTRACTOR_MANAGER') {
      toast.error('未認証または無効なアクセス権限です。');
      router.push('/login');
      return;
    }
    if (!session.contractor_id) {
      toast.error('所属企業情報が取得できません。');
      router.push('/login');
      return;
    }
    setContractorId(session.contractor_id);

    const initForm = async () => {
      try {
        await initializeSeedData();
        if (isEditMode && workerId) {
          const repo = new WorkerRepository();
          const worker = await repo.getById(workerId, session.contractor_id);
          if (worker) {
            setValue('name', worker.name);
            setValue('contact', worker.contact || '');
            setValue('qualifications', worker.qualifications || []);
            setValue('trainings', worker.trainings || []);
          } else {
            toast.error('作業員情報が見つかりません。');
            router.push('/workers');
          }
        }
      } catch (error: any) {
        toast.error(error.message || '初期化に失敗しました。');
        router.push('/workers');
      } finally {
        setIsInitializing(false);
      }
    };

    initForm();
  }, [isEditMode, workerId, setValue, router]);

  const handleAddQualification = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = qualInput.trim();
    if (!trimmed) return;
    if (qualifications.includes(trimmed)) {
      toast.error('この資格はすでに追加されています。');
      return;
    }
    setValue('qualifications', [...qualifications, trimmed]);
    setQualInput('');
  };

  const handleRemoveQualification = (indexToRemove: number) => {
    setValue('qualifications', qualifications.filter((_, index) => index !== indexToRemove));
  };

  const onSubmit = async (data: WorkerFormData) => {
    if (!contractorId) return;
    setIsLoading(true);

    try {
      const repo = new WorkerRepository();
      if (isEditMode && workerId) {
        await repo.update(workerId, contractorId, {
          name: data.name,
          contact: data.contact,
          qualifications: data.qualifications,
          trainings: data.trainings,
          status: 'ACTIVE'
        });
        toast.success('作業員情報を更新しました。');
      } else {
        await repo.create({
          contractor_id: contractorId,
          name: data.name,
          contact: data.contact,
          qualifications: data.qualifications,
          trainings: data.trainings,
          status: 'ACTIVE'
        });
        toast.success('作業員を登録しました。');
      }
      router.push('/workers');
    } catch (error: any) {
      toast.error(error.message || 'データの保存に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/workers');
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">ロード中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6 sm:p-8 md:max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">
          {isEditMode ? '作業員情報編集' : '新規作業員登録'}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 氏名 */}
          <div className="flex flex-col space-y-2">
            <label htmlFor="name" className="text-sm font-semibold text-gray-700">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 h-12 text-base ${errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`}
              placeholder="例：テスト 太郎"
              {...register('name')}
            />
            {errors.name && (
              <span className="text-sm text-red-500" role="alert">
                {errors.name.message}
              </span>
            )}
          </div>

          {/* 連絡先 */}
          <div className="flex flex-col space-y-2">
            <label htmlFor="contact" className="text-sm font-semibold text-gray-700">
              連絡先 <span className="text-red-500">*</span>
            </label>
            <input
              id="contact"
              type="text"
              className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 h-12 text-base ${errors.contact ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`}
              placeholder="例：090-1234-5678"
              {...register('contact')}
            />
            {errors.contact && (
              <span className="text-sm text-red-500" role="alert">
                {errors.contact.message}
              </span>
            )}
          </div>

          {/* 保有資格 */}
          <div className="flex flex-col space-y-2 border-t pt-4">
            <label htmlFor="qualification-input" className="text-sm font-semibold text-gray-700">
              保有資格
            </label>
            <div className="flex space-x-2">
              <input
                id="qualification-input"
                type="text"
                value={qualInput}
                onChange={(e) => setQualInput(e.target.value)}
                className="flex-1 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 h-12 text-base"
                placeholder="例：QUAL_001"
              />
              <button
                type="button"
                onClick={handleAddQualification}
                className="px-6 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium transition-colors h-12 min-w-[80px]"
              >
                追加
              </button>
            </div>
            {qualifications.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {qualifications.map((qual, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 min-h-[32px]"
                  >
                    {qual}
                    <button
                      type="button"
                      onClick={() => handleRemoveQualification(index)}
                      className="ml-2 inline-flex items-center justify-center text-indigo-400 hover:text-indigo-600 focus:outline-none w-5 h-5 rounded-full hover:bg-indigo-100"
                    >
                      &times;
                    </button>
                  </span>
                ))} pocket
              </div>
            )}
          </div>

          {/* 講習受講履歴 */}
          <div className="flex flex-col space-y-4 border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">講習受講履歴</span>
              <button
                type="button"
                onClick={() => appendTraining({ code: '', taken_at: '' })}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 p-2 min-h-[44px] flex items-center"
              >
                + 履歴を追加
              </button>
            </div>

            {trainingFields.map((field, index) => (
              <div key={field.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3 relative">
                <button
                  type="button"
                  onClick={() => removeTraining(index)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-2 min-h-[44px] flex items-center justify-center"
                  aria-label="履歴を削除"
                >
                  削除
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                  <div className="flex flex-col space-y-1">
                    <label htmlFor={`trainings-code-${index}`} className="text-xs font-semibold text-gray-600">講習コード</label>
                    <input
                      id={`trainings-code-${index}`}
                      type="text"
                      className={`p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 h-12 text-base ${errors.trainings?.[index]?.code ? 'border-red-500' : ''}`}
                      placeholder="例：TRAIN_001"
                      {...register(`trainings.${index}.code` as const)}
                    />
                    {errors.trainings?.[index]?.code && (
                      <span className="text-xs text-red-500">
                        {errors.trainings[index]?.code?.message}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label htmlFor={`trainings-date-${index}`} className="text-xs font-semibold text-gray-600">受講日</label>
                    <input
                      id={`trainings-date-${index}`}
                      type="date"
                      className={`p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 h-12 text-base ${errors.trainings?.[index]?.taken_at ? 'border-red-500' : ''}`}
                      {...register(`trainings.${index}.taken_at` as const)}
                    />
                    {errors.trainings?.[index]?.taken_at && (
                      <span className="text-xs text-red-500">
                        {errors.trainings[index]?.taken_at?.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 保存・キャンセルボタン */}
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0 border-t pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-all duration-150 disabled:bg-indigo-300 min-h-[50px] flex items-center justify-center text-lg"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>保存中...</span>
                </div>
              ) : (
                isEditMode ? '変更を保存' : '作業員を保存'
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-bold rounded-lg shadow transition-all duration-150 min-h-[50px] flex items-center justify-center text-lg"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
"
    },
    {