"use client";

import React from "react";
import WorkerForm from "@/features/worker/ui/WorkerForm";

export default function WorkerEditPage({ params }: { params: { worker_id: string } }) {
  return <WorkerForm mode="edit" workerId={params.worker_id} />;
}