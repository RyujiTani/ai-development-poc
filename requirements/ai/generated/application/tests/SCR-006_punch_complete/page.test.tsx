import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import PunchCompletePage from "@/app/(contractor)/punch-complete/page";
import { useSearchParams, useRouter } from "next/navigation";
import { getUserMeUseCase } from "@/features/user/usecase/getUserMeUseCase";

// mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

// mock getUserMeUseCase
vi.mock("@/features/user/usecase/getUserMeUseCase", () => ({
  getUserMeUseCase: vi.fn(),
}));

describe("SCR-006_punch_complete - PunchCompletePage", () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    const useRouterMock = useRouter as any;
    useRouterMock.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    const useSearchParamsMock = useSearchParams as any;
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => {
        if (key === "mode") return "CLOCK_OUT";
        if (key === "count") return "5";
        return null;
      },
    });

    const getUserMeUseCaseMock = getUserMeUseCase as any;
    getUserMeUseCaseMock.mockResolvedValue({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "テスト外注先 A",
        status: "ACTIVE",
      },
    });
  });

  it("TS-SCR-006-001 & TS-SCR-006-007: 完了メッセージとサマリー（退勤、5名）が正しく表示されること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<PunchCompletePage />);

    // loading-state が消えるのを待つ
    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    // 完了メッセージの確認 (TS-SCR-006-001)
    expect(screen.getByTestId("complete-message")).toHaveTextContent("打刻データの送信が完了しました");

    // ユーザー名の確認
    expect(screen.getByTestId("user-display-name")).toHaveTextContent("テスト外注先 A 様");

    // 引き渡された完了情報のサマリー確認 (TS-SCR-006-007)
    expect(screen.getByTestId("summary-punch-type")).toHaveTextContent("退勤");
    expect(screen.getByTestId("summary-worker-count")).toHaveTextContent("5名");
  });

  it("TS-SCR-006-002 & TS-SCR-006-004: ホームへ戻るボタンが十分なサイズで配置されていること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<PunchCompletePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const homeButton = screen.getByTestId("home-button");
    expect(homeButton).toBeInTheDocument();
    expect(homeButton).toHaveTextContent("ホームへ戻る");

    // スタイルサイズチェック (TS-SCR-006-004)
    expect(homeButton.className).toContain("h-14");
    expect(homeButton.className).toContain("py-4");
  });

  it("TS-SCR-006-003: 完了メッセージなどのコンテンツエリアが画面中央寄せになっていること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<PunchCompletePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const mainElement = screen.getByRole("main");
    // Flexbox による中央寄せの検証 (TS-SCR-006-003)
    expect(mainElement.className).toContain("flex");
    expect(mainElement.className).toContain("items-center");
    expect(mainElement.className).toContain("justify-center");
  });

  it("TS-SCR-006-005: 未ログイン状態でアクセスした場合、ログイン画面へリダイレクトされること", async () => {
    // sessionStorage が設定されていない状態
    render(<PunchCompletePage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("TS-SCR-006-006: ホームへ戻るボタン押下時にホーム（/）へ遷移すること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<PunchCompletePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const homeButton = screen.getByTestId("home-button");
    fireEvent.click(homeButton);

    // ホーム画面("/")へ遷移
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});