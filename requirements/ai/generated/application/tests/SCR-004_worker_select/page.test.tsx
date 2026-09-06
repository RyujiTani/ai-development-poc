import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import "fake-indexeddb/auto";
import { getDB } from "@/lib/db";
import { useAttendanceStore } from "@/features/attendance/store/useAttendanceStore";
import WorkerSelectPage from "@/app/(contractor)/worker-select/page";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("SCR-004_worker_select - 作業員選択画面", () => {
  beforeAll(async () => {
    // テスト用のマスタデータをIndexedDBに用意する
    const db = await getDB();
    
    // workersを一旦クリアして投入
    const tx = db.transaction(["workers"], "readwrite");
    await tx.objectStore("workers").clear();
    
    await tx.objectStore("workers").put({
      worker_id: "worker-a",
      contractor_id: "test-contractor-id",
      name: "作業員 A",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await tx.objectStore("workers").put({
      worker_id: "worker-b",
      contractor_id: "test-contractor-id",
      name: "作業員 B",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await tx.objectStore("workers").put({
      worker_id: "worker-c",
      contractor_id: "other-contractor-id", // 他社の作業員
      name: "作業員 C (他社)",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await tx.done;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // モックセッションの設定（自社管理者）
    const session: Record<string, string> = {
      user_id: "user-1",
      role: "CONTRACTOR_MANAGER",
      contractor_id: "test-contractor-id",
    };

    global.sessionStorage = {
      getItem: (key: string) => session[key] || null,
      setItem: (key: string, value: string) => { session[key] = value; },
      removeItem: (key: string) => { delete session[key]; },
      clear: () => {},
      length: Object.keys(session).length,
      key: (index: number) => Object.keys(session)[index] || null,
    };

    // ストアの初期化
    useAttendanceStore.setState({
      punchMode: "CLOCK_IN",
      selectedWorkerIds: [],
    });
  });

  it("TST-SCR-004-001: 自社に紐づく作業員のみが表示されること", async () => {
    render(<WorkerSelectPage />);

    // 読み込み完了まで待機
    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    // 自社の作業員が表示されていること
    expect(screen.getByText("作業員 A")).toBeInTheDocument();
    expect(screen.getByText("作業員 B")).toBeInTheDocument();

    // 他社の作業員が表示されていないこと
    expect(screen.queryByText("作業員 C (他社)")).not.toBeInTheDocument();
  });

  it("TST-SCR-004-002: 個別選択、一括選択、全解除のトグル動作検証", async () => {
    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    const checkboxA = screen.getByTestId("worker-checkbox-worker-a") as HTMLInputElement;
    const checkboxB = screen.getByTestId("worker-checkbox-worker-b") as HTMLInputElement;
    const selectAllCheckbox = screen.getByTestId("select-all-checkbox") as HTMLInputElement;

    // 初期状態は未選択
    expect(checkboxA.checked).toBe(false);
    expect(checkboxB.checked).toBe(false);

    // 作業員Aをクリック
    fireEvent.click(screen.getByText("作業員 A"));
    expect(checkboxA.checked).toBe(true);
    expect(checkboxB.checked).toBe(false);

    // 全選択チェックボックスをクリック
    fireEvent.click(selectAllCheckbox);
    expect(checkboxA.checked).toBe(true);
    expect(checkboxB.checked).toBe(true);

    // 再度全選択チェックボックスをクリックで全解除
    fireEvent.click(selectAllCheckbox);
    expect(checkboxA.checked).toBe(false);
    expect(checkboxB.checked).toBe(false);
  });

  it("TST-SCR-004-003: 打刻モード（出勤/退勤）が正しく画面に明示されること", async () => {
    // 出勤の場合
    useAttendanceStore.setState({ punchMode: "CLOCK_IN" });
    const { rerender } = render(<WorkerSelectPage />);
    await waitFor(() => {
      expect(screen.getByText("出勤")).toBeInTheDocument();
    });

    // 退勤の場合
    useAttendanceStore.setState({ punchMode: "CLOCK_OUT" });
    rerender(<WorkerSelectPage />);
    await waitFor(() => {
      expect(screen.getByText("退勤")).toBeInTheDocument();
    });
  });

  it("TST-SCR-004-004: 1名も選択していない場合にエラーが表示され遷移しないこと", async () => {
    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    const nextBtn = screen.getByTestId("next-btn");
    fireEvent.click(nextBtn);

    // エラーメッセージが表示されていること
    expect(screen.getByTestId("error-message")).toHaveTextContent(
      "作業員を1名以上選択してください"
    );
    // 遷移が発生していないこと
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("TST-SCR-004-005: 未ログイン時にログイン画面にリダイレクトされること", async () => {
    // セッションをクリア
    global.sessionStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    };

    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("TST-SCR-004-006: 1名以上選択して「次へ」を押した時にZustandに状態を保持して撮影画面に遷移すること", async () => {
    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    // 作業員Aを選択
    fireEvent.click(screen.getByText("作業員 A"));

    const nextBtn = screen.getByTestId("next-btn");
    fireEvent.click(nextBtn);

    // Zustandストアに作業員IDが保存されていること
    expect(useAttendanceStore.getState().selectedWorkerIds).toEqual(["worker-a"]);
    // 撮影・送信画面（/attendance/capture）へ遷移すること
    expect(pushMock).toHaveBeenCalledWith("/attendance/capture");
  });

  it("TST-SCR-004-007: 「戻る」ボタン押下時に打刻モード選択画面へ遷移すること", async () => {
    render(<WorkerSelectPage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    const backBtn = screen.getByLabelText("戻る");
    fireEvent.click(backBtn);

    // 打刻モード画面へ遷移すること
    expect(pushMock).toHaveBeenCalledWith("/punch-mode");
  });
});