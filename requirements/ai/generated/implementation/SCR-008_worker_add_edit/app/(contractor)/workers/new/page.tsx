'use client';

import React from 'react';
import WorkerForm from '@/features/worker/ui/WorkerForm';

export default function NewWorkerPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <WorkerForm mode="CREATE" />
      </div>
    </main>
  );
}