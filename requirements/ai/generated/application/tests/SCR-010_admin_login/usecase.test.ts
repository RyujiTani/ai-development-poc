import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminLoginUseCase } from "../../features/auth/usecase/adminLoginUseCase";
import { getDB } from "../../lib/db/indexedDB";
import { hashPassword } from "../../lib/auth/hash";

vi.mock("../../lib/db/indexedDB", () => ({
  getDB: vi.fn(),
}));

vi.mock("../../lib/db/auditLog", () => ({
  recordAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe("adminLoginUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login successfully with correct FACTORY_ADMIN credentials", async () => {
    const mockUser = {
      user_id: "user-admin",
      contractor_id: null,
      role: "FACTORY_ADMIN",
      login_id: "admin_test",
      password_hash: hashPassword("password_test"),
      display_name: "工場管理者",
      status: "ACTIVE",
    };

    const mockGet = vi.fn().mockResolvedValue(mockUser);
    const mockIndex = vi.fn().mockReturnValue({ get: mockGet });
    const mockStore = { index: mockIndex };
    const mockTransaction = vi.fn().mockReturnValue({
      store: mockStore,
      done: Promise.resolve(),
    });

    vi.mocked(getDB).mockResolvedValue({
      transaction: mockTransaction,
    } as any);

    const result = await adminLoginUseCase({
      loginId: "admin_test",
      passwordPlain: "password_test",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.userId).toBe("user-admin");
      expect(result.value.role).toBe("FACTORY_ADMIN");
      expect(result.value.displayName).toBe("工場管理者");
    }
  });

  it("should fail login when user role is CONTRACTOR_MANAGER", async () => {
    const mockUser = {
      user_id: "user-contractor",
      contractor_id: "contractor-1",
      role: "CONTRACTOR_MANAGER",
      login_id: "contractor_test",
      password_hash: hashPassword("password_test"),
      display_name: "外注先管理者",
      status: "ACTIVE",
    };

    const mockGet = vi.fn().mockResolvedValue(mockUser);
    const mockIndex = vi.fn().mockReturnValue({ get: mockGet });
    const mockStore = { index: mockIndex };
    const mockTransaction = vi.fn().mockReturnValue({
      store: mockStore,
      done: Promise.resolve(),
    });

    vi.mocked(getDB).mockResolvedValue({
      transaction: mockTransaction,
    } as any);

    const result = await adminLoginUseCase({
      loginId: "contractor_test",
      passwordPlain: "password_test",
    });

    expect(result.success).toBe(false);
    if ("error" in result) {
      expect(result.error.code).toBe("INVALID_ROLE");
    }
  });

  it("should fail login with wrong password", async () => {
    const mockUser = {
      user_id: "user-admin",
      contractor_id: null,
      role: "FACTORY_ADMIN",
      login_id: "admin_test",
      password_hash: hashPassword("password_test"),
      display_name: "工場管理者",
      status: "ACTIVE",
    };

    const mockGet = vi.fn().mockResolvedValue(mockUser);
    const mockIndex = vi.fn().mockReturnValue({ get: mockGet });
    const mockStore = { index: mockIndex };
    const mockTransaction = vi.fn().mockReturnValue({
      store: mockStore,
      done: Promise.resolve(),
    });

    vi.mocked(getDB).mockResolvedValue({
      transaction: mockTransaction,
    } as any);

    const result = await adminLoginUseCase({
      loginId: "admin_test",
      passwordPlain: "wrong_password",
    });

    expect(result.success).toBe(false);
    if ("error" in result) {
      expect(result.error.code).toBe("INVALID_CREDENTIALS");
    }
  });
});