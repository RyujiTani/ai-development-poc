import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import AdminLoginPage from "@/app/(auth)/admin-login/page";
import * as authLib from "@/lib/auth";

// useRouter のモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

// lib/auth のモック
vi.mock("@/lib/auth", () => ({
  login: vi.fn(),
  logout: vi.fn(),
}));

describe("SCR-010_admin_login - 管理者ログイン画面", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // sessionStorageのモック
    if (typeof window !== "undefined") {
      const store: Record<string, string> = {};
      vi.spyOn(window.sessionStorage, "setItem").mockImplementation((key, value) => {
        store[key] = value;
      });
      vi.spyOn(window.sessionStorage, "getItem").mockImplementation((key) => store[key] || null);
      vi.spyOn(window.sessionStorage, "removeItem").mockImplementation((key) => {
        delete store[key];
      });
      vi.spyOn(window.sessionStorage, "clear").mockImplementation(() => {
        for (const key in store) {
          delete store[key];
        }
      });
    }
  });

  it("TST-010-001: 有効な工場管理者アカウントでログインに成功し、ダッシュボードに遷移する", async () => {
    vi.mocked(authLib.login).mockResolvedValue({
      success: true,
      user: {
        user_id: "user-admin",
        role: "FACTORY_ADMIN",
        display_name: "工場管理者 A",
      },
    });

    render(<AdminLoginPage />);

    const idInput = screen.getByTestId("login-id-input");
    const passwordInput = screen.getByTestId("password-input");
    const submitButton = screen.getByTestId("submit-btn");

    fireEvent.change(idInput, { target: { value: "test_admin" } });
    fireEvent.change(passwordInput, { target: { value: "correct_password" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authLib.login).toHaveBeenCalledWith("test_admin", "correct_password");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("TST-010-002: ID未入力時にバリデーションエラーが発生する", async () => {
    render(<AdminLoginPage />);

    const passwordInput = screen.getByTestId("password-input");
    const submitButton = screen.getByTestId("submit-btn");

    fireEvent.change(passwordInput, { target: { value: "any_password" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("error-login-id")).toHaveTextContent("IDを入力してください");
      expect(authLib.login).not.toHaveBeenCalled();
    });
  });

  it("TST-010-003: パスワード未入力時にバリデーションエラーが発生する", async () => {
    render(<AdminLoginPage />);

    const idInput = screen.getByTestId("login-id-input");
    const submitButton = screen.getByTestId("submit-btn");

    fireEvent.change(idInput, { target: { value: "test_admin" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("error-password")).toHaveTextContent("パスワードを入力してください");
      expect(authLib.login).not.toHaveBeenCalled();
    });
  });

  it("TST-010-004: 無効な認証情報でログインに失敗し、エラーメッセージが表示される", async () => {
    vi.mocked(authLib.login).mockResolvedValue({
      success: false,
      error: "IDまたはパスワードが正しくありません",
    });

    render(<AdminLoginPage />);

    const idInput = screen.getByTestId("login-id-input");
    const passwordInput = screen.getByTestId("password-input");
    const submitButton = screen.getByTestId("submit-btn");

    fireEvent.change(idInput, { target: { value: "invalid_id" } });
    fireEvent.change(passwordInput, { target: { value: "invalid_password" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authLib.login).toHaveBeenCalledWith("invalid_id", "invalid_password");
      expect(screen.getByTestId("error-message")).toHaveTextContent("IDまたはパスワードが正しくありません");
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("工場管理者以外のロールでログインしようとした場合、エラーメッセージを表示してログアウト処理を行う", async () => {
    vi.mocked(authLib.login).mockResolvedValue({
      success: true,
      user: {
        user_id: "user-contractor",
        role: "CONTRACTOR_MANAGER",
        display_name: "外注先 太郎",
      },
    });

    render(<AdminLoginPage />);

    const idInput = screen.getByTestId("login-id-input");
    const passwordInput = screen.getByTestId("password-input");
    const submitButton = screen.getByTestId("submit-btn");

    fireEvent.change(idInput, { target: { value: "contractor_user" } });
    fireEvent.change(passwordInput, { target: { value: "correct_password" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authLib.login).toHaveBeenCalledWith("contractor_user", "correct_password");
      expect(authLib.logout).toHaveBeenCalled();
      expect(screen.getByTestId("error-message")).toHaveTextContent("工場側管理者アカウントではありません");
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});