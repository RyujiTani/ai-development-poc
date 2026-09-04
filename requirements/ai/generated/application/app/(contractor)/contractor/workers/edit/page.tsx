'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sessionManager, Session } from '../../../../../lib/auth/session';
import { useToast } from '../../../../../components/ui/toast';
import { logger } from '../../../../../lib/logger/logger';
import { IndexedDBWorkerRepository } from '../../../../../features/worker/repository/workerRepository';
import { SaveWorkerUseCase, SaveWorkerParams } from '../../../../../features/worker/usecase/saveWorkerUseCase';
import { GetWorkerByIdUseCase } from '../../../../../features/worker/usecase/getWorkerByIdUseCase';
import { Worker } from '../../../../../features/worker/domain/worker';
import { WorkerForm } from '../../../../../features/worker/ui/WorkerForm';

export default function WorkerEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workerId = searchParams.get('id');
  const { showToast } = useToast();
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workerData, setWorkerData] = useState<Worker | null>(null);

  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'CONTRACTOR_MANAGER') {
      logger.warn('unauthorized_access_redirect_from_worker_edit', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.push('/login');
      return;
    }
    setSession(currentSession);

    if (!workerId) {
      showToast('編集対象の作業員が指定されていません。', 'error');
      router.push('/contractor/workers');
      return;
    }

    const fetchWorker = async () => {
      try {
        const repository = new IndexedDBWorkerRepository();
        const getUseCase = new GetWorkerByIdUseCase(repository);
        const result = await getUseCase.execute(workerId);

        if (result.success) {
          if (result.value.contractor_id !== currentSession.contractor_id) {
            logger.warn('unauthorized_worker_edit_attempt', {
              user_id: currentSession.user_id,
              worker_id: workerId,
            });
            showToast('アクセス権限がありません。', 'error');
            router.push('/contractor/workers');
            return;
          }
          setWorkerData(result.value);
        } else {
          showToast(result.error.message, 'error');
          router.push('/contractor/workers');
        }
      } catch (err) {
        logger.error('failed_to_fetch_worker_for_edit', err);
        showToast('作業員情報の読み込みに失敗しました。', 'error');
        router.push('/contractor/workers');
      } finally {
        setLoading(false);
      }
    };

    fetchWorker();
  }, [router, workerId, showToast]);

  const handleCancel = () => {
    logger.info('worker_edit_canceled', { worker_id: workerId, user_id: session?.user_id });
    router.push('/contractor/workers');
  };

  const handleSubmit = async (values: {
    name: string;
    contact?: string;
    qualifications: string[];
    trainings: Array<{ code: string; taken_at: string }>;
  }) => {
    if (!session || !workerId) return;
    setSubmitting(true);
    try {
      const repository = new IndexedDBWorkerRepository();
      const saveUseCase = new SaveWorkerUseCase(repository);

      const params: SaveWorkerParams = {
        workerId,
        contractorId: session.contractor_id || '',
        name: values.name,
        contact: values.contact,
        qualifications: values.qualifications,
        trainings: values.trainings,
      };

      const result = await saveUseCase.execute(params);

      if (result.success) {
        showToast('作業員情報を更新しました。', 'success');
        router.push('/contractor/workers');
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      logger.error('worker_edit_failed', err);
      showToast('作業員の更新に失敗しました。', 'error');
    } finally {
      setSubmitting(false);
    }
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
              <span className="text-sm font-bold text-gray-900 sm:text-base">作業員編集</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">{session?.display_name} 様</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">作業員編集</h1>
          <p className="text-sm text-gray-500 mt-1">現場作業員の登録情報を更新してください。</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <WorkerForm
            initialData={workerData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitting={submitting}
          />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-gray-400">
          &copy; 2026 勤怠・配置管理システム プロトタイプ版
        </div>
      </footer>
    </div>
  );
}