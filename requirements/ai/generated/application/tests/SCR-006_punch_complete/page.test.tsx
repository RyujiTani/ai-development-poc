import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import "@testing-library/jest-dom";
import PunchCompletePage from "@/app/(contractor)/punch-complete/page";
import { useAttendanceStore } from "@/features/attendance/store/useAttendanceStore";

// next/navigation のモック化
const mockPush = vi.fn();
const mockGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

// sessionStorage のモック化
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(globalThis, "sessionStorage", {
  value: storageMock,
});

describe("PunchCompletePage (SCR-006)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Zustandストアのリセット
    useAttendanceStore.setState({
      punchMode: null,
      selectedWorkerIds: [],
    });
  });

  it("TEST-SCR-006-001: should display completion message, mode '出勤', and worker count '3'", async () => {
    // 1. mock authentication session
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    // 2. query parameters setup
    mockGet.mockImplementation((key: string) => {
      if (key === "mode") return "CLOCK_IN";
      if (key === "count") return "3";
      return null;
    });

    // 3. render component
    render(<PunchCompletePage />);

    // 4. verify screen elements in center and content values
    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("complete-title")).toHaveTextContent("打刻データを送信しました");
    expect(screen.getByTestId("display-mode")).toHaveTextContent("出勤");
    expect(screen.getByTestId("display-count")).toHaveTextContent("3名");
  });

  it("TEST-SCR-006-002: should navigate to home and clear store when clicking 'ホームへ戻る'", async () => {
    // 1. mock authentication session
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");
    useAttendanceStore.setState({
      punchMode: "CLOCK_OUT",
      selectedWorkerIds: ["worker-1", "worker-2"],
    });

    mockGet.mockImplementation((key: string) => {
      if (key === "mode") return "CLOCK_OUT";
      if (key === "count") return "2";
      return null;
    });

    // 2. render component
    render(<PunchCompletePage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    // 3. click action
    const homeBtn = screen.getByTestId("back-to-home-btn");
    fireEvent.click(homeBtn);

    // 4. assert routing to SCR-002 and state clearing
    expect(mockPush).toHaveBeenCalledWith("/home");
    expect(useAttendanceStore.getState().punchMode).toBeNull();
    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual([]);
  });

  it("TEST-SCR-006-003: should redirect to login if unauthorized", async () => {
    // 1. clear session (simulating no session)
    sessionStorage.clear();

    // 2. render component
    render(<PunchCompletePage />);

    // 3. assert automatic redirect occurs
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});