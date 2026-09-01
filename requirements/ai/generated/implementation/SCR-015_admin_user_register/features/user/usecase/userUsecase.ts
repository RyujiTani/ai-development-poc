import { User, Contractor, Result, Role, Status } from "../domain/user";
import { UserRepository } from "../repository/userRepository";

export interface RegisterUserInput {
  login_id: string;
  password_hash: string;
  display_name: string;
  role: Role;
  contractor_id: string | null;
}

export interface ModifyUserInput {
  display_name: string;
  role: Role;
  contractor_id: string | null;
  status: Extract<Status, 'ACTIVE' | 'LOCKED' | 'DISABLED'>;
  password_hash?: string;
}

export class UserUsecase {
  constructor(private userRepository: UserRepository) {}

  async getUsersList(): Promise<Result<User[]>> {
    try {
      const users = await this.userRepository.getAllUsers();
      return { success: true, value: users };
    } catch (e: any) {
      return {
        success: false,
        error: { code: "GET_USERS_FAILED", message: "ユーザー一覧の取得に失敗しました。" }
      };
    }
  }

  async getContractorsList(): Promise<Result<Contractor[]>> {
    try {
      const contractors = await this.userRepository.getActiveContractors();
      return { success: true, value: contractors };
    } catch (e: any) {
      return {
        success: false,
        error: { code: "GET_CONTRACTORS_FAILED", message: "外注先企業リストの取得に失敗しました。" }
      };
    }
  }

  async registerUser(input: RegisterUserInput): Promise<Result<void>> {
    try {
      if (!input.login_id.trim()) {
        return {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "ユーザーIDは必須入力です。" }
        };
      }

      const existingUser = await this.userRepository.getUserByLoginId(input.login_id.trim());
      if (existingUser) {
        return {
          success: false,
          error: { code: "DUPLICATE_LOGIN_ID", message: "既に登録されているユーザーIDです。" }
        };
      }

      if (input.role === "CONTRACTOR_MANAGER" && !input.contractor_id) {
        return {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "外注先管理者の場合は所属企業の選択が必須です。" }
        };
      }

      const newUser: User = {
        user_id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        login_id: input.login_id.trim(),
        password_hash: input.password_hash,
        display_name: input.display_name.trim() || input.login_id.trim(),
        role: input.role,
        contractor_id: input.role === "FACTORY_ADMIN" ? null : input.contractor_id,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.userRepository.createUser(newUser);
      return { success: true, value: undefined };
    } catch (e: any) {
      return {
        success: false,
        error: { code: "CREATE_USER_FAILED", message: "ユーザーの作成に失敗しました。" }
      };
    }
  }

  async modifyUser(userId: string, input: ModifyUserInput): Promise<Result<void>> {
    try {
      const existingUser = await this.userRepository.getUserById(userId);
      if (!existingUser) {
        return {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "指定されたユーザーが見つかりません。" }
        };
      }

      if (input.role === "CONTRACTOR_MANAGER" && !input.contractor_id) {
        return {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "外注先管理者の場合は所属企業の選択が必須です。" }
        };
      }

      existingUser.display_name = input.display_name.trim() || existingUser.display_name;
      existingUser.role = input.role;
      existingUser.contractor_id = input.role === "FACTORY_ADMIN" ? null : input.contractor_id;
      existingUser.status = input.status;
      existingUser.updated_at = new Date().toISOString();

      if (input.password_hash) {
        existingUser.password_hash = input.password_hash;
      }

      await this.userRepository.updateUser(existingUser);
      return { success: true, value: undefined };
    } catch (e: any) {
      return {
        success: false,
        error: { code: "UPDATE_USER_FAILED", message: "ユーザーの更新に失敗しました。" }
      };
    }
  }

  async disableUser(userId: string): Promise<Result<void>> {
    try {
      await this.userRepository.deleteUser(userId);
      return { success: true, value: undefined };
    } catch (e: any) {
      return {
        success: false,
        error: { code: "DISABLE_USER_FAILED", message: "ユーザーの無効化に失敗しました。" }
      };
    }
  }
}
"
    },
    {