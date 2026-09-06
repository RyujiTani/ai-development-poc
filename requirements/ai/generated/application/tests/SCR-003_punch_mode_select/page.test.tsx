import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import PunchModeSelectPage from "@/app/(contractor)/punch-mode/page";
import { useAttendanceStore } from "@/features/attendance/store/attendanceStore";
import { getUserMeUseCase } from "@/features/user/usecase/getUserMeUseCase";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock getUserMeUseCase
vi.mock("@/features/user/usecase/getUserMeUseCase", () => ({
  getUserMeUseCase: vi.fn(),
}));

describe("SCR-003 打刻モード選択画面", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useAttendanceStore.getState().clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("TS-SCR-003-001: 出勤ボタンコンポーネントが正しく表示されていること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "外注先管理者 A",
        status: "ACTIVE",
      },
    });

    render(<PunchModeSelectPage />);

    // 読み込み待ち
    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const clockInButton = screen.getByTestId("clock-in-button");
    expect(clockInButton).toBeInTheDocument();
    expect(clockInButton).toHaveTextContent("出勤");
    expect(clockInButton).not.toBeDisabled();
  });

  it("TS-SCR-003-002: 退勤ボタンコンポーネントが正しく表示されていること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "外注先管理者 A",
        status: "ACTIVE",
      },
    });

    render(<PunchModeSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const clockOutButton = screen.getByTestId("clock-out-button");
    expect(clockOutButton).toBeInTheDocument();
    expect(clockOutButton).toHaveTextContent("退勤");
    expect(clockOutButton).not.toBeDisabled();
  });

  it("TS-SCR-003-003: ボタンが屋外操作を考慮した大型タップサイズを満たすスタイルであること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "外注先管理者 A",
        status: "ACTIVE",
      },
    });

    render(<PunchModeSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const clockInButton = screen.getByTestId("clock-in-button");
    const clockOutButton = screen.getByTestId("clock-out-button");

    expect(clockInButton.className).toContain("py-8");
    expect(clockOutButton.className).toContain("py-8");
  });

  it("TS-SCR-003-004: 現在日時が正しく表示されていること", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:00:00"));

    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "外注先管理者 A",
        status: "ACTIVE",
      },
    });

    render(<PunchModeSelectPage />);

    // Promise の非同期解決を進める
    await vi.advanceTimersByTimeAsync(0);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const currentTimeElement = screen.getByTestId("current-time");
    expect(currentTimeElement.textContent).toContain("2026/04/13");
    expect(currentTimeElement.textContent).toContain("10:00");
  });

  it("TS-SCR-003-005: 未認証状態でアクセスした場合にログイン画面へリダイレクトされること", async () => {
    render(<PunchModeSelectPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("TS-SCR-003-006: 出勤ボタンクリック時に状態が保持され、作業員選択画面へ遷移すること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "外注先管理者 A",
        status: "ACTIVE",
      },
    });

    render(<PunchModeSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const clockInButton = screen.getByTestId("clock-in-button");
    fireEvent.click(clockInButton);

    expect(useAttendanceStore.getState().punchType).toBe("CLOCK_IN");
    expect(mockPush).toHaveBeenCalledWith("/worker-select");
  });

  it("TS-SCR-003-007: 退勤ボタンクリック時に状態が保持され、作業員選択画面へ遷移すること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "外注先管理者 A",
        status: "ACTIVE",
      },
    });

    render(<PunchModeSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const clockOutButton = screen.getByTestId("clock-out-button");
    fireEvent.click(clockOutButton);

    expect(useAttendanceStore.getState().punchType).toBe("CLOCK_OUT");
    expect(mockPush).toHaveBeenCalledWith("/worker-select");
  });

  it("TS-SCR-003-008: 戻るボタンクリック時に外注先ホーム画面へ遷移すること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "外注先管理者 A",
        status: "ACTIVE",
      },
    });

    render(<PunchModeSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const backButton = screen.getByTestId("back-button");
    fireEvent.click(backButton);

    expect(mockPush).toHaveBeenCalledWith("/");
  });
});