import { Result } from '../../../lib/error/appError';
import { logger } from '../../../lib/logger/logger';
import { User, Role } from '../domain/user';
import { UserRepository } from '../repository/userRepository';
import { hashPassword } from '../../../lib/auth/hash';

export interface SaveUserParams {
  userId?: string; // 編集時は必須
  contractorId: string | null; // null = 工場側管理者
  role: Role;
  loginId: string;
  password?: string; // 新規時は必須、編集時は空なら変更なし
  displayName: string;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
}

export class SaveUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(params: SaveUserParams): Promise<Result<User>> {
    try {
      const isEdit = !!params.userId;
      logger.info('save_user_attempt', {
        user_id: params.userId,
        is_edit: isEdit,
        login_id: params.loginId,
      });

      // バリデーション
      if (!params.loginId.trim()) {
        return {
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: 'ログインIDは必須入力です。' },
        };
      }

      if (!params.displayName.trim()) {
        return {
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: '表示名は必須入力です。' },
        };
      }

      if (params.role === 'CONTRACTOR_MANAGER' && !params.contractorId) {
        return {
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: '外注先管理者の場合は所属企業の選択が必須です。' },
        };
      }

      const now = new Date().toISOString();
      let user: User;

      if (isEdit && params.userId) {
        // 既存のユーザー取得
        const users = await this.userRepository.findAll();
        const existing = users.find(u => u.user_id === params.userId);
        if (!existing) {
          return {
            success: false,
            error: { code: 'NOT_FOUND', message: 'ユーザーが見つかりません。' },
          };
        }

        // ログインID重複チェック（自分自身を除く）
        const duplicate = users.find(u => u.login_id === params.loginId && u.user_id !== params.userId);
        if (duplicate) {
          return {
            success: false,
            error: { code: 'DUPLICATE_LOGIN_ID', message: 'このログインIDはすでに登録されています。' },
          };
        }

        let passwordHash = existing.password_hash;
        if (params.password && params.password.trim()) {
          passwordHash = await hashPassword(params.password);
        }

        user = {
          ...existing,
          contractor_id: params.role === 'FACTORY_ADMIN' ? null : params.contractorId,
          role: params.role,
          login_id: params.loginId,
          password_hash: passwordHash,
          display_name: params.displayName,
          status: params.status,
          updated_at: now,
        };
      } else {
        // 新規登録
        if (!params.password || !params.password.trim()) {
          return {
            success: false,
            error: { code: 'INVALID_ARGUMENT', message: '新規登録時はパスワードが必須です。' },
          };
        }

        // ログインID重複チェック
        const existingUser = await this.userRepository.findByLoginId(params.loginId);
        if (existingUser) {
          return {
            success: false,
            error: { code: 'DUPLICATE_LOGIN_ID', message: 'このログインIDはすでに登録されています。' },
          };
        }

        const passwordHash = await hashPassword(params.password);
        user = {
          user_id: crypto.randomUUID(),
          contractor_id: params.role === 'FACTORY_ADMIN' ? null : params.contractorId,
          role: params.role,
          login_id: params.loginId,
          password_hash: passwordHash,
          display_name: params.displayName,
          status: 'ACTIVE',
          created_at: now,
          updated_at: now,
        };
      }

      await this.userRepository.save(user);
      logger.info('save_user_success', { user_id: user.user_id, is_edit: isEdit });

      return { success: true, value: user };
    } catch (error) {
      logger.error('save_user_failed', error, { user_id: params.userId });
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: 'ユーザー情報の保存に失敗しました。' },
      };
    }
  }
}