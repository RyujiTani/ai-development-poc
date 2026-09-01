import { Result, AppError } from '@/lib/result';
import { UserRepository } from '../repository/userRepository';
import { simpleHash } from '@/lib/db/indexedDb';

export interface LoginResult {
  token: string;
  admin_info: {
    user_id: string;
    display_name: string;
    role: 'FACTORY_ADMIN';
  };
}

export class LoginUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(loginId: string, password: string): Promise<Result<LoginResult, AppError>> {
    try {
      if (!loginId) {
        return { success: false, error: new AppError('REQUIRED_LOGIN_ID', 'IDを入力してください。') };
      }
      if (!password) {
        return { success: false, error: new AppError('REQUIRED_PASSWORD', 'パスワードを入力してください。') };
      }

      const user = await this.userRepository.findByLoginId(loginId);
      if (!user) {
        return { success: false, error: new AppError('AUTH_FAILED', 'IDまたはパスワードが正しくありません。') };
      }

      if (user.status !== 'ACTIVE') {
        return { success: false, error: new AppError('ACCOUNT_LOCKED', 'このアカウントは現在ロックされているか無効化されています。') };
      }

      if (user.role !== 'FACTORY_ADMIN') {
        return { success: false, error: new AppError('UNAUTHORIZED_ROLE', '工場側管理者以外はログインできません。') };
      }

      const hashedInput = simpleHash(password);
      if (user.password_hash !== hashedInput) {
        return { success: false, error: new AppError('AUTH_FAILED', 'IDまたはパスワードが正しくありません。') };
      }

      // ログイン成功モックトークン
      const token = `mock-jwt-token-for-${user.user_id}-${Date.now()}`;
      
      // 最終ログイン日時更新
      user.last_login_at = new Date().toISOString();
      await this.userRepository.save(user);

      return {
        success: true,
        value: {
          token,
          admin_info: {
            user_id: user.user_id,
            display_name: user.display_name,
            role: 'FACTORY_ADMIN'
          }
        }
      };
    } catch (e) {
      return {
        success: false,
        error: new AppError('SYSTEM_ERROR', 'システムエラーが発生しました。しばらく経ってから再度お試しください。')
      };
    }
  }
}
"
    },
    {