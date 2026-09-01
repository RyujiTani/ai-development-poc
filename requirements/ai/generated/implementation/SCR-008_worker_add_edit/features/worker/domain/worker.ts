import { z } from 'zod';

export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';

export interface Worker {
  worker_id: string;
  contractor_id: string;
  name: string;
  contact?: string;
  qualifications: string[];
  trainings: Array<{ code: string; taken_at: string }>;
  status: 'ACTIVE' | 'RETIRED';
  retired_at?: string;
  created_at: string;
  updated_at: string;
}

export const workerFormSchema = z.object({
  name: z.string().min(1, { message: '氏名を入力してください。' }),
  contact: z.string().min(1, { message: '連絡先を入力してください。' }),
  qualifications: z.array(z.string()).default([]),
  trainings: z.array(
    z.object({
      code: z.string().min(1, { message: '講習コードを入力してください。' }),
      taken_at: z.string().min(1, { message: '受講日を選択してください。' })
    })
  ).default([])
});

export type WorkerFormData = z.infer<typeof workerFormSchema>;
"
    },
    {