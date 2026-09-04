'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import WorkerForm from '@/features/worker/ui/WorkerForm';

export default function EditWorkerPage() {
  const params = useParams();
  const workerId = params?.worker_id as string;

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        {workerId ? (
          <WorkerForm mode="EDIT" workerId={workerId} />
        ) : (
          <div className="flex justify-center items-center h-64">
            <p className="text-red-500 font-semibold">作業員IDが指定されていません。</p>
          </div>
        )}
      </div>
    </main>
  );
}