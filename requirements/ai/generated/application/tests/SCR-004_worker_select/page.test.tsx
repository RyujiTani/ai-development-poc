import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import WorkerSelectPage from "@/app/(contractor)/worker-select/page";
import { getUserMeUseCase } from "@/features/user/usecase/getUserMeUseCase";
import { getWorkersUseCase } from "@/features/worker/usecase/getWorkersUseCase";
import { useAttendanceStore } from "@/features/attendance/store/attendanceStore";

// next/navigation モック
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Usecase モック
vi.mock("@/features/user/usecase/getUserMeUseCase", () => ({
  getUserMeUseCase: vi.fn(),
}));

vi.mock("@/features/worker/usecase/getWorkersUseCase", () => ({
  getWorkersUseCase: vi.fn(),
}));

describe("WorkerSelectPage (SCR-004_worker_select)", () => {
  const mockUser = {
    userId: "user-1",
    contractorId: "contractor-1",
    role: "CONTRACTOR_MANAGER",
    displayName: "外注先管理者 A",
    status: "ACTIVE",
  };

  const mockWorkers = [
    {
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      name: "田中 太郎",
      status: "ACTIVE",
      qualifications: ["QUAL_001"],
      trainings: [],
      created_at: "",
      updated_at: "",
    },
    {
      worker_id: "worker-2",
      contractor_id: "contractor-1",
      name: "鈴木 次郎",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: "",
      updated_at: "",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useAttendanceStore.getState().clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("未ログイン状態のアクセス時、/loginにリダイレクトされること (TST-SCR-004-VL-002)", async () => {
    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("正しい権限でログインしている場合、作業員一覧が正しく表示されること (TST-SCR-004-FN-001)", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: mockUser as any,
    });
    vi.mocked(getWorkersUseCase).mockResolvedValue({
      success: true,
      value: mockWorkers as any,
    });

    useAttendanceStore.getState().setPunchType("CLOCK_IN");

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    // ユーザー名表示
    expect(screen.getByTestId("user-display-name")).toHaveTextContent("外注先管理者 A 様");
    
    // 作業員が一覧に表示される
    expect(screen.getByText("田中 太郎")).toBeInTheDocument();
    expect(screen.getByText("鈴木 次郎")).toBeInTheDocument();
    
    // バッジ (TST-SCR-004-UI-003)
    expect(screen.getByTestId("punch-mode-badge")).toHaveTextContent("出勤");
  });

  it("個別チェックボックスをクリックして選択・選択解除ができること (TST-SCR-004-FN-002)", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: mockUser as any,
    });
    vi.mocked(getWorkersUseCase).mockResolvedValue({
      success: true,
      value: mockWorkers as any,
    });

    useAttendanceStore.getState().setPunchType("CLOCK_IN");

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const row1 = screen.getByTestId("worker-row-worker-1");
    const checkbox1 = screen.getByTestId("worker-checkbox-worker-1") as HTMLInputElement;

    expect(checkbox1.checked).toBe(false);

    // クリックしてONにする
    fireEvent.click(row1);
    expect(checkbox1.checked).toBe(true);
    expect(useAttendanceStore.getState().selectedWorkerIds).toContain("worker-1");

    // 再度クリックしてOFFにする
    fireEvent.click(row1);
    expect(checkbox1.checked).toBe(false);
    expect(useAttendanceStore.getState().selectedWorkerIds).not.toContain("worker-1");
  });

  it("すべて選択チェックボックスで一括選択・一括解除ができること (TST-SCR-004-FN-003)", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: mockUser as any,
    });
    vi.mocked(getWorkersUseCase).mockResolvedValue({
      success: true,
      value: mockWorkers as any,
    });

    useAttendanceStore.getState().setPunchType("CLOCK_IN");

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getByTestId("select-all-checkbox") as HTMLInputElement;
    const checkbox1 = screen.getByTestId("worker-checkbox-worker-1") as HTMLInputElement;
    const checkbox2 = screen.getByTestId("worker-checkbox-worker-2") as HTMLInputElement;

    expect(selectAllCheckbox.checked).toBe(false);

    // ON
    fireEvent.click(selectAllCheckbox);
    expect(checkbox1.checked).toBe(true);
    expect(checkbox2.checked).toBe(true);
    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual(["worker-1", "worker-2"]);

    // OFF
    fireEvent.click(selectAllCheckbox);
    expect(checkbox1.checked).toBe(false);
    expect(checkbox2.checked).toBe(false);
    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual([]);
  });

  it("作業員未選択で「次へ」を押した時、バリデーションエラーメッセージが表示されること (TST-SCR-004-VL-001)", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: mockUser as any,
    });
    vi.mocked(getWorkersUseCase).mockResolvedValue({
      success: true,
      value: mockWorkers as any,
    });

    useAttendanceStore.getState().setPunchType("CLOCK_IN");

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId("submit-button");
    fireEvent.click(submitBtn);

    // バリデーションエラーメッセージ
    expect(screen.getByTestId("validation-error")).toHaveTextContent("打刻対象の作業員を1名以上選択してください");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("作業員選択状態で「次へ」を押した時、/capture-submitに遷移すること (TST-SCR-004-EV-001)", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: mockUser as any,
    });
    vi.mocked(getWorkersUseCase).mockResolvedValue({
      success: true,
      value: mockWorkers as any,
    });

    useAttendanceStore.getState().setPunchType("CLOCK_IN");

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const row1 = screen.getByTestId("worker-row-worker-1");
    fireEvent.click(row1);

    const submitBtn = screen.getByTestId("submit-button");
    fireEvent.click(submitBtn);

    expect(mockPush).toHaveBeenCalledWith("/capture-submit");
  });

  it("「戻る」ボタン押下時、/punch-modeに遷移すること (TST-SCR-004-EV-002)", async () => {
    sessionStorage.setItem("user_id", "user-1");
    sessionStorage.setItem("role", "CONTRACTOR_MANAGER");

    vi.mocked(getUserMeUseCase).mockResolvedValue({
      success: true,
      value: mockUser as any,
    });
    vi.mocked(getWorkersUseCase).mockResolvedValue({
      success: true,
      value: mockWorkers as any,
    });

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const backBtn = screen.getByTestId("back-button");
    fireEvent.click(backBtn);

    expect(mockPush).toHaveBeenCalledWith("/punch-mode");
  });
});