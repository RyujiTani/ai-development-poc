import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import CapturePage from "@/app/(contractor)/attendance/capture/page";
import { useAttendanceStore } from "@/features/attendance/store/useAttendanceStore";
import { saveAttendanceAndPhoto } from "@/features/attendance/repository/attendanceRepository";
import { compressImage } from "@/features/attendance/utils/imageCompressor";

// next/navigation のモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// repository のモック
vi.mock("@/features/attendance/repository/attendanceRepository", () => ({
  saveAttendanceAndPhoto: vi.fn(),
}));

const mockSessionStorage: Record<string, string> = {
  user_id: "user-1",
  role: "CONTRACTOR_MANAGER",
  contractor_id: "contractor-1",
};

describe("SCR-005_capture_and_submit Page Tests", () => {
  beforeEach(() => {
    // 毎回セッションストレージのモックデータを初期値にリセット
    mockSessionStorage.user_id = "user-1";
    mockSessionStorage.role = "CONTRACTOR_MANAGER";
    mockSessionStorage.contractor_id = "contractor-1";

    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => mockSessionStorage[key] || null,
      setItem: (key: string, val: string) => { mockSessionStorage[key] = val; },
      removeItem: (key: string) => { delete mockSessionStorage[key]; },
      clear: () => { Object.keys(mockSessionStorage).forEach(k => delete mockSessionStorage[k]); }
    });

    const mockStream = {
      getTracks: () => [
        {
          stop: vi.fn(),
        },
      ],
    };

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    // Object URL のモック
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:mock-url"),
      revokeObjectURL: vi.fn(),
    });

    // Canvas のモック
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    });

    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback) => {
      callback(new Blob(["mock-image"], { type: "image/jpeg" }));
    });

    // Video 属性モック
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { value: 1280, configurable: true });
    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { value: 720, configurable: true });

    mockPush.mockClear();
    vi.mocked(saveAttendanceAndPhoto).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TST-SCR-005-001: カメラ権限が許可されている場合、カメラが自動起動して video 要素が表示されること", async () => {
    useAttendanceStore.setState({
      punchMode: "CLOCK_IN",
      selectedWorkerIds: ["worker-1", "worker-2"],
    });

    render(<CapturePage />);

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
    });
  });

  it("TST-SCR-005-002 & 013: 撮影ボタンを押下すると静静画がキャプチャされ、プレビューが表示されること", async () => {
    useAttendanceStore.setState({
      punchMode: "CLOCK_IN",
      selectedWorkerIds: ["worker-1"],
    });

    render(<CapturePage />);

    const captureBtn = await screen.findByTestId("capture-btn");
    fireEvent.click(captureBtn);

    const previewImg = await screen.findByTestId("preview-image");
    expect(previewImg).toBeInTheDocument();
    expect(previewImg).toHaveAttribute("src", "blob:mock-url");
  });

  it("TST-SCR-005-003 & 014: 撮り直しボタンを押下すると、一時データが破棄され、ストリームが再度初期化されること", async () => {
    useAttendanceStore.setState({
      punchMode: "CLOCK_IN",
      selectedWorkerIds: ["worker-1"],
    });

    render(<CapturePage />);

    const captureBtn = await screen.findByTestId("capture-btn");
    fireEvent.click(captureBtn);

    const retakeBtn = await screen.findByTestId("retake-btn");
    fireEvent.click(retakeBtn);

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
    });
  });

  it("TST-SCR-005-004: 送信ボタンを押下すると打刻保存リポジトリが実行されて完了画面へ遷移すること", async () => {
    useAttendanceStore.setState({
      punchMode: "CLOCK_IN",
      selectedWorkerIds: ["worker-1", "worker-2"],
    });

    render(<CapturePage />);

    const captureBtn = await screen.findByTestId("capture-btn");
    fireEvent.click(captureBtn);

    // プレビュー画像が表示される（非同期処理完了）のを待つ
    const previewImg = await screen.findByTestId("preview-image");
    expect(previewImg).toBeInTheDocument();

    // 活性化された送信ボタンをクリック
    const submitBtn = await screen.findByRole("button", { name: "打刻データを送信する" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(saveAttendanceAndPhoto).toHaveBeenCalledWith(
        ["worker-1", "worker-2"],
        "contractor-1",
        "CLOCK_IN",
        expect.any(Blob),
        "user-1"
      );
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/punch-complete"));
    });
  });

  it("TST-SCR-005-008: 画面ヘッダー部分に選択中の打刻モードと対象作業員数が表示されていること", async () => {
    useAttendanceStore.setState({
      punchMode: "CLOCK_OUT",
      selectedWorkerIds: ["worker-1", "worker-2", "worker-3"],
    });

    render(<CapturePage />);

    const header = await screen.findByTestId("summary-header");
    expect(header).toHaveTextContent("退勤モード | 対象作業員: 3名");
  });

  it("TST-SCR-005-010: 写真未撮影状態では、送信ボタンがdisabledであること", async () => {
    useAttendanceStore.setState({
      punchMode: "CLOCK_IN",
      selectedWorkerIds: ["worker-1"],
    });

    render(<CapturePage />);

    const submitBtn = await screen.findByTestId("submit-btn");
    expect(submitBtn).toBeDisabled();
  });

  it("TST-SCR-005-011: カメラの利用権限がない場合に警告メッセージが表示されること", async () => {
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error("NotAllowedError"));

    useAttendanceStore.setState({
      punchMode: "CLOCK_IN",
      selectedWorkerIds: ["worker-1"],
    });

    render(<CapturePage />);

    const errorMsg = await screen.findByTestId("camera-error");
    expect(errorMsg).toHaveTextContent("カメラの起動に失敗しました。設定でカメラのアクセス権限を確認してください。");
  });

  it("TST-SCR-005-012: 未認証状態でアクセスした場合、ログイン画面へ即座にリダイレクトされること", async () => {
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("role");

    useAttendanceStore.setState({
      punchMode: "CLOCK_IN",
      selectedWorkerIds: ["worker-1"],
    });

    render(<CapturePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("TST-SCR-005-016: 送信エラーが発生した場合、エラーメッセージが発生し画面遷移しないこと", async () => {
    vi.mocked(saveAttendanceAndPhoto).mockRejectedValue(new Error("IndexedDB write error"));

    useAttendanceStore.setState({
      punchMode: "CLOCK_IN",
      selectedWorkerIds: ["worker-1"],
    });

    render(<CapturePage />);

    const captureBtn = await screen.findByTestId("capture-btn");
    fireEvent.click(captureBtn);

    // プレビュー画像が表示される（非同期処理完了）のを待つ
    const previewImg = await screen.findByTestId("preview-image");
    expect(previewImg).toBeInTheDocument();

    const submitBtn = await screen.findByRole("button", { name: "打刻データを送信する" });
    fireEvent.click(submitBtn);

    const toastMsg = await screen.findByTestId("toast-message");
    expect(toastMsg).toHaveTextContent("打刻データの送信に失敗しました。");
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining("/punch-complete"));
  });

  it("TST-SCR-005-017: 戻るボタンを押下した際、作業員選択画面へ遷移すること", async () => {
    useAttendanceStore.setState({
      punchMode: "CLOCK_IN",
      selectedWorkerIds: ["worker-1"],
    });

    render(<CapturePage />);

    const backBtn = await screen.findByRole("button", { name: "戻る" });
    fireEvent.click(backBtn);

    expect(mockPush).toHaveBeenCalledWith("/worker-select");
  });

  it("TST-SCR-005-005 & 019: 画像圧縮処理がJPEG品質0.7で実行されることを検証する", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;

    const toBlobSpy = vi.spyOn(HTMLCanvasElement.prototype, "toBlob");

    await compressImage(canvas);

    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.7);
  });
});