import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ContractorHomePage from "@/app/(contractor)/page";
import { getUserMeUseCase } from "@/features/user/usecase/getUserMeUseCase";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: mockReplace,
};
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock UseCase
vi.mock("@/features/user/usecase/getUserMeUseCase", () => ({
  getUserMeUseCase: vi.fn(),
}));

describe("SCR-002 Contractor Home Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("未認証の場合、ログイン画面にリダイレクトされること", async () => {
    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("認証済みのロールが CONTRACTOR_MANAGER 以外の場合、ログイン画面にリダイレクトされること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("正常にユーザー情報が読み込まれ、ユーザー名が表示されること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValueOnce({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "山田 太郎",
        status: "ACTIVE",
      },
    });

    render(<ContractorHomePage />);

    // 読み込み中状態
    expect(screen.getByTestId("loading-state")).not.toBeNull();

    // 読み込み完了後、ユーザー名が表示されること
    await waitFor(() => {
      expect(screen.getByTestId("user-display-name").textContent).toContain("山田 太郎 様");
    });

    expect(screen.getByTestId("punch-menu-button")).not.toBeNull();
    expect(screen.getByTestId("workers-menu-button")).not.toBeNull();
  });

  it("ユーザー情報の取得に失敗した場合、エラー画面が表示され、ログイン画面へ戻れること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValueOnce({
      success: false,
      error: { code: "SYSTEM_ERROR", message: "システムエラーが発生しました。" },
    });

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.getByText("エラーが発生しました")).not.toBeNull();
      expect(screen.getByText("システムエラーが発生しました。")).not.toBeNull();
    });

    const backButton = screen.getByRole("button", { name: "ログイン画面へ戻る" });
    fireEvent.click(backButton);

    expect(sessionStorage.getItem("user_id")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("「打刻」ボタンをクリックした時、打刻モード画面へ遷移すること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValueOnce({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "山田 太郎",
        status: "ACTIVE",
      },
    });

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId("user-display-name")).not.toBeNull();
    });

    const punchButton = screen.getByTestId("punch-menu-button");
    fireEvent.click(punchButton);

    expect(mockPush).toHaveBeenCalledWith("/punch-mode");
  });

  it("「作業員管理」ボタンをクリックした時、作業員一覧画面へ遷移すること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValueOnce({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "山田 太郎",
        status: "ACTIVE",
      },
    });

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId("user-display-name")).not.toBeNull();
    });

    const workersButton = screen.getByTestId("workers-menu-button");
    fireEvent.click(workersButton);

    expect(mockPush).toHaveBeenCalledWith("/workers");
  });

  it("「ログアウト」ボタンをクリックした時、セッションがクリアされログイン画面へ遷移すること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");
    sessionStorage.setItem("contractor_id", "contractor-1");

    vi.mocked(getUserMeUseCase).mockResolvedValueOnce({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "山田 太郎",
        status: "ACTIVE",
      },
    });

    render(<ContractorHomePage />);

    await waitFor(() => {
      expect(screen.getByTestId("user-display-name")).not.toBeNull();
    });

    const logoutButton = screen.getByTestId("logout-button");
    fireEvent.click(logoutButton);

    expect(sessionStorage.getItem("user_id")).toBeNull();
    expect(sessionStorage.getItem("role")).toBeNull();
    expect(sessionStorage.getItem("contractor_id")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});