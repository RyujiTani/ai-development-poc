import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import AdminLoginPage from "../../app/(auth)/admin-login/page";
import { adminLoginUseCase } from "../../features/auth/usecase/adminLoginUseCase";
import { logger } from "../../lib/logger/logger";

// next/navigation のモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: vi.fn(),
    };
  },
}));

// UseCase のモック
vi.mock("../../features/auth/usecase/adminLoginUseCase", () => ({
  adminLoginUseCase: vi.fn(),
}));

// initializeDB のモック
vi.mock("@/lib/db/indexedDB", () => ({
  initializeDB: vi.fn(() => Promise.resolve(undefined)),
  getDB: vi.fn(() => Promise.resolve(undefined)),
}));

// loggerのモック
vi.mock("../../lib/logger/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

describe("SCR-010 Admin Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("should render ID and password fields and submit button (TST-010-001)", () => {
    render(<AdminLoginPage />);

    expect(screen.getByLabelText("ログインID")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();

    // 中央揃えのスタイルの適用確認 (flexとマージン・パディング定義)
    const cardContainer = screen.getByLabelText("ログインID").closest(".flex");
    expect(cardContainer).toBeInTheDocument();
  });

  it("should show validation error when ID is empty (TST-010-002)", async () => {
    render(<AdminLoginPage />);

    const passwordInput = screen.getByLabelText("パスワード");
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    const submitButton = screen.getByRole("button", { name: "ログイン" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("IDを入力してください")).toBeInTheDocument();
    });

    expect(adminLoginUseCase).not.toHaveBeenCalled();
  });

  it("should show validation error when Password is empty (TST-010-003)", async () => {
    render(<AdminLoginPage />);

    const idInput = screen.getByLabelText("ログインID");
    fireEvent.change(idInput, { target: { value: "admin_user" } });

    const submitButton = screen.getByRole("button", { name: "ログイン" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("パスワードを入力してください")).toBeInTheDocument();
    });

    expect(adminLoginUseCase).not.toHaveBeenCalled();
  });

  it("should handle authentication failure correctly (TST-010-004)", async () => {
    vi.mocked(adminLoginUseCase).mockResolvedValueOnce({
      success: false,
      error: { code: "INVALID_CREDENTIALS", message: "IDまたはパスワードが正しくありません" },
    });

    render(<AdminLoginPage />);

    const idInput = screen.getByLabelText("ログインID");
    const passwordInput = screen.getByLabelText("パスワード");
    const submitButton = screen.getByRole("button", { name: "ログイン" });

    fireEvent.change(idInput, { target: { value: "invalid_user" } });
    fireEvent.change(passwordInput, { target: { value: "wrong_password" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("IDまたはパスワードが正しくありません")).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();

    // 機密情報ログ出力ポリシーの確認 (パスワードや個人情報がログに含まれないこと)
    const loggerCalls = vi.mocked(logger.info).mock.calls;
    loggerCalls.forEach((call) => {
      const payload = call[1];
      if (payload) {
        expect(payload.password).toBeUndefined();
        expect(payload.passwordPlain).toBeUndefined();
        expect(payload.password_plain).toBeUndefined();
      }
    });
  });

  it("should sign in successfully and redirect to integrated dashboard (TST-010-005)", async () => {
    const mockSuccessResponse = {
      success: true as const,
      value: {
        userId: "admin-1",
        role: "FACTORY_ADMIN" as const,
        displayName: "工場管理者A",
        contractorId: null,
      },
    };

    vi.mocked(adminLoginUseCase).mockResolvedValueOnce(mockSuccessResponse);

    render(<AdminLoginPage />);

    const idInput = screen.getByLabelText("ログインID");
    const passwordInput = screen.getByLabelText("パスワード");
    const submitButton = screen.getByRole("button", { name: "ログイン" });

    fireEvent.change(idInput, { target: { value: "admin_test" } });
    fireEvent.change(passwordInput, { target: { value: "password_test" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(sessionStorage.getItem("user_id")).toBe("admin-1");
      expect(sessionStorage.getItem("role")).toBe("FACTORY_ADMIN");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});