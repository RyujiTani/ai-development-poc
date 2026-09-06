import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import WorkerListPage from "@/app/(contractor)/workers/page";
import { getUserMeUseCase } from "@/features/user/usecase/getUserMeUseCase";
import { getWorkersUseCase } from "@/features/worker/usecase/getWorkersUseCase";
import { deleteWorkerUseCase } from "@/features/worker/usecase/deleteWorkerUseCase";

// Next.jsのrouterをモック
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: mockReplace,
};
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// UseCaseをモック
vi.mock("@/features/user/usecase/getUserMeUseCase", () => ({
  getUserMeUseCase: vi.fn(),
}));

vi.mock("@/features/worker/usecase/getWorkersUseCase", () => ({
  getWorkersUseCase: vi.fn(),
}));

vi.mock("@/features/worker/usecase/deleteWorkerUseCase", () => ({
  deleteWorkerUseCase: vi.fn(),
}));

describe("SCR-007 WorkerListPage", () => {
  const mockUser = {
    userId: "user-1",
    contractorId: "contractor-1",
    role: "CONTRACTOR_MANAGER" as const,
    displayName: "外注先管理者 A",
    status: "ACTIVE" as const,
  };

  const mockWorkers = [
    {
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      name: "田中 太郎",
      contact: "090-1234-5678",
      qualifications: ["QUAL_001"],
      trainings: [{ code: "TRN_001", taken_at: "2026-01-10" }],
      status: "ACTIVE" as const,
      created_at: "2026-04-13T00:00:00Z",
      updated_at: "2026-04-13T00:00:00Z",
    },
    {
      worker_id: "worker-2",
      contractor_id: "contractor-1",
      name: "鈴木 次郎",
      contact: "090-8765-4321",
      qualifications: [],
      trainings: [],
      status: "ACTIVE" as const,
      created_at: "2026-04-13T00:00:00Z",
      updated_at: "2026-04-13T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("TST-007-001: ログイン中外注先管理者に所属する作業員のみが一覧表示されること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: mockUser,
    });

    vi.mocked(getWorkersUseCase).mockResolvedValue({
      success: true,
      value: mockWorkers,
    });

    render(<WorkerListPage />);

    // ローディングが消えるのを待つ
    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).toBeNull();
    });

    // ヘッダーにログインユーザー名表示確認
    expect(screen.getByTestId("user-display-name")).toHaveTextContent("外注先管理者 A 様");

    // 自社所属作業員の表示確認
    expect(screen.getByTestId("worker-name-worker-1")).toHaveTextContent("田中 太郎");
    expect(screen.getByTestId("worker-contact-worker-1")).toHaveTextContent("090-1234-5678");
    expect(screen.getByTestId("worker-qualification-worker-1")).toHaveTextContent("有資格者（足場）");
    expect(screen.getByTestId("worker-training-worker-1")).toHaveTextContent("特別安全講習 (2026-01-10)");

    expect(screen.getByTestId("worker-name-worker-2")).toHaveTextContent("鈴木 次郎");
  });

  it("TST-007-002: 「新規追加」ボタンから追加画面へ遷移すること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({ success: true, value: mockUser });
    vi.mocked(getWorkersUseCase).mockResolvedValue({ success: true, value: mockWorkers });

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).toBeNull();
    });

    const addButton = screen.getByTestId("add-worker-button");
    fireEvent.click(addButton);

    expect(mockPush).toHaveBeenCalledWith("/workers/new");
  });

  it("TST-007-003: 「編集」ボタンから編集画面へ遷移すること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({ success: true, value: mockUser });
    vi.mocked(getWorkersUseCase).mockResolvedValue({ success: true, value: mockWorkers });

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).toBeNull();
    });

    const editButton = screen.getByTestId("edit-button-worker-1");
    fireEvent.click(editButton);

    expect(mockPush).toHaveBeenCalledWith("/workers/worker-1/edit");
  });

  it("TST-007-004: 削除操作時に確認ダイアログが表示され、キャンセル時は削除されないこと", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({ success: true, value: mockUser });
    vi.mocked(getWorkersUseCase).mockResolvedValue({ success: true, value: mockWorkers });

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).toBeNull();
    });

    const deleteButton = screen.getByTestId("delete-button-worker-1");
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith("作業員「田中 太郎」を本当に削除しますか？");
    expect(deleteWorkerUseCase).not.toHaveBeenCalled();
  });

  it("TST-007-005: 削除確定時に作業員データが削除され一覧が更新されること", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({ success: true, value: mockUser });
    // 初回ロード時は2名、削除完了後の再取得ロード時は1名
    vi.mocked(getWorkersUseCase)
      .mockResolvedValueOnce({ success: true, value: mockWorkers })
      .mockResolvedValueOnce({ success: true, value: [mockWorkers[1]] });

    vi.mocked(deleteWorkerUseCase).mockResolvedValue({ success: true, value: { success: true } });

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<WorkerListPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).toBeNull();
    });

    const deleteButton = screen.getByTestId("delete-button-worker-1");
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith("作業員「田中 太郎」を本当に削除しますか？");
    
    await waitFor(() => {
      expect(deleteWorkerUseCase).toHaveBeenCalledWith("worker-1", "user-1");
    });

    // 削除成功メッセージ表示確認
    await waitFor(() => {
      expect(screen.getByTestId("toast-message")).toHaveTextContent("作業員を削除しました");
    });

    // 削除された田中太郎が表示されておらず、鈴木次郎のみが残る
    expect(screen.queryByTestId("worker-name-worker-1")).toBeNull();
    expect(screen.getByTestId("worker-name-worker-2")).toHaveTextContent("鈴木 次郎");
  });

  it("TST-007-006: 未ログイン状態でアクセスした場合、ログイン画面へリダイレクトされること", async () => {
    render(<WorkerListPage />);

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});