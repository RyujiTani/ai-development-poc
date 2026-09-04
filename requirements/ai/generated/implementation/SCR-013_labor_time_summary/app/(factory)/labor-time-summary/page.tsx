'use client';

import AuthGuard from '@/components/AuthGuard';
import LaborSummaryScreen from '@/features/report/ui/LaborSummaryScreen';

export default function LaborTimeSummaryPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50 py-8">
        <LaborSummaryScreen />
      </main>
    </AuthGuard>
  );
}