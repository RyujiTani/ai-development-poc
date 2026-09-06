import { z } from 'zod';

export const loginSchema = z.object({
  loginId: z.string().min(1, 'ログインIDを入力してください。'),
  password: z.string().min(1, 'パスワードを入力してください。'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;