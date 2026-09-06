import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LoginPage from "@/app/(auth)/login/page";

import "fake-indexeddb/auto";
import { getDB } from "@/lib/db/indexedDB";
import { hashPassword } from "@/lib/auth/hash";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
    };
  },
}));

describe("SCR-001 外注先ログイン画面", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorage.clear();

    const db = await getDB();
    const tx = db.transaction(["users"], "readwrite");
    await tx.store.clear();
    
    await tx.store.put({
      user_id: "user-1",
      contractor_id: "contractor-1",
      role: "CONTRACTOR_MANAGER",
      login_id: "seeded_contractor_manager",
      password_hash: hashPassword("correct_password"),
      display_name: "外注先管理者 A",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await tx.store.put({
      user_id: "user-2",
      contractor_id: null,
      role: "FACTORY_ADMIN",
      login_id: "factory_admin",
      password_hash: hashPassword("factory_password"),
      display_name: "工場管理者",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await tx.done;

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ contractors: [], users: [], workers: [] }),
      })
    ) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TS-SCR-001-001: ID未入力の状態で送信すると、バリデーションエラーが表示されること", async () => {
    render(<LoginPage />);
    
    const passwordInput = screen.getByLabelText("パスワード");
    const submitButton = screen.getByRole("button", { name: "ログイン" });

    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    const errorMessage = await screen.findByText("IDを入力してください");
    expect(errorMessage).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("TS-SCR-001-002: パスワード未入力の状態で送信すると、バリデーションエラーが表示されること", async () => {
    render(<LoginPage />);

    const idInput = screen.getByLabelText("ログインID");
    const submitButton = screen.getByRole("button", { name: "ログイン" });

    fireEvent.change(idInput, { target: { value: "contractor_admin" } });
    fireEvent.click(submitButton);

    const errorMessage = await screen.findByText("パスワードを入力してください");
    expect(errorMessage).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("TS-SCR-001-003: 不正なID/パスワードを設定して送信すると、認証エラーメッセージが表示されること", async () => {
    render(<LoginPage />);

    const idInput = screen.getByLabelText("ログインID");
    const passwordInput = screen.getByLabelText("パスワード");
    const submitButton = screen.getByRole("button", { name: "ログイン" });

    fireEvent.change(idInput, { target: { value: "invalid_user" } });
    fireEvent.change(passwordInput, { target: { value: "wrong_password" } });
    fireEvent.click(submitButton);

    const errorMessage = await screen.findByText("ログインIDまたはパスワードが正しくありません");
    expect(errorMessage).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("TS-SCR-001-004: 有効な外注先管理者のID・パスワードでログインすると、sessionStorageに値が保持され、/homeへ遷移すること", async () => {
    render(<LoginPage />);

    const idInput = screen.getByLabelText("ログインID");
    const passwordInput = screen.getByLabelText("パスワード");
    const submitButton = screen.getByRole("button", { name: "ログイン" });

    fireEvent.change(idInput, { target: { value: "seeded_contractor_manager" } });
    fireEvent.change(passwordInput, { target: { value: "correct_password" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(sessionStorage.getItem("user_id")).toBe("user-1");
      expect(sessionStorage.getItem("role")).toBe("CONTRACTOR_MANAGER");
      expect(sessionStorage.getItem("contractor_id")).toBe("contractor-1");
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("TS-SCR-001-005: ログイン処理の実行中はボタンがdisabledとなり、複数回送信が防止されること", async () => {
    render(<LoginPage />);

    const idInput = screen.getByLabelText("ログインID");
    const passwordInput = screen.getByLabelText("パスワード");
    const submitButton = screen.getByRole("button", { name: "ログイン" });

    fireEvent.change(idInput, { target: { value: "seeded_contractor_manager" } });
    fireEvent.change(passwordInput, { target: { value: "correct_password" } });
    
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("ログイン中...");
    });
  });

  it("TS-SCR-001-006: ログインフォームが中央配置（flex items-center justify-center）されていること", () => {
    const { container } = render(<LoginPage />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass("flex");
    expect(outerDiv).toHaveClass("items-center");
    expect(outerDiv).toHaveClass("justify-center");
  });
});