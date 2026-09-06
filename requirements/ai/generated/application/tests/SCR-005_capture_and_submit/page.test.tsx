import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import CaptureSubmitPage from "../../app/(contractor)/capture-submit/page";
import { useAttendanceStore } from "../../features/attendance/store/attendanceStore";
import { getUserMeUseCase } from "@/features/user/usecase/getUserMeUseCase";
import { submitPunchUseCase } from "@/features/attendance/usecase/submitPunchUseCase";

// navigationのモック (SCR-005-VL-003, SCR-005-EV-003, SCR-005-EV-005)
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: mockReplace,
    };
  },
}));

// UseCaseのモック (SCR-005-FN-004)
vi.mock("@/features/attendance/usecase/submitPunchUseCase", () => ({
  submitPunchUseCase: vi.fn(),
}));

// getUserMeのモック
vi.mock("@/features/user/usecase/getUserMeUseCase", () => ({
  getUserMeUseCase: vi.fn(),
}));

// Object URL と Canvas.toBlob のモック (SCR-005-FN-002, SCR-005-FN-005)
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

const mockStop = vi.fn();
const mockGetUserMedia = vi.fn().mockImplementation(() => Promise.resolve({
  getTracks: () => [
    {
      stop: mockStop,
    }
  ]
}));

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

describe("SCR-005_capture_and_submit 撮影・送信画面", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");
    sessionStorage.setItem("contractor_id", "contractor-1");

    useAttendanceStore.getState().setPunchType("CLOCK_IN");
    useAttendanceStore.getState().setSelectedWorkerIds(["worker-1", "worker-2"]);

    // toBlob のモック
    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback) => {
      callback(new Blob(["mock-image"], { type: "image/jpeg" }));
    });

    // getUserMeUseCase モックのデフォルト設定
    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: {
        userId: "user-1",
        contractorId: "contractor-1",
        role: "CONTRACTOR_MANAGER",
        displayName: "テスト管理者",
        status: "ACTIVE",
      }
    });

    // submitPunchUseCase モックのデフォルト設定
    vi.mocked(submitPunchUseCase).mockResolvedValue({
      success: true,
      value: { success: true, attendanceIds: ["record-1"] }
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    useAttendanceStore.getState().clear();
  });

  it("TST-SCR-005-001: 画面読み込み時にカメラを起動し、READY状態になること", async () => {
    render(<CaptureSubmitPage />);

    // ユーザー名が表示されること
    expect(await screen.findByTestId("user-display-name")).toHaveTextContent("テスト管理者 様");
    
    // カメラがREADYになり、撮影ボタンとビデオプレビューが表示されること
    await waitFor(() => {
      expect(screen.getByTestId("video-preview")).toBeInTheDocument();
      expect(screen.getByTestId("capture-button")).toBeInTheDocument();
    });
  });

  it("TST-SCR-005-002: 撮影ボタン押下でCAPTURED状態になり、プレビュー画像と送信・撮り直しボタンが表示されること", async () => {
    render(<CaptureSubmitPage />);

    // READYになるのを待つ
    const captureButton = await screen.findByTestId("capture-button");

    // 撮影
    fireEvent.click(captureButton);

    // プレビュー画像、撮り直しボタン、送信ボタンが表示されること
    await waitFor(() => {
      expect(screen.getByTestId("photo-preview")).toBeInTheDocument();
      expect(screen.getByTestId("retake-button")).toBeInTheDocument();
      expect(screen.getByTestId("submit-button")).toBeInTheDocument();
    });
  });

  it("TST-SCR-005-003: 撮影完了後の「撮り直し」ボタンのクリックでREADYに戻ること", async () => {
    render(<CaptureSubmitPage />);

    const captureButton = await screen.findByTestId("capture-button");
    fireEvent.click(captureButton);

    // CAPTUREDを待つ
    const retakeButton = await screen.findByTestId("retake-button");

    // 撮り直し
    fireEvent.click(retakeButton);

    // ビデオプレビューに戻ること
    await waitFor(() => {
      expect(screen.getByTestId("video-preview")).toBeInTheDocument();
      expect(screen.getByTestId("capture-button")).toBeInTheDocument();
    });
  });

  it("TST-SCR-005-004: 送信ボタン押下で打刻データが正常に保存され、完了画面へ遷移すること", async () => {
    render(<CaptureSubmitPage />);

    const captureButton = await screen.findByTestId("capture-button");
    fireEvent.click(captureButton);

    const submitButton = await screen.findByTestId("submit-button");
    fireEvent.click(submitButton);

    // 完了画面 (/punch-complete) に遷移されること
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/punch-complete"));
    });
  });

  it("TST-SCR-005-007: カメラへのアクセス権限が拒否された場合、エラーメッセージが表示されること", async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error("Permission denied"));

    render(<CaptureSubmitPage />);

    await waitFor(() => {
      expect(screen.getByTestId("camera-error")).toBeInTheDocument();
      expect(screen.getByText("カメラの利用権限を許可してください。")).toBeInTheDocument();
    });
  });

  it("TST-SCR-005-008: 未認証ユーザーがアクセスした際、ログイン画面へリダイレクトされること", async () => {
    sessionStorage.clear();

    render(<CaptureSubmitPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("TST-SCR-005-010: 戻るボタンをクリックした際、カメラが正常に停止され、前画面へ遷移すること", async () => {
    render(<CaptureSubmitPage />);

    // READYになるのを待つ
    await waitFor(() => {
      expect(screen.getByTestId("video-preview")).toBeInTheDocument();
    });

    const backButton = await screen.findByTestId("back-button");
    fireEvent.click(backButton);

    expect(mockStop).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/worker-select");
  });
});