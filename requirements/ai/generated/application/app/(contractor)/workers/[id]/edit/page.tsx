"use client";

import React from "react";
import { useParams } from "next/navigation";
import WorkerForm from "@/features/worker/ui/WorkerForm";

export default function EditWorkerPage() {
  const params = useParams();
  const id = params?.id as string;

  return <WorkerForm workerId={id} />;
}