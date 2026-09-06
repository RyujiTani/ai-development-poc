'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { initDB } from '@/lib/db/indexedDB';
import { User } from '@/features/attendance/domain/types';
import { workerRepository } from '@/features/worker/repository/workerRepository';
import { logger } from '@/lib/logger';
import { logoutMock } from '@/lib/auth/mockAuth';

// 資格の選択肢マスタ
const QUALIFICATION_OPTIONS = [
  { code: 'QUAL_A', label: 'フォークリフト運転技能講習' },
  { code: 'QUAL_B', label: '玉掛け技能講習' },
  { code: 'QUAL_C', label: '高所作業車運転技能講習' },
];

// 講習の選択肢マスタ
const TRAINING_OPTIONS = [
  { code: 'TRAIN_01', label: '雇入れ時安全衛生教育' },
  { code: 'TRAIN_02', label: '職長・安全衛生責任者教育' },
  { code: 'TRAIN_03', label: '特別安全教育' },
];

const workerSchema = z.object({
  name: z.string().min(1, { message: '氏名を入力してください' }),
  contact: z.string().min(1, { message: '連絡先を入力してください' }),
  qualifications: z.array(z.string()),
  trainings: z.array(
    z.object({
      code: z.string().min(1, { message: '講習を選択してください' }),
      taken_at: z.string().min(1, { message: '受講日を入力してください' }),
    })
  ),
});

type WorkerFormValues = z.infer<typeof workerSchema>;

export default function WorkerAddEditPage() {
  const router = useRouter();
  const params = useParams();
  const workerId = params.id as string;
  const isEditMode = workerId !== 'new';

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
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

        if (isEditMode) {
          logger.info('FETCH_WORKER_START', { workerId });
          const worker = await workerRepository.getWorkerById(workerId);
          if (!worker || worker.contractor_id !== contractorId) {
            logger.warn('WORKER_NOT_FOUND_OR_ACCESS_DENIED', { workerId, contractorId });
            router.push('/contractor/workers');
            return;
          }

          setValue('name', worker.name);
          setValue('contact', worker.contact || '');
          setValue('qualifications', worker.qualifications || []);
          setValue('trainings', worker.trainings || []);
          logger.info('FETCH_WORKER_SUCCESS', { workerId });
        }
      } catch (err) {
        logger.error('LOAD_WORKER_PAGE_FAILED', { error: String(err) });
        setError('データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthAndLoadData();
  }, [router, workerId, isEditMode, setValue]);

  const onSubmit = async (data: WorkerFormValues) => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);

    const contractorId = sessionStorage.getItem('contractor_id') || '';

    try {
      const formattedTrainings = data.trainings.map((t) => ({
        code: t.code || '',
        taken_at: t.taken_at || '',
      }));

      if (isEditMode) {
        logger.info('UPDATE_WORKER_START', { workerId });
        const result = await workerRepository.updateWorker(workerId, {
          name: data.name,
          contact: data.contact,
          qualifications: data.qualifications,
          trainings: formattedTrainings,
          status: 'ACTIVE',
        });
        if (result.success) {
          logger.info('UPDATE_WORKER_SUCCESS', { workerId });
          router.push('/contractor/workers');
        } else {
          throw new Error('更新に失敗しました');
        }
      } else {
        logger.info('CREATE_WORKER_START');
        const result = await workerRepository.createWorker({
          contractor_id: contractorId,
          name: data.name,
          contact: data.contact,
          qualifications: data.qualifications,
          trainings: formattedTrainings,
          status: 'ACTIVE',
        });
        if (result.success) {
          logger.info('CREATE_WORKER_SUCCESS', { workerId: result.worker_id });
          router.push('/contractor/workers');
        } else {
          throw new Error('登録に失敗しました');
        }
      }
    } catch (err) {
      logger.error('SAVE_WORKER_FAILED', { error: String(err) });
      setError('保存に失敗しました。再試行してください。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    logger.info('SAVE_WORKER_CANCELLED');
    router.push('/contractor/workers');
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
              {isEditMode ? '作業員編集' : '作業員登録'}
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
              <span className="block sm:inline text-sm font-bold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 氏名 */}
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-1">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="例: 山田 太郎"
                className={`block w-full rounded-md border-0 py-3 px-3 text-gray-900 ring-1 ring-inset ${
                  errors.name ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300 focus:ring-blue-600'
                } placeholder:text-gray-400 focus:ring-2 focus:ring-inset text-base min-h-[44px]`}
                {...register('name')}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600" id="name-error">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* 連絡先 */}
            <div>
              <label htmlFor="contact" className="block text-sm font-bold text-gray-700 mb-1">
                連絡先 <span className="text-red-500">*</span>
              </label>
              <input
                id="contact"
                type="text"
                placeholder="例: 090-0000-0000"
                className={`block w-full rounded-md border-0 py-3 px-3 text-gray-900 ring-1 ring-inset ${
                  errors.contact ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300 focus:ring-blue-600'
                } placeholder:text-gray-400 focus:ring-2 focus:ring-inset text-base min-h-[44px]`}
                {...register('contact')}
              />
              {errors.contact && (
                <p className="mt-1 text-sm text-red-600" id="contact-error">
                  {errors.contact.message}
                </p>
              )}
            </div>

            {/* 資格の有無 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">保有資格</label>
              <div className="space-y-2">
                {QUALIFICATION_OPTIONS.map((opt) => (
                  <label key={opt.code} htmlFor={`qual-${opt.code}`} className="flex items-center p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer min-h-[44px]">
                    <input
                      id={`qual-${opt.code}`}
                      type="checkbox"
                      value={opt.code}
                      className="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      {...register('qualifications')}
                    />
                    <span className="ml-3 text-base text-gray-900">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 講習受講履歴 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-700">講習受講履歴</label>
                <button
                  type="button"
                  onClick={() => append({ code: '', taken_at: '' })}
                  className="text-sm font-bold text-blue-600 hover:text-blue-500 p-2 min-h-[44px] flex items-center gap-1"
                >
                  + 追加
                </button>
              </div>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">講習種別</label>
                      <select
                        className="block w-full rounded-md border-0 py-3 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 text-base min-h-[44px]"
                        {...register(`trainings.${index}.code` as const)}
                      >
                        <option value="">選択してください</option>
                        {TRAINING_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {errors.trainings?.[index]?.code && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.trainings[index]?.code?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">受講日</label>
                      <input
                        type="date"
                        className="block w-full rounded-md border-0 py-3 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 text-base min-h-[44px]"
                        {...register(`trainings.${index}.taken_at` as const)}
                      />
                      {errors.trainings?.[index]?.taken_at && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.trainings[index]?.taken_at?.message}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-sm font-bold text-red-600 hover:text-red-505 p-2 min-h-[44px]"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
                {fields.length === 0 && (
                  <p className="text-sm text-gray-505 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    登録されている講習受講履歴はありません。
                  </p>
                )}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="w-full sm:flex-1 rounded-xl bg-gray-200 py-4 text-center text-sm font-bold text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-50"
                style={{ minHeight: '56px' }}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:flex-1 rounded-xl bg-blue-600 py-4 text-center text-sm font-bold text-white hover:bg-blue-500 transition-colors disabled:bg-blue-400"
                style={{ minHeight: '56px' }}
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}