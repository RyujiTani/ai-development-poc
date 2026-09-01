import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";
import React from "react";
import "@testing-library/jest-dom";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockFindByLoginId = vi.fn();
const mockUpdateLastLogin = vi.fn();

vi.mock("@/features/user/repository/userRepository", () => {
  return {
    IndexedDBUserRepository: vi.fn().mockImplementation(() => ({
      findByLoginId: mockFindByLoginId,
      updateLastLogin: mockUpdateLastLogin,
    })),
  };
});

vi.mock("@/lib/db/indexedDB", () => ({
  initDB: vi.fn().mockResolvedValue({}),
  hashPassword: (p: string) => `hash_${p}`,
}));

describe("SCR-001 外注先レグイン画面", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== "undefined") {
      sessionStorage.clear();
    }
  });

  it("TST-001-01: IDが空の状態でレグインボタンをクリックするとID必須バリデーションエラーが表示されること", async () => {
    render(<LoginPage />);
    
    const passwordInput = screen.getByLabelText("パスワード");
    const loginButton = screen.getByRole("button", { name: "レグイン" });

    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText("IDを入力してください")).toBeInTheDocument();
    });
  });

  it("TST-001-02: パスワードが空の状態でレグインボタンをクリックするとパスワード必須バリデーションエラーが表示されること", async () => {
    render(<LoginPage />);

    const idInput = screen.getByLabelText("レグインID");
    const loginButton = screen.getByRole("button", { name: "レグイン" });

    fireEvent.change(idInput, { target: { value: "contractor_admin" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText("パスワードを入力してください")).toBeInTheDocument();
    });
  });

  it("TST-001-03: 存在しないID・パスワードを入力してレグインボタンをクリックすると認証失敗メージージが表示されること", async () => {
    mockFindByLoginId.mockResolvedValue(null);

    render(<LoginPage />);

    const idInput = screen.getByLabelText("レグインID");
    const passwordInput = screen.getByLabelText("パスワード");
    const loginButton = screen.getByRole("button", { name: "レグイン" });

    fireEvent.change(idInput, { target: { value: "invalid_id" } });
    fireEvent.change(passwordInput, { target: { value: "invalid_pw" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText("IDまたはパスワードが正しくありません")).toBeInTheDocument();
    });
  });

  it("TST-001-04: 有効なID・パスワードで認証に成功するとsessionStorageに期待される情報が保存され、遷移処理が走ること", async () => {
    mockFindByLoginId.mockResolvedValue({
      user_id: "user-001",
      contractor_id: "contractor-001",
      role: "CONTRACTOR_MANAGER",
      login_id: "contractor_admin",
      password_hash: "hash_password123",
      display_name: "外注先管理者 A",
      status: "ACTIVE",
    });
    mockUpdateLastLogin.mockResolvedValue(undefined);

    render(<LoginPage />);

    const idInput = screen.getByLabelText("レグインID");
    const passwordInput = screen.getByLabelText("パスワード");
    const loginButton = screen.getByRole("button", { name: "レグイン" });

    fireEvent.change(idInput, { target: { value: "contractor_admin" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(sessionStorage.getItem("user_id")).toBe("user-001");
      expect(sessionStorage.getItem("role")).toBe("CONTRACTOR_MANAGER");
      expect(sessionStorage.getItem("display_name")).toBe("外注先管理者 A");
      expect(mockPush).toHaveBeenCalledWith("/contractor/home");
    });
  });
});
"}, {