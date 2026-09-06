"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workerSchema, WorkerFormValues } from '../domain/workerSchema';
import { IndexedDBUserRepository } from '@/features/user/repository/indexedDBUserRepository';
import { IndexedDBWorkerRepository } from '../repository/indexedDBWorkerRepository';
import { GetWorkerByIdUseCase } from '../usecase/getWorkerByIdUseCase';
import { CreateWorkerUseCase } from '../usecase/createWorkerUseCase';
import { UpdateWorkerUseCase } from '../usecase/updateWorkerUseCase';
import { User } from '@/features/user/domain/types';
import { logger } from '@/lib/logger';

interface WorkerFormProps {
  mode: 'NEW' | 'EDIT';
  workerId?: string;
}

const AVAILABLE_QUALIFICATIONS = [
  '有機溶剤作業主任者',
  '玉掛技能者',
  '特定化学物質作業主任者',
  '酸素欠乏危険作業主任者'
];

export default function WorkerForm({ mode, workerId }: WorkerFormProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(mode === 'EDIT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 資格、講習受講履歴のローカル状態
  const [selectedQualifications, setSelectedQualifications] = useState<string[]>([]);
  const [trainings, setTrainings] = useState<Array<{ code: string; taken_at: string }>>([]);

  // 講習追加用の一時状態
  const [newTrainingCode, setNewTrainingCode] = useState('');
  const [newTrainingDate, setNewTrainingDate] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<WorkerFormValues>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      name: '',
      contact: '',
    },
  });

  useEffect(() => {
    const checkAuthAndInit = async () => {
      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'CONTRACTOR_MANAGER') {
        logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: mode === 'EDIT' ? `/workers/${workerId}` : '/workers/new' });
        router.replace('/login');
        return;
      }

      try {
        const userRepository = new IndexedDBUserRepository();
        const user = await userRepository.findById(userId);
        if (!user || user.status !== 'ACTIVE' || !user.contractor_id) {
          sessionStorage.clear();
          router.replace('/login');
          return;
        }

        setCurrentUser(user);
        setIsAuthenticated(true);

        if (mode === 'EDIT' && workerId) {
          const workerRepository = new IndexedDBWorkerRepository();
          const getWorkerUseCase = new GetWorkerByIdUseCase(workerRepository);
          const result = await getWorkerUseCase.execute(workerId);

          if (result.success) {
            // 権限チェック：所属企業が一致しているか
            if (result.value.contractor_id !== user.contractor_id) {
              setErrorMessage('対象の作業員情報を閲覧する権限がありません。');
              setIsLoading(false);
              return;
            }
            setValue('name', result.value.name);
            setValue('contact', result.value.contact || '');
            setSelectedQualifications(result.value.qualifications || []);
            setTrainings(result.value.trainings || []);
          } else if ('error' in result) {
            setErrorMessage(result.error.message);
          }
          setIsLoading(false);
        }
      } catch (error) {
        logger.error('AUTH_INIT_ERROR', error);
        router.replace('/login');
      }
    };

    checkAuthAndInit();
  }, [router, mode, workerId, setValue]);

  const handleQualificationChange = (qual: string, checked: boolean) => {
    if (checked) {
      setSelectedQualifications((prev) => [...prev, qual]);
    } else {
      setSelectedQualifications((prev) => prev.filter((q) => q !== qual));
    }
  };

  const handleAddTraining = () => {
    if (!newTrainingCode) {
      alert('講習コードを入力してください。');
      return;
    }
    if (!newTrainingDate) {
      alert('受講日を入力してください。');
      return;
    }

    setTrainings((prev) => [
      ...prev,
      { code: newTrainingCode, taken_at: newTrainingDate },
    ]);
    setNewTrainingCode('');
    setNewTrainingDate('');
  };

  const handleRemoveTraining = (index: number) => {
    setTrainings((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: WorkerFormValues) => {
    if (isSubmitting || !currentUser?.contractor_id) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const workerRepository = new IndexedDBWorkerRepository();

    try {
      if (mode === 'NEW') {
        const useCase = new CreateWorkerUseCase(workerRepository);
        const result = await useCase.execute({
          contractorId: currentUser.contractor_id,
          name: data.name,
          contact: data.contact,
          qualifications: selectedQualifications,
          trainings: trainings,
        });

        if (result.success) {
          router.push('/workers');
        } else if ('error' in result) {
          setErrorMessage(result.error.message);
        }
      } else if (mode === 'EDIT' && workerId) {
        const useCase = new UpdateWorkerUseCase(workerRepository);
        const result = await useCase.execute({
          workerId,
          contractorId: currentUser.contractor_id,
          name: data.name,
          contact: data.contact,
          qualifications: selectedQualifications,
          trainings: trainings,
        });

        if (result.success) {
          router.push('/workers');
        } else if ('error' in result) {
          setErrorMessage(result.error.message);
        }
      }
    } catch (error) {
      logger.error('SAVE_WORKER_ERROR', error);
      setErrorMessage('システムエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/workers');
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50" data-testid="loading-state">
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
          <h1 className="text-lg font-bold text-gray-900 sm:text-xl" data-testid="form-title">
            {mode === 'NEW' ? '作業員追加' : '作業員編集'}
          </h1>
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
            {/* 氏名入力 */}
            <div className="flex flex-col">
              <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                氏名 <span className="text-red-500 font-normal">(必須)</span>
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                placeholder="例: 山田 太郎"
                className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px]"
                data-testid="name-input"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600" id="name-error" data-testid="name-error">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* 連絡先入力 */}
            <div className="flex flex-col">
              <label htmlFor="contact" className="block text-sm font-bold text-gray-700 mb-2">
                連絡先 <span className="text-red-500 font-normal">(必須)</span>
              </label>
              <input
                id="contact"
                type="text"
                {...register('contact')}
                placeholder="例: 090-0000-0000"
                className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px]"
                data-testid="contact-input"
              />
              {errors.contact && (
                <p className="mt-1 text-sm text-red-600" id="contact-error" data-testid="contact-error">
                  {errors.contact.message}
                </p>
              )}
            </div>

            {/* 保有資格選択 */}
            <div className="flex flex-col">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                保有資格 (複数選択可)
              </label>
              <div className="space-y-2 mt-1">
                {AVAILABLE_QUALIFICATIONS.map((qual) => {
                  const isChecked = selectedQualifications.includes(qual);
                  return (
                    <label key={qual} className="flex items-center gap-3 cursor-pointer min-h-[44px] px-2 rounded hover:bg-gray-50 select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleQualificationChange(qual, e.target.checked)}
                        className="h-6 w-6 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        data-testid={`qualification-checkbox-${qual}`}
                      />
                      <span className="text-sm font-medium text-gray-700">{qual}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 講習受講履歴入力 */}
            <div className="flex flex-col">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                講習受講履歴
              </label>
              
              {/* 講習追加UI */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 mt-1">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="training-code" className="block text-xs font-bold text-gray-500 mb-1">
                      講習コード
                    </label>
                    <input
                      id="training-code"
                      type="text"
                      placeholder="例: TR-01"
                      value={newTrainingCode}
                      onChange={(e) => setNewTrainingCode(e.target.value)}
                      className="block h-10 w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 min-h-[44px]"
                      data-testid="training-code-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="training-date" className="block text-xs font-bold text-gray-500 mb-1">
                      受講日
                    </label>
                    <input
                      id="training-date"
                      type="date"
                      value={newTrainingDate}
                      onChange={(e) => setNewTrainingDate(e.target.value)}
                      className="block h-10 w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 min-h-[44px]"
                      data-testid="training-date-input"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddTraining}
                  className="w-full h-11 bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold rounded text-sm transition-all flex items-center justify-center min-h-[44px]"
                  data-testid="add-training-btn"
                >
                  講習履歴を追加
                </button>
              </div>

              {/* 講習履歴リスト表示 */}
              <div className="mt-4">
                {trainings.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">登録された受講履歴はありません。</p>
                ) : (
                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden" data-testid="training-list">
                    {trainings.map((training, index) => (
                      <li key={index} className="p-3 bg-white flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{training.code}</span>
                          <span className="text-xs text-gray-500 mt-0.5">受講日: {training.taken_at}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTraining(index)}
                          className="h-10 px-3 rounded border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 flex items-center justify-center min-h-[44px]"
                          data-testid={`remove-training-btn-${index}`}
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}