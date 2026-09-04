'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/mockAuth';
import { WorkerForm, WorkerFormData } from '@/features/worker/ui/WorkerForm';
import { WorkerUsecase } from '@/features/worker/usecase/workerUsecase';
import { IndexedDBWorkerRepository } from '@/features/worker/repository/workerRepository';

export default function WorkerNewPage() {
  const router = useRouter();
  const { user, loading } = useAuth('CONTRACTOR_MANAGER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleSubmit = async (formData: WorkerFormData) => {
    if (!user || !user.contractorId) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const repository = new IndexedDBWorkerRepository();
    const usecase = new WorkerUsecase(repository);

    const result = await usecase.createWorker(formData, user.contractorId);

    if (result.success) {
      showToast('作業員を新規登録しました。');
      setTimeout(() => {
        router.push('/workers');
      }, 1000);
    } else {
      setErrorMessage(result.error.message);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/workers');
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">作業員追加</h1>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {user.displayName}
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6">
        {toastMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-md flex items-center space-x-2 shadow-sm">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-center space-x-2 shadow-sm">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <WorkerForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </main>
    </div>
  );
}