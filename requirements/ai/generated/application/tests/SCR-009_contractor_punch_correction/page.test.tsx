import "fake-indexeddb/auto";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import PunchCorrectionPage from "@/app/(contractor)/punch-correction/page";
import { getDB } from "@/lib/db";

// router モック設定
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => null,
  }),
}));

describe("SCR-009 外注先打刻修正画面 テスト", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // モックセッションストレージ初期化
    const sessionStore: Record<string, string> = {
      user_id: "user-1",
      role: "CONTRACTOR_MANAGER",
      contractor_id: "contractor-1",
    };
    
    global.sessionStorage = {
      getItem: (key: string) => sessionStore[key] || null,
      setItem: (key: string, value: string) => { sessionStore[key] = value; },
      removeItem: (key: string) => { delete sessionStore[key]; },
      clear: () => {},
      length: Object.keys(sessionStore).length,
      key: (index: number) => Object.keys(sessionStore)[index],
    };

    // DBをクリアして初期シードデータを入れる
    const db = await getDB();
    const tx = db.transaction(["workers", "attendance_records", "attendance_corrections"], "readwrite");
    await tx.objectStore("workers").clear();
    await tx.objectStore("attendance_records").clear();
    await tx.objectStore("attendance_corrections").clear();

    await tx.objectStore("workers").put({
      worker_id: "worker-1",
      contractor_id: "contractor-1",
      name: "作業員 A",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await tx.objectStore("workers").put({
      worker_id: "worker-2",
      contractor_id: "contractor-2", // 他社作業員
      name: "他社作業員 X",
      status: "ACTIVE",
      qualifications: [],
      trainings: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await tx.done;
  });

  it("自社のACTIVEな作業員のみがセレクトボックスに表示されること（SCR-009-ST-001, SCR-009-DT-001）", async () => {
    render(<PunchCorrectionPage />);
    
    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    const select = screen.getByTestId("worker-select") as HTMLSelectElement;
    const options = Array.from(select.options).map((opt) => opt.text);

    expect(options).toContain("作業員 A");
    expect(options).not.toContain("他社作業員 X");
  });

  it("作業員を未選択の状態で送信するとエラーが表示されること（SCR-009-VL-001, SCR-009-UT-001）", async () => {
    render(<PunchCorrectionPage />);
    
    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    // 他の項目を埋める
    fireEvent.change(screen.getByTestId("punched-at-date"), { target: { value: "2026-04-13" } });
    fireEvent.change(screen.getByTestId("punched-at-time"), { target: { value: "08:00" } });
    fireEvent.change(screen.getByTestId("reason-textarea"), { target: { value: "打刻漏れのため登録" } });

    // 送信
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("error-worker-id")).toHaveTextContent("作業員を選択してください");
    });
  });

  it("修正理由が未入力の場合に送信するとエラーが表示されること（SCR-009-VL-004, SCR-009-UT-004）", async () => {
    render(<PunchCorrectionPage />);
    
    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    // 他の項目を埋める
    fireEvent.change(screen.getByTestId("worker-select"), { target: { value: "worker-1" } });
    fireEvent.change(screen.getByTestId("punched-at-date"), { target: { value: "2026-04-13" } });
    fireEvent.change(screen.getByTestId("punched-at-time"), { target: { value: "08:00" } });

    // 送信
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("error-reason")).toHaveTextContent("修正理由を入力してください");
    });
  });

  it("すべてのバリデーションを通過して正常に送信されるとIndexedDBに登録され/homeへ遷移すること（SCR-009-EV-001, SCR-009-IT-001）", async () => {
    render(<PunchCorrectionPage />);
    
    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("worker-select"), { target: { value: "worker-1" } });
    fireEvent.click(screen.getByTestId("punch-type-in"));
    fireEvent.change(screen.getByTestId("punched-at-date"), { target: { value: "2026-04-13" } });
    fireEvent.change(screen.getByTestId("punched-at-time"), { target: { value: "09:15" } });
    fireEvent.change(screen.getByTestId("reason-textarea"), { target: { value: "打刻忘れにより手動登録" } });

    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("toast-message")).toHaveTextContent("打刻修正を登録しました");
    });

    // IndexedDBの検証
    const db = await getDB();
    const recordsTx = db.transaction("attendance_records", "readonly");
    const records = await recordsTx.objectStore("attendance_records").getAll();
    await recordsTx.done;

    expect(records.length).toBe(1);
    expect(records[0].worker_id).toBe("worker-1");
    expect(records[0].punch_type).toBe("CLOCK_IN");
    expect(records[0].clocked_at).toBe(new Date("2026-04-13T09:15").toISOString());

    const correctionsTx = db.transaction("attendance_corrections", "readonly");
    const corrections = await correctionsTx.objectStore("attendance_corrections").getAll();
    await correctionsTx.done;

    expect(corrections.length).toBe(1);
    expect(corrections[0].reason).toBe("打刻忘れにより手動登録");

    // 遷移先の検証
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/home");
    });
  });

  it("キャンセルボタン押下時はデータ登録を行わず/homeへ戻ること（SCR-009-EV-002, SCR-009-IT-002）", async () => {
    render(<PunchCorrectionPage />);
    
    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("cancel-btn"));

    // DBへの登録がないことを確認
    const db = await getDB();
    const tx = db.transaction("attendance_records", "readonly");
    const records = await tx.objectStore("attendance_records").getAll();
    await tx.done;
    expect(records.length).toBe(0);

    expect(pushMock).toHaveBeenCalledWith("/home");
  });
});