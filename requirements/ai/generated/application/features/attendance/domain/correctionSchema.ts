import { z } from 'zod';

export const correctionSchema = z.object({
  workerId: z.string().min(1, '作業員を選択してください。'),
  clockedAt: z.string().min(1, '打刻日時を入力してください。'),
  punchType: z.enum(['CLOCK_IN', 'CLOCK_OUT'], {
    errorMap: () => ({ message: '打刻種別を選択してください。' }),
  }),
  reason: z.string().min(1, '修正理由を入力してください。'),
});

export type CorrectionFormValues = z.infer<typeof correctionSchema>;