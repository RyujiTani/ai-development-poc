import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, expect, it, describe, beforeEach } from "vitest";
import PunchCorrectionPage from "@/app/(contractor)/punch-correction/page";
import { getUserMeUseCase } from "@/features/user/usecase/getUserMeUseCase";
import { getWorkersUseCase } from "@/features/worker/usecase/getWorkersUseCase";
import { getAttendanceRecordsUseCase } from "@/features/attendance/usecase/getAttendanceRecordsUseCase";
import { submitPunchCorrectionUseCase } from "@/features/attendance/usecase/submitPunchCorrectionUseCase";

// Next.js ナビゲーションのモック
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockGetParam = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: mockGetParam,
  }),
}));

// UseCaseのモック登録
vi.mock("@/features/user/usecase/getUserMeUseCase", () => ({
  getUserMeUseCase: vi.fn(),
}));

vi.mock("@/features/worker/usecase/getWorkersUseCase", () => ({
  getWorkersUseCase: vi.fn(),
}));

vi.mock("@/features/attendance/usecase/getAttendanceRecordsUseCase", () => ({
  getAttendanceRecordsUseCase: vi.fn(),
}));

vi.mock("@/features/attendance/usecase/getAttendanceRecordByIdUseCase", () => ({
  getAttendanceRecordByIdUseCase: vi.fn(),
}));

vi.mock("@/features/attendance/usecase/submitPunchCorrectionUseCase", () => ({
  submitPunchCorrectionUseCase: vi.fn(),
}));

describe("SCR-009 Contractor Punch Correction Screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // モックのデフォルト成功レスポンス
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

    vi.mocked(getWorkersUseCase).mockResolvedValue({
      success: true,
      value: [
        {
          worker_id: "worker-1",
          contractor_id: "contractor-1",
          name: "テスト作業員",
          qualifications: [],
          trainings: [],
          status: "ACTIVE",
          created_at: "",
          updated_at: "",
        },
      ],
    });

    vi.mocked(getAttendanceRecordsUseCase).mockResolvedValue({
      success: true,
      value: [],
    });
  });

  it("TST-009-006: sessionStorageに認証セッションがない未ログイン状態", async () => {
    // 認証情報なし
    render(<PunchCorrectionPage />);

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("TST-009-001: 修正理由が空文字列状態", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<PunchCorrectionPage />);

    // 読み込み完了を待つ
    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).toBeNull();
    });

    // 作業員、日時、打刻種別を入力、修正理由を空にして送信ボタンを押下
    fireEvent.change(screen.getByTestId("worker-id-select"), { target: { value: "worker-1" } });
    fireEvent.change(screen.getByTestId("punched-at-input"), { target: { value: "2026-04-13T08:00" } });
    fireEvent.click(screen.getByTestId("punch-type-in"));

    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("reason-error")).toBeDefined();
      expect(screen.getByTestId("reason-error").textContent).toContain("修正理由を入力してください");
    });

    expect(submitPunchCorrectionUseCase).not.toHaveBeenCalled();
  });

  it("TST-009-002: 作業員が未選択（初期選択状態など）", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<PunchCorrectionPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).toBeNull();
    });

    // 作業員未選択、他は入力
    fireEvent.change(screen.getByTestId("punched-at-input"), { target: { value: "2026-04-13T08:00" } });
    fireEvent.change(screen.getByTestId("reason-input"), { target: { value: "打刻漏れ手動登録" } });

    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("worker-id-error")).toBeDefined();
      expect(screen.getByTestId("worker-id-error").textContent).toContain("作業員を選択してください");
    });

    expect(submitPunchCorrectionUseCase).not.toHaveBeenCalled();
  });

  it("TST-009-003: 日時が未入力", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<PunchCorrectionPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).toBeNull();
    });

    // 日時のみ未入力
    fireEvent.change(screen.getByTestId("worker-id-select"), { target: { value: "worker-1" } });
    fireEvent.change(screen.getByTestId("reason-input"), { target: { value: "打刻漏れ手動登録" } });

    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("punched-at-error")).toBeDefined();
      expect(screen.getByTestId("punched-at-error").textContent).toContain("日時を入力してください");
    });

    expect(submitPunchCorrectionUseCase).not.toHaveBeenCalled();
  });

  it("TST-009-004: すべての必須項目への正しい入力値（新規登録モード）", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");
    sessionStorage.setItem("contractor_id", "contractor-1");

    vi.mocked(submitPunchCorrectionUseCase).mockResolvedValue({
      success: true,
      value: {
        success: true,
        correctionId: "corr-1",
      },
    });

    render(<PunchCorrectionPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).toBeNull();
    });

    fireEvent.change(screen.getByTestId("worker-id-select"), { target: { value: "worker-1" } });
    fireEvent.change(screen.getByTestId("punched-at-input"), { target: { value: "2026-04-13T08:00" } });
    fireEvent.click(screen.getByTestId("punch-type-in"));
    fireEvent.change(screen.getByTestId("reason-input"), { target: { value: "打刻漏れの手動登録" } });

    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(submitPunchCorrectionUseCase).toHaveBeenCalledWith({
        workerId: "worker-1",
        contractorId: "contractor-1",
        punchType: "CLOCK_IN",
        punchedAt: new Date("2026-04-13T08:00").toISOString(),
        reason: "打刻漏れの手動登録",
        correctedBy: "user-1",
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("TST-009-005: キャンセルボタンのクリック", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    render(<PunchCorrectionPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).toBeNull();
    });

    fireEvent.click(screen.getByTestId("cancel-button"));

    expect(mockPush).toHaveBeenCalledWith("/");
  });
});