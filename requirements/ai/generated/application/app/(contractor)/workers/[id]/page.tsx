"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import WorkerForm from '@/features/worker/ui/WorkerForm';

export default function WorkerEditPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : undefined;

  return <WorkerForm mode="EDIT" workerId={id} />;
}