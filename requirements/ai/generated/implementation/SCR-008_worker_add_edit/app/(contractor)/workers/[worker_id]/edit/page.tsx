'use client';

import WorkerForm from '@/features/worker/ui/WorkerForm';

interface Props {
  params: {
    worker_id: string;
  };
}

export default function WorkerEditPage({ params }: Props) {
  return <WorkerForm workerId={params.worker_id} />;
}
"
    },
    {