import { z } from 'zod';

export const workerSchema = z.object({
  name: z.string().min(1, '氏名は必須入力です'),
  contact: z
    .string()
    .min(1, '連絡先は必須入力です')
    .regex(/^0[789]0-?\d{4}-?\d{4}$|^0\d{1,4}-?\d{1,4}-?\d{3,4}$/, '適切な電話番号の形式で入力してください。'),
});

export type WorkerFormValues = z.infer<typeof workerSchema>;