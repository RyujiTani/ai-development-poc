import { z } from 'zod';

// trace: SCR-014-VL-001
export const contractorSchema = z.object({
  name: z.string().trim().min(1, { message: '企業名を入力してください' }),
  status: z.enum(['ACTIVE', 'INACTIVE'])
});

export type ContractorFormData = z.infer<typeof contractorSchema>;
"
    },
    {