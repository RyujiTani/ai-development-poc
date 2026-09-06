import React from "react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminDashboardPage from "../../app/(factory)/dashboard/page";
import { getAdminDashboardUseCase } from "../../features/dashboard/usecase/getAdminDashboardUseCase";

// Mock implementation of Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// mock usecase
vi.mock("../../features/dashboard/usecase/getAdminDashboardUseCase", () => ({
  getAdminDashboardUseCase: vi.fn(),
}));

describe("SCR-011_admin_dashboard Page tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  test("未認証状態（セッションがない）でアクセスした場合は、強制的に /admin-login へリダイレクトされること", async () => {
    render(<AdminDashboardPage />);
    expect(mockReplace).toHaveBeenCalledWith("/admin-login");
  });

  test("認証情報はあるがロールが FACTORY_ADMIN ではない場合、強制的に /admin-login へリダイレクトされること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");
    render(<AdminDashboardPage />);
    expect(mockReplace).toHaveBeenCalledWith("/admin-login");
  });

  test("正常に認証されている場合（role = FACTORY_ADMIN）、ダッシュボードサマリーデータが表示されること", async () => {
    sessionStorage.setItem("user_id", "user-admin");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    vi.mocked(getAdminDashboardUseCase).mockResolvedValue({
      success: true,
      value: {
        summary: {
          total_workers: 25,
          clocked_in: 18,
          clocked_out: 2,
          absent: 5,
        },
        alerts: [
          {
            id: "alert-001",
            type: "MISSING_CLOCK_OUT",
            message: "作業員[A]の退勤打刻漏れの可能性があります",
            occurred_at: "2026-04-13T18:00:00+09:00",
          },
        ],
      },
    });

    render(<AdminDashboardPage />);

    // ローディング表示を確認
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();

    // データの読み込み完了を待つ
    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    // サマリー値のアサーション
    expect(screen.getByTestId("total-workers-count")).toHaveTextContent("25");
    expect(screen.getByTestId("clocked-in-count")).toHaveTextContent("18");
    expect(screen.getByTestId("clocked-out-count")).toHaveTextContent("2");
    expect(screen.getByTestId("absent-count")).toHaveTextContent("5");

    // アラートのアサーション
    expect(screen.getByTestId("alert-message-alert-001")).toHaveTextContent("作業員[A]の退勤打刻漏れの可能性があります");
  });

  test("各管理画面へのナビゲーションリンクが正しく機能していること (hrefのチェック)", async () => {
    sessionStorage.setItem("user_id", "user-admin");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    vi.mocked(getAdminDashboardUseCase).mockResolvedValue({
      success: true,
      value: {
        summary: { total_workers: 10, clocked_in: 5, clocked_out: 2, absent: 3 },
        alerts: [],
      },
    });

    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    // sidebarナビゲーションの href 属性を確認
    expect(screen.getByTestId("nav-attendance-history")).toHaveAttribute("href", "/attendance-history");
    expect(screen.getByTestId("nav-labor-summary")).toHaveAttribute("href", "/labor-time-summary");
    expect(screen.getByTestId("nav-contractors")).toHaveAttribute("href", "/contractors");
    expect(screen.getByTestId("nav-users")).toHaveAttribute("href", "/users");

    // クイックリンクカードの href 属性を確認
    expect(screen.getByTestId("link-attendance-history")).toHaveAttribute("href", "/attendance-history");
    expect(screen.getByTestId("link-labor-summary")).toHaveAttribute("href", "/labor-time-summary");
    expect(screen.getByTestId("link-contractors")).toHaveAttribute("href", "/contractors");
    expect(screen.getByTestId("link-users")).toHaveAttribute("href", "/users");
  });

  test("ログアウトボタンをクリックした時、セッションデータが破棄されログイン画面にリダイレクトされること", async () => {
    sessionStorage.setItem("user_id", "user-admin");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    vi.mocked(getAdminDashboardUseCase).mockResolvedValue({
      success: true,
      value: {
        summary: { total_workers: 10, clocked_in: 5, clocked_out: 2, absent: 3 },
        alerts: [],
      },
    });

    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const logoutBtn = screen.getByTestId("logout-button");
    fireEvent.click(logoutBtn);

    expect(sessionStorage.getItem("user_id")).toBeNull();
    expect(sessionStorage.getItem("role")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/admin-login");
  });
});