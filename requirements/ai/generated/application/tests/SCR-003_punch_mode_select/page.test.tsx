import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PunchModeSelectPage from "@/app/(contractor)/punch-mode/page";
import { useAttendanceStore } from "@/features/attendance/store/useAttendanceStore";

// next/navigation のモック
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

describe("PunchModeSelectPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockClear();
    // sessionStorageのモック化
    const store: Record<string, string> = {};
    const mockSessionStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key in store) {
          delete store[key];
        }
      },
    };
    Object.defineProperty(window, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("TST-SCR-003-VL-001: ログイン状態にない（sessionStorageが空）の場合に/loginへ強制リダイレクトされること", async () => {
    window.sessionStorage.clear();

    render(<PunchModeSelectPage />);

    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("TST-SCR-003-VL-001: roleがCONTRACTOR_MANAGERではない場合に/loginへ強制リダイレクトされること", async () => {
    window.sessionStorage.setItem("user_id", "user-1");
    window.sessionStorage.setItem("role", "FACTORY_ADMIN"); // 異なるロール

    render(<PunchModeSelectPage />);

    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("TST-SCR-003-FN-001: 出勤ボタンを押下すると打刻モードがCLOCK_INに更新され、/workers-selectへ遷移すること", async () => {
    window.sessionStorage.setItem("user_id", "user-1");
    window.sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<PunchModeSelectPage />);

    const clockInBtn = screen.getByTestId("clock-in-btn");
    fireEvent.click(clockInBtn);

    // Zustandの状態確認
    const state = useAttendanceStore.getState();
    expect(state.punchMode).toBe("CLOCK_IN");

    // 遷移先の確認
    expect(mockPush).toHaveBeenCalledWith("/worker-select");
  });

  it("TST-SCR-003-FN-002: 退勤ボタンを押下すると打刻モードがCLOCK_OUTに更新され、/workers-selectへ遷移すること", async () => {
    window.sessionStorage.setItem("user_id", "user-1");
    window.sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<PunchModeSelectPage />);

    const clockOutBtn = screen.getByTestId("clock-out-btn");
    fireEvent.click(clockOutBtn);

    // Zustandの状態確認
    const state = useAttendanceStore.getState();
    expect(state.punchMode).toBe("CLOCK_OUT");

    // 遷移先の確認
    expect(mockPush).toHaveBeenCalledWith("/worker-select");
  });

  it("TST-SCR-003-UI-003: システムの現在日時が正しいフォーマットで表示されること", async () => {
    window.sessionStorage.setItem("user_id", "user-1");
    window.sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    // モック日時を日本時間 2026-04-13T10:00:00 に設定
    const mockDate = new Date("2026-04-13T10:00:00+09:00");
    vi.setSystemTime(mockDate);

    render(<PunchModeSelectPage />);

    // ハイドレーション後のuseEffectでcurrentTimeが設定されるのを再現するためタイマーを進める
    act(() => {
      vi.advanceTimersByTime(0);
    });

    const timeDisplay = screen.getByTestId("current-time");
    expect(timeDisplay.textContent).toContain("2026年04月13日");
    expect(timeDisplay.textContent).toContain("10:00:00");
    expect(timeDisplay.textContent).toContain("(月)");
  });

  it("戻るボタンを押下すると /home へ遷移すること", async () => {
    window.sessionStorage.setItem("user_id", "user-1");
    window.sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<PunchModeSelectPage />);

    const backBtn = screen.getByLabelText("戻る");
    fireEvent.click(backBtn);

    expect(mockPush).toHaveBeenCalledWith("/home");
  });
});