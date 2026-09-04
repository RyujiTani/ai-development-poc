import { User, Role } from '../domain/user';
import { UserRepository } from '../repository/userRepository';
import { ContractorRepository } from '@/features/contractor/repository/contractorRepository';
import { Contractor } from '@/features/contractor/domain/contractor';
import { logger } from '@/lib/logger/logger';

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

export class UserUsecase {
  constructor(
    private userRepository: UserRepository,
    private contractorRepository: ContractorRepository
  ) {}

  async getUserList(): Promise<Result<User[]>> {
    try {
      const users = await this.userRepository.getAllUsers();
      return { success: true, data: users };
    } catch (e) {
      logger.error('GET_USER_LIST_FAILED', { error: String(e) });
      return { success: false, error: e as Error };
    }
  }

  async getActiveContractors(): Promise<Result<Contractor[]>> {
    try {
      const contractors = await this.contractorRepository.getActiveContractors();
      return { success: true, data: contractors };
    } catch (e) {
      logger.error('GET_CONTRACTORS_FAILED', { error: String(e) });
      return { success: false, error: e as Error };
    }
  }

  async createUser(params: {
    userId: string;
    loginId: string;
    displayName: string;
    role: Role;
    contractorId: string | null;
    password?: string;
  }): Promise<Result<User>> {
    try {
      const existingUser = await this.userRepository.getUserById(params.userId);
      if (existingUser) {
        return { success: false, error: new Error('このユーザーIDは既に登録されています') };
      }
      const existingLogin = await this.userRepository.getUserByLoginId(params.loginId);
      if (existingLogin) {
        return { success: false, error: new Error('このログインIDは既に登録されています') };
      }

      if (!params.password) {
        return { success: false, error: new Error('パスワードは必須項目です') };
      }
      if (params.password.length < 8) {
        return { success: false, error: new Error('パスワードは8文字以上である必要があります') };
      }

      if (params.role === 'CONTRACTOR_MANAGER' && !params.contractorId) {
        return { success: false, error: new Error('外注先管理者の場合は、所属企業を選択してください') };
      }

      const passwordHash = `hashed_${params.password}`;

      const newUser: User = {
        user_id: params.userId,
        login_id: params.loginId,
        display_name: params.displayName,
        role: params.role,
        contractor_id: params.role === 'FACTORY_ADMIN' ? null : params.contractorId,
        password_hash: passwordHash,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const created = await this.userRepository.createUser(newUser);
      logger.info('CREATE_USER_SUCCESS', { userId: created.user_id });
      return { success: true, data: created };
    } catch (e) {
      logger.error('CREATE_USER_FAILED', { error: String(e) });
      return { success: false, error: e as Error };
    }
  }

  async updateUser(
    userId: string,
    params: {
      displayName: string;
      role: Role;
      contractorId: string | null;
      password?: string;
    }
  ): Promise<Result<User>> {
    try {
      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        return { success: false, error: new Error('ユーザーが見つかりません') };
      }

      if (params.role === 'CONTRACTOR_MANAGER' && !params.contractorId) {
        return { success: false, error: new Error('外注先管理者の場合は、所属企業を選択してください') };
      }

      const updatedUser: User = {
        ...user,
        display_name: params.displayName,
        role: params.role,
        contractor_id: params.role === 'FACTORY_ADMIN' ? null : params.contractorId,
        updated_at: new Date().toISOString(),
      };

      if (params.password) {
        if (params.password.length < 8) {
          return { success: false, error: new Error('パスワードは8文字以上である必要があります') };
        }
        updatedUser.password_hash = `hashed_${params.password}`;
      }

      const updated = await this.userRepository.updateUser(updatedUser);
      logger.info('UPDATE_USER_SUCCESS', { userId: updated.user_id });
      return { success: true, data: updated };
    } catch (e) {
      logger.error('UPDATE_USER_FAILED', { error: String(e) });
      return { success: false, error: e as Error };
    }
  }

  async deleteUser(userId: string): Promise<Result<void>> {
    try {
      await this.userRepository.deleteUser(userId);
      logger.info('DELETE_USER_SUCCESS', { userId });
      return { success: true, data: undefined };
    } catch (e) {
      logger.error('DELETE_USER_FAILED', { error: String(e) });
      return { success: false, error: e as Error };
    }
  }
}