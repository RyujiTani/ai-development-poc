import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ContractorHomePage from "@/app/(contractor)/home/page";
import { getDB } from "@/lib/db";

// fake-indexeddb の自動セットアップ
import "fake-indexeddb/auto";

// useRouter のモック設定
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("SCR-002 ContractorHomePage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // テスト用のモックデータベース初期化とシードデータの投入
    const db = await getDB();
    const tx = db.transaction(["users", "contractors"], "readwrite");
    await tx.objectStore("users").put({
      user_id: "user-1",
      contractor_id: "contractor-1",
      role: "CONTRACTOR_MANAGER",
      login_id: "valid_contractor_manager",
      password_hash: "Y29ycmVjdF9wYXNzd29yZA==",
      display_name: "外注先 太郎",
      status: "ACTIVE",
      created_at: "2026-04-13T00:00:00+09:00",
      updated_at: "2026-04-13T00:00:00+09:00"
    });
    await tx.objectStore("contractors").put({
      contractor_id: "contractor-1",
      name: "株式会社 A建設",
      status: "ACTIVE",
      created_at: "2026-04-13T00:00:00+09:00",
      updated_at: "2026-04-13T00:00:00+09:00"
    });
    await tx.done;
  });

  it("sessionStorageが空の場合にログイン画面へリダイレクトされること (TST-SCR-002-001)", async () => {
    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("認証情報が正しくセットされている場合、ユーザー情報がロードされて表示されること (TST-SCR-002-002)", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<ContractorHomePage />);

    // ローディング後にユーザー名が表示されること
    await waitFor(() => {
      expect(screen.getByText(/外注先 太郎 様/)).toBeInTheDocument();
    });

    // 2つの大きなメニューボタンが存在すること
    expect(screen.getByRole("button", {
      name: (content) => content.startsWith("打刻") && !content.includes("修正"),
    })).toBeInTheDocument();
    expect(screen.getByText("作業員管理")).toBeInTheDocument();
  });

  it("「打刻」ボタンをクリックすると /punch-mode へ遷移すること (TST-SCR-002-003)", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.getByText(/外注先 太郎 様/)).toBeInTheDocument();
    });

    const punchButton = screen.getByRole("button", {
      name: (content) => content.startsWith("打刻") && !content.includes("修正"),
    });
    fireEvent.click(punchButton);

    expect(mockPush).toHaveBeenCalledWith("/punch-mode");
  });

  it("「作業員管理」ボタンをクリックすると /workers へ遷移すること (TST-SCR-002-004)", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.getByText(/外注先 太郎 様/)).toBeInTheDocument();
    });

    const workersButton = screen.getByRole("button", { name: /作業員管理/ });
    fireEvent.click(workersButton);

    expect(mockPush).toHaveBeenCalledWith("/workers");
  });

  it("「ログアウト」ボタンをクリックするとsessionStorageがクリアされ /login へ遷移すること (TST-SCR-002-005)", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.getByText(/外注先 太郎 様/)).toBeInTheDocument();
    });

    const logoutButton = screen.getByRole("button", { name: "ログアウト" });
    fireEvent.click(logoutButton);

    expect(sessionStorage.getItem("user_id")).toBeNull();
    expect(sessionStorage.getItem("role")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});