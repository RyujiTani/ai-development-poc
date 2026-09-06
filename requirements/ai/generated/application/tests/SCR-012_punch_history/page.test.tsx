import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AttendanceHistoryPage from "@/app/(factory)/attendance-history/page";

// Next.js routerモック
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

// ユースケースのモック
const mockGetAdminAttendanceHistory = vi.fn();
const mockGetPhotoBlob = vi.fn();
const mockGetContractors = vi.fn();
const mockSubmitPunchCorrection = vi.fn();

vi.mock("@/features/attendance/usecase/getAdminAttendanceHistoryUseCase", () => ({
  getAdminAttendanceHistoryUseCase: (args: any) => mockGetAdminAttendanceHistory(args),
}));

vi.mock("@/features/attendance/usecase/getPhotoBlobUseCase", () => ({
  getPhotoBlobUseCase: (id: string) => mockGetPhotoBlob(id),
}));

vi.mock("@/features/attendance/usecase/getContractorsUseCase", () => ({
  getContractorsUseCase: () => mockGetContractors(),
}));

vi.mock("@/features/attendance/usecase/submitPunchCorrectionUseCase", () => ({
  submitPunchCorrectionUseCase: (args: any) => mockSubmitPunchCorrection(args),
}));

describe("SCR-012 打刻履歴確認画面", () => {
  const dummyPunches = [
    {
      attendance_id: "punch-1",
      worker_id: "worker-1",
      worker_name: "田中 太郎",
      contractor_id: "contractor-1",
      contractor_name: "外注A社",
      punch_type: "CLOCK_IN" as const,
      clocked_at: "2026-04-13T08:00:00Z",
      photo_object_id: "photo-1",
    },
    {
      attendance_id: "punch-2",
      worker_id: "worker-2",
      worker_name: "鈴木 一郎",
      contractor_id: "contractor-2",
      contractor_name: "外注B社",
      punch_type: "CLOCK_OUT" as const,
      clocked_at: "2026-04-13T17:00:00Z",
      photo_object_id: "photo-2",
    },
  ];

  const dummyContractors = [
    { contractor_id: "contractor-1", name: "外注A社", status: "ACTIVE" as const },
    { contractor_id: "contractor-2", name: "外注B社", status: "ACTIVE" as const },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // URL関連モック
    window.URL.createObjectURL = vi.fn(() => "blob:http://localhost/dummy-url");
    window.URL.revokeObjectURL = vi.fn();

    // デスクトップ表示設定用
    window.alert = vi.fn();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("SCR-012-VL-003: 未認証またはFACTORY_ADMIN以外のとき、/admin-loginへリダイレクトされること", async () => {
    // セッションを空にする
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("role");

    render(<AttendanceHistoryPage />);

    expect(mockReplace).toHaveBeenCalledWith("/admin-login");
  });

  it("SCR-012-AC-001: 工場管理者で認証されているとき、打刻履歴一覧が正常に表示されること", async () => {
    sessionStorage.setItem("user_id", "admin-user");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    mockGetContractors.mockResolvedValue({ success: true, value: dummyContractors });
    mockGetAdminAttendanceHistory.mockResolvedValue({
      success: true,
      value: { punches: dummyPunches, total_count: 2 },
    });
    mockGetPhotoBlob.mockResolvedValue({ success: true, value: new Blob() });

    render(<AttendanceHistoryPage />);

    // ロード完了待機 (テスト内でFound multiple elementsエラーを回避するため、一意 of data-testidを指定して検証)
    await waitFor(() => {
      expect(screen.getByTestId("worker-name-punch-1")).toHaveTextContent("田中 太郎");
      expect(screen.getByTestId("worker-name-punch-2")).toHaveTextContent("鈴木 一郎");
    });

    expect(screen.getByTestId("contractor-name-punch-1")).toHaveTextContent("外注A社");
    expect(screen.getByTestId("contractor-name-punch-2")).toHaveTextContent("外注B社");
    expect(screen.getByTestId("filter-date-input")).toBeInTheDocument();
  });

  it("SCR-012-UT-001: 打刻修正時、修正理由が未入力の場合にバリデーションエラーが発生すること", async () => {
    sessionStorage.setItem("user_id", "admin-user");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    mockGetContractors.mockResolvedValue({ success: true, value: dummyContractors });
    mockGetAdminAttendanceHistory.mockResolvedValue({
      success: true,
      value: { punches: dummyPunches, total_count: 2 },
    });
    mockGetPhotoBlob.mockResolvedValue({ success: true, value: new Blob() });

    render(<AttendanceHistoryPage />);

    // ロード完了 (複数マッチエラーを避けるためgetByTestIdを使用)
    await screen.findByTestId("worker-name-punch-1");

    // 最初の修正ボタンをクリックしてダイアログを開く
    const editButton = screen.getByTestId("edit-button-punch-1");
    fireEvent.click(editButton);

    // モーダル表示確認
    expect(screen.getByTestId("correction-modal")).toBeInTheDocument();

    // 修正理由を空のまま「保存」
    const submitBtn = screen.getByTestId("submit-correction-button");
    fireEvent.click(submitBtn);

    // バリデーションエラーが表示されること
    await waitFor(() => {
      expect(screen.getByText("修正理由は必須入力です")).toBeInTheDocument();
    });

    expect(mockSubmitPunchCorrection).not.toHaveBeenCalled();
  });

  it("SCR-012-UT-002: サムネイル画像をクリックすると拡大モーダルが表示され、モーダルを閉じたときにURL.revokeObjectURLが呼ばれること", async () => {
    sessionStorage.setItem("user_id", "admin-user");
    sessionStorage.setItem("role", "FACTORY_ADMIN");

    mockGetContractors.mockResolvedValue({ success: true, value: dummyContractors });
    mockGetAdminAttendanceHistory.mockResolvedValue({
      success: true,
      value: { punches: [dummyPunches[0]], total_count: 1 },
    });
    mockGetPhotoBlob.mockResolvedValue({ success: true, value: new Blob() });

    render(<AttendanceHistoryPage />);

    // サムネイル画像のロードを待機 (PC用・スマホ用に同一のdata-testidが生成されるためfindAllByTestIdを使用)
    const thumbnails = await screen.findAllByTestId("thumbnail-image");
    const thumbnail = thumbnails[0];
    
    // サムネイルクリック
    fireEvent.click(thumbnail);

    // 拡大モーダル表示
    const modal = screen.getByTestId("photo-modal");
    expect(modal).toBeInTheDocument();

    // 閉じるボタン押下
    const closeBtn = screen.getByTestId("close-modal-button");
    fireEvent.click(closeBtn);

    // モーダルが閉じたことを確認
    await waitFor(() => {
      expect(screen.queryByTestId("photo-modal")).not.toBeInTheDocument();
    });

    // revokeObjectURLが呼び出されていることを検証 (アンマウント時に必ずクリーンアップされる)
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();
  });
});