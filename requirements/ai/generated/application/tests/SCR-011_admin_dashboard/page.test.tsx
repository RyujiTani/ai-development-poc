import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";
import DashboardPage from "@/app/(factory)/dashboard/page";

// Next.js の useRouter のモック（安定した同一オブジェクトを返すことで再レンダーループを防ぐ）
const pushMock = vi.fn();
const replaceMock = vi.fn();
const mockRouter = {
  push: pushMock,
  replace: replaceMock,
};
vi.mock("next/navigation", () => ({
  useRouter() {
    return mockRouter;
  },
}));

// mock fetch
const fetchMock = vi.fn();
globalThis.fetch = fetchMock as any;

describe("SCR-011_admin_dashboard - 総合ダッシュボードのテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // sessionStorageのモック
    const store: Record<string, string> = {};
    const sessionStorageMock = {
      getItem(key: string) {
        return store[key] || null;
      },
      setItem(key: string, value: string) {
        store[key] = value.toString();
      },
      removeItem(key: string) {
        delete store[key];
      },
      clear() {
        for (const key in store) {
          delete store[key];
        }
      },
    };
    Object.defineProperty(globalThis, "sessionStorage", {
      value: sessionStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("SCR-011-VL-001: 未認証時に /admin-login へリダイレクトされること", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/admin-login");
    });
  });

  test("SCR-011-VL-001: FACTORY_ADMIN 以外のロールの場合に /admin-login へリダイレクトされること", async () => {
    sessionStorage.setItem("user_id", "test-user");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<DashboardPage />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/admin-login");
    });
  });

  test("SCR-011-FN-001: ログイン成功後の初回描画時に API が実行され、取得した稼働人数サマリーが正しく表示されること", async () => {
    sessionStorage.setItem("user_id", "admin-1");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    const mockDashboardData = {
      summary: {
        working_workers_count: 24,
        active_contractors_count: 2,
        total_workers_registered: 45,
      },
      alerts: [
        {
          alert_id: "ALT-001",
          type: "MISSING_CLOCK_OUT",
          message: "山田 太郎（A社）の退刻打刻がありません。",
          severity: "WARNING",
          occurred_at: "2026-04-13T18:00:00+09:00",
        },
      ],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("working-workers-count")).toHaveTextContent("24");
      expect(screen.getByTestId("active-contractors-count")).toHaveTextContent("2");
      expect(screen.getByTestId("total-workers-registered")).toHaveTextContent("45");
    });
  });

  test("SCR-011-FN-002: APIから返却された直近アラート配列データが正しく表示されること", async () => {
    sessionStorage.setItem("user_id", "admin-1");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    const mockDashboardData = {
      summary: {
        working_workers_count: 24,
        active_contractors_count: 2,
        total_workers_registered: 45,
      },
      alerts: [
        {
          alert_id: "ALT-001",
          type: "MISSING_CLOCK_OUT",
          message: "山田 太郎（A社）の退刻打刻がありません。",
          severity: "WARNING",
          occurred_at: "2026-04-13T18:00:00+09:00",
        },
      ],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("alert-message-ALT-001")).toHaveTextContent("山田 太郎（A社）の退刻打刻がありません。");
    });
  });

  test("SCR-011-FN-004: ログアウト操作が正しく機能すること", async () => {
    sessionStorage.setItem("user_id", "admin-1");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    const mockDashboardData = {
      summary: {
        working_workers_count: 24,
        active_contractors_count: 2,
        total_workers_registered: 45,
      },
      alerts: [],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("logout-btn")).toBeInTheDocument();
    });

    const logoutBtn = screen.getByTestId("logout-btn");
    fireEvent.click(logoutBtn);

    expect(sessionStorage.getItem("user_id")).toBeNull();
    expect(sessionStorage.getItem("role")).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/admin-login");
  });
});