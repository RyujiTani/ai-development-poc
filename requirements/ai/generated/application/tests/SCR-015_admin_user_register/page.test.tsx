import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import "fake-indexeddb/auto";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AdminUsersPage from "@/app/(factory)/admin-users/page";
import { getDB } from "@/lib/db";

// Next.js Navigation Router Mock
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
    };
  },
}));

describe("SCR-015 管理者ユーザー登録画面 テスト", () => {
  beforeEach(async () => {
    // SessionStorage Mock
    globalThis.sessionStorage = {
      getItem: (key: string) => {
        if (key === "user_id") return "user-admin";
        if (key === "role") return "FACTORY_ADMIN";
        return null;
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as any;

    // Database Initialize and Seeding for Tests
    const db = await getDB();
    const tx = db.transaction(["users", "contractors"], "readwrite");
    await tx.objectStore("users").clear();
    await tx.objectStore("contractors").clear();
    
    await tx.objectStore("users").put({
      user_id: "user-admin",
      contractor_id: null,
      role: "FACTORY_ADMIN",
      login_id: "admin_user",
      password_hash: "Y29ycmVjdF9wYXNzd29yZA==",
      display_name: "工場管理者",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    await tx.objectStore("users").put({
      user_id: "user-2",
      contractor_id: "contractor-1",
      role: "CONTRACTOR_MANAGER",
      login_id: "contractor_user",
      password_hash: "Y29ycmVjdF9wYXNzd29yZA==",
      display_name: "外注先管理者A",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await tx.objectStore("contractors").put({
      contractor_id: "contractor-1",
      name: "サンプル建設",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    await tx.done;
  });

  it("TS-SCR-015-001: ユーザーデータが正しくテーブルに描画される", async () => {
    render(<AdminUsersPage />);

    // ロード完了を待つ
    await waitFor(() => {
      expect(screen.getByTestId("user-login-id-user-admin")).toHaveTextContent("admin_user");
    });

    expect(screen.getByTestId("user-display-name-user-admin")).toHaveTextContent("工場管理者");
    expect(screen.getByTestId("user-role-badge-user-admin")).toHaveTextContent("工場側管理者");
    expect(screen.getByTestId("user-contractor-name-user-admin")).toHaveTextContent("工場内管理者");

    expect(screen.getByTestId("user-login-id-user-2")).toHaveTextContent("contractor_user");
    expect(screen.getByTestId("user-display-name-user-2")).toHaveTextContent("外注先管理者A");
    expect(screen.getByTestId("user-role-badge-user-2")).toHaveTextContent("外注先管理者");
    expect(screen.getByTestId("user-contractor-name-user-2")).toHaveTextContent("サンプル建設");
  });

  it("TS-SCR-015-002: 重複エラーおよび必須エラーメッセージの表示", async () => {
    render(<AdminUsersPage />);

    // 新規登録モーダルを開く
    const newBtn = await screen.findByTestId("new-user-btn");
    fireEvent.click(newBtn);

    // 未入力で保存してバリデーションチェック
    const saveBtn = await screen.findByTestId("modal-save-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByTestId("login-id-error")).toBeInTheDocument();
    });

    // 重複したログインIDを入力して保存
    const loginIdInput = screen.getByTestId("login-id-input");
    const nameInput = screen.getByTestId("display-name-input");
    const passwordInput = screen.getByTestId("password-input");

    fireEvent.change(loginIdInput, { target: { value: "admin_user" } });
    fireEvent.change(nameInput, { target: { value: "新規テスト" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    fireEvent.click(saveBtn);

    // トースト重複エラーの検証
    await waitFor(() => {
      expect(screen.getByTestId("toast-message")).toHaveTextContent("このユーザーIDは既に登録されています");
    });
  });

  it("TS-SCR-015-003: 権限種別を外注先管理者に変更した際に所属企業選択が表示される", async () => {
    render(<AdminUsersPage />);

    const newBtn = await screen.findByTestId("new-user-btn");
    fireEvent.click(newBtn);

    // 工場側管理者の選択時は、所属企業セレクトボックスが表示されない
    expect(screen.queryByTestId("contractor-select-container")).not.toBeInTheDocument();

    // 権限選択を「外注先管理者」に変更
    const roleSelect = screen.getByTestId("role-select");
    fireEvent.change(roleSelect, { target: { value: "CONTRACTOR_MANAGER" } });

    // セレクトボックスが表示されることの検証
    await waitFor(() => {
      expect(screen.getByTestId("contractor-select-container")).toBeInTheDocument();
    });
  });
});